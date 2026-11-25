"""Read-out of the five Duskwise experiments (funnel v2) from data/events.csv. SIMULATED DATA, not real users.

Unit = user (distinct_id). A user belongs to an experiment from their first $experiment_started for it.
quiz-length, entry-mode and chat-length are exposed on the landing page (every visitor); paywall-model on the paywall;
upsell-offer on /upsell (buyers only). Each test is read on the users it exposed.
Proportions: normal-approx 95% CI + two-proportion z-test. Revenue: bootstrap 95% CI + Welch t-test.
Revenue = purchase_completed + trial_converted + upsell_purchased (first charges only, no renewals).
Output: printed report, data/report.md, data/results.json.
"""
import json, math, os
import numpy as np
import pandas as pd

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
e = pd.read_csv(f"{R}/data/events.csv", low_memory=False, parse_dates=["time"])
if "sim_version" in e: e = e[e.sim_version.astype(str).isin(["2", "2.0"])]
END = e.time.max().normalize() + pd.Timedelta(days=1)
MATURE = END - pd.Timedelta(days=8)  # trial (7 days) has had time to end for anyone exposed before this
rng = np.random.default_rng(1)
lines, OUT = [], {}
say = lambda s="": lines.append(s)

first = lambda name: e[e.event == name].groupby("distinct_id").time.min()
U = pd.DataFrame({"landed": first("landing_viewed")})
for col, ev in [("quiz", "quiz_started"), ("write", "situation_written"), ("chat_done", "chat_completed"), ("quiz_done", "coach_matched"), ("email_seen", "email_viewed"),
                ("email", "email_submitted"), ("paywall", "paywall_viewed"), ("checkout", "checkout_started"),
                ("purchase", "purchase_completed"), ("upsell_seen", "upsell_viewed"), ("upsell", "upsell_purchased")]:
    U[col] = U.index.isin(first(ev).index)
rev = lambda names: e[e.event.isin(names)].groupby("distinct_id").revenue.sum().reindex(U.index, fill_value=0.0)
U["rev_now"] = rev(["purchase_completed"])              # what the paywall earned at purchase time (trials = $0)
U["rev_sub"] = rev(["purchase_completed", "trial_converted"])
U["rev_upsell"] = rev(["upsell_purchased"])
U["rev"] = U.rev_sub + U.rev_upsell
pur = e[e.event == "purchase_completed"].drop_duplicates("distinct_id").set_index("distinct_id")
U["trial"] = pur.trial.astype(str).eq("True").reindex(U.index, fill_value=False)
U["trial_paid"] = U.index.isin(first("trial_converted").index)

x = e[e.event == "$experiment_started"].sort_values("time").drop_duplicates(["distinct_id", "Experiment name"])


def prop(a, b):  # b vs a: diff, 95% CI, p
    pa, pb, na, nb = a.mean(), b.mean(), len(a), len(b)
    se = math.sqrt(pa * (1 - pa) / na + pb * (1 - pb) / nb)
    pp = (a.sum() + b.sum()) / (na + nb); se0 = math.sqrt(pp * (1 - pp) * (1 / na + 1 / nb))
    d = pb - pa
    return dict(a=pa, b=pb, diff=d, lift=d / pa if pa else float("nan"), lo=d - 1.96 * se, hi=d + 1.96 * se,
                p=math.erfc(abs(d / se0) / math.sqrt(2)) if se0 else 1.0, test="two-proportion z")


def mean(a, b, n_boot=2000):
    a, b = a.to_numpy(float), b.to_numpy(float)
    d = b.mean() - a.mean(); se = math.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
    boots = rng.choice(b, (n_boot, len(b))).mean(1) - rng.choice(a, (n_boot, len(a))).mean(1)
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return dict(a=a.mean(), b=b.mean(), diff=d, lift=d / a.mean() if a.mean() else float("nan"), lo=lo, hi=hi,
                p=math.erfc(abs(d / se) / math.sqrt(2)) if se else 1.0, test="Welch t (normal approx), bootstrap CI")


def ci_mean(s, n_boot=2000):
    v = s.to_numpy(float); m = rng.choice(v, (n_boot, len(v))).mean(1)
    return np.percentile(m, [2.5, 97.5])


def fmt(v, kind):
    return f"${v:,.3f}" if kind == "money" else f"{v * 100:.2f}%"


TESTS = {  # experiment: (steps to show, primary metric, kind, secondary metrics, note)
    "quiz-length": (["quiz", "quiz_done", "email", "paywall", "checkout", "purchase"], "rev", "money",
                    [("paywall", "prop"), ("checkout|paywall", "prop")], "revenue per visitor (all revenue incl. matured trial conversions and upsells)"),
    "paywall-model": (["checkout", "purchase"], "rev_sub", "money",
                      [("checkout", "prop"), ("purchase", "prop"), ("rev_now", "money")],
                      "subscription revenue per paywall viewer, cohort exposed before %s (trials matured)" % MATURE.date()),
    "entry-mode": (["quiz", "write", "quiz_done", "email", "paywall", "checkout", "purchase"], "rev", "money",
                   [("write|quiz", "prop"), ("checkout|paywall", "prop"), ("paywall", "prop")], "revenue per visitor"),
    "chat-length": (["quiz", "quiz_done", "chat_done", "email", "paywall", "checkout", "purchase"], "rev", "money",
                    [("chat_done|quiz_done", "prop"), ("email|email_seen", "prop"), ("checkout|paywall", "prop")], "revenue per visitor"),
    "upsell-offer": (["upsell"], "rev_upsell", "money", [("upsell", "prop")], "upsell revenue per upsell viewer"),
}
LABEL = {"quiz": "quiz start", "write": "situation submitted", "chat_done": "chat finished", "write|quiz": "situation | quiz start", "chat_done|quiz_done": "chat finished | coach matched", "quiz_done": "quiz complete", "email": "email", "paywall": "paywall view",
         "checkout": "checkout", "purchase": "purchase", "upsell": "upsell take", "rev": "rev/exposed user (all revenue)",
         "rev_sub": "sub rev/user", "rev_now": "rev at purchase", "rev_upsell": "upsell rev/viewer",
         "email|email_seen": "email | email screen", "checkout|paywall": "checkout | paywall view"}

say("> **SIMULATED DATA.** Generated by scripts/simulate_traffic.py from assumed rates (data/assumptions.json).")
say("> Not real users. Use it to show the method, not as evidence about the product.")
say()
say(f"# Duskwise experiment read-out (simulated)")
say(f"Window: {e.time.min():%Y-%m-%d} to {(END - pd.Timedelta(days=1)):%Y-%m-%d} · {len(U):,} visitors · "
    f"{len(e):,} events · {int(U.purchase.sum())} purchases ({int(U.trial.sum())} trials, {int(U.trial_paid.sum())} converted so far)")

for exp, (steps, primary, kind, secondary, note) in TESTS.items():
    g = x[x["Experiment name"] == exp].set_index("distinct_id")
    arms = [str(a) for a in dict.fromkeys(g.sort_values("Variant name").variation_value)]
    g = g.assign(variation_value=g.variation_value.astype(str))
    D = U.join(g[["variation_value", "time"]].rename(columns={"variation_value": "arm", "time": "exposed"}), how="inner")
    if exp == "paywall-model": Dp = D[D.exposed < MATURE]
    else: Dp = D
    A, B = arms
    n = D.arm.value_counts()
    chi = sum((n[k] - n.sum() / 2) ** 2 / (n.sum() / 2) for k in arms); srm = math.erfc(math.sqrt(chi / 2))
    say(); say(f"## {exp}: {A} vs {B}")
    say(f"Primary metric: {note}.  SRM check p={srm:.2f} ({n[A]:,} vs {n[B]:,} exposed)")
    say(); say("| metric | " + " | ".join(arms) + " |"); say("|---|" + "---|" * len(arms))
    say("| users exposed | " + " | ".join(f"{n[a]:,}" for a in arms) + " |")
    for s in steps:
        say(f"| {LABEL[s]} | " + " | ".join(fmt(D[D.arm == a][s].mean(), "prop") for a in arms) + " |")
    for a_ in ("rev", "rev_now") if exp != "upsell-offer" else ("rev_upsell",):
        cells = []
        for a in arms:
            s = D[D.arm == a][a_]; lo, hi = ci_mean(s); cells.append(f"${s.mean():.3f} [{lo:.3f}, {hi:.3f}]")
        say(f"| {LABEL[a_]} (95% CI) | " + " | ".join(cells) + " |")
    if exp == "paywall-model":
        say("| trial -> paid (matured) | " + " | ".join(
            (lambda t: f"{t.trial_paid.mean() * 100:.1f}% of {len(t)}" if len(t) else "n/a")(Dp[(Dp.arm == a) & Dp.trial])
            for a in arms) + " |")
    res = {}
    for m, k in [(primary, kind)] + secondary:
        cond = m.split("|")
        d = Dp if m == primary else D
        if len(cond) == 2: d = d[d[cond[1]]]
        r = (prop if k == "prop" else mean)(d[d.arm == A][cond[0]], d[d.arm == B][cond[0]])
        r["n"] = [int((d.arm == A).sum()), int((d.arm == B).sum())]
        res[m] = r
        tag = "PRIMARY " if m == primary else ""
        unit = "pp" if k == "prop" else "$"
        dd = (lambda v: f"{v * 100:+.2f}pp") if k == "prop" else (lambda v: f"{v:+.3f}$")
        say(f"- {tag}{LABEL.get(m, m)}{' (matured cohort)' if m == primary and exp == 'paywall-model' else ''}: "
            f"{fmt(r['a'], k)} -> {fmt(r['b'], k)}, diff {dd(r['diff'])} [{dd(r['lo'])}, {dd(r['hi'])}], "
            f"lift {r['lift'] * 100:+.1f}%, p={r['p']:.3f} ({r['test']}; n={r['n'][0]:,}/{r['n'][1]:,})")
    OUT[exp] = {"exposed": {a: int(n[a]) for a in arms}, "srm_p": srm, "metrics": res}

    if exp == "quiz-length":  # drop-off per question
        q = e[(e.event == "quiz_step_completed")].merge(D[["arm"]], left_on="distinct_id", right_index=True)
        started = D[D.quiz].arm.value_counts()
        say(); say("Quiz drop-off per screen (share of quiz starters still in, and loss at that screen):"); say()
        say("| step | short: question | short: still in | short: lost | long: question | long: still in | long: lost |")
        say("|---|---|---|---|---|---|---|")
        tab = {a: q[q.arm == a].groupby(["step", "step_id"]).distinct_id.nunique().reset_index() for a in arms}
        for a in arms:
            t = tab[a]; t["in"] = t.distinct_id / started[a]; t["lost"] = 1 - t["in"] / t["in"].shift(1, fill_value=1)
        for i in range(max(len(t) for t in tab.values())):
            row = [str(i + 1)]
            for a in arms:
                t = tab[a]
                row += [t.step_id[i], f"{t['in'][i] * 100:.1f}%", f"{t.lost[i] * 100:.1f}%"] if i < len(t) else ["", "", ""]
            say("| " + " | ".join(row) + " |")
        OUT[exp]["quiz_completion"] = {a: float(tab[a]["in"].iloc[-1]) for a in arms}

say(); say("## Caveats")
say("- Five tests ran at once on the same users; assignment is independent (hash per experiment), so effects are read marginally.")
say("- Weekly plans renew, annual trials convert later: first charges only are counted, which favours annual_trial. "
    "A fair paywall-model call needs renewal data (LTV), not just this window.")
say("- upsell-offer has only the buyers as its sample; it is underpowered at this traffic and should keep running.")

text = "\n".join(lines)
print(text.replace("**", ""))
open(f"{R}/data/report.md", "w").write(text + "\n")
json.dump(OUT, open(f"{R}/data/results.json", "w"), indent=1, default=float)
