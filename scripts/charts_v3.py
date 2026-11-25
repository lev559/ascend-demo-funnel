"""Charts for the analytics memos and the case page (static PNG, light surface).
Palette: categorical slots 1-3 of the reference data-viz palette (validated for colour-blind separation)."""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
R = json.load(open(os.path.join(ROOT, "analytics", "reports", "results.json")))
OUT = os.path.join(ROOT, "analytics", "reports", "img"); os.makedirs(OUT, exist_ok=True)
S1, S2, S3, MUTED, INK, GRID = "#257de0", "#f47230", "#00b894", "#666666", "#191919", "#e6e6e6"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "axes.edgecolor": GRID, "axes.labelcolor": MUTED, "xtick.color": MUTED,
                     "ytick.color": MUTED, "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.color": GRID,
                     "grid.linewidth": .8, "axes.axisbelow": True, "text.parse_math": False, "figure.facecolor": "white", "axes.facecolor": "white"})


def title(ax, t, sub=None):
    ax.set_title(t, loc="left", fontsize=14, fontweight="bold", color=INK, pad=22 if sub else 10)
    if sub: ax.text(0, 1.02, sub, transform=ax.transAxes, fontsize=10.5, color=MUTED)


# 1. LTV curve vs CAC by channel
c = R["ltv_curve"]; ue = R["unit_economics"]
fig, ax = plt.subplots(figsize=(9, 5))
for ch, col in [("meta", S1), ("tiktok", S2), ("google", S3)]:
    pb = ue[ch]["payback_days"]
    ax.plot(c["days"], c[ch], color=col, lw=2, drawstyle="steps-post",
            label=f"{ {'meta': 'Meta', 'tiktok': 'TikTok', 'google': 'Google'}[ch] }: LTV120 ${c[ch][-1]:.0f}, CAC ${ue[ch]['cac']:.0f}, payback " + (f"~{pb} days" if pb else "beyond 120 days"))
    ax.axhline(ue[ch]["cac"], color=col, lw=1.2, ls=(0, (4, 3)))
ax.set_xlim(0, 120); ax.set_ylim(0, 75); ax.set_xlabel("Days since subscription start"); ax.set_ylabel("Net revenue per subscriber, USD")
title(ax, "Cumulative LTV by channel vs CAC", "Cohorts with 120+ days of history. Solid = LTV, dashed = CAC. Simulated data.")
ax.legend(loc="upper left", frameon=False, fontsize=10); fig.tight_layout(); fig.savefig(os.path.join(OUT, "ltv_payback.png"), dpi=200); plt.close(fig)

# 2. Experiments: primary metric lift with 95% CI
E = R["experiments"]
names = {"entry-mode": "Entry: tap vs write", "quiz-length": "Quiz: long vs short", "chat-length": "Chat: 4 vs 2 turns",
         "paywall-model": "Paywall: annual trial vs weekly", "upsell-offer": "Upsell: bundle vs single"}
fig, axes = plt.subplots(1, 2, figsize=(11, 4.4), sharey=True)
ys = list(range(len(E)))[::-1]
for ax, (kind, lab) in zip(axes, [("primary", "Primary: revenue per user (D30)"), ("secondary", "Leading indicator")]):
    for y, (k, v) in zip(ys, E.items()):
        if kind == "primary": l, (lo, hi), p = v["lift"], v["ci95"], v["p"]
        else:
            a, b = v["secondary_rates"]; l = v["secondary_lift"]; import math
            se = math.sqrt(a * (1 - a) / v["n"][0] + b * (1 - b) / v["n"][1]) / a; lo, hi, p = l - 1.96 * se, l + 1.96 * se, v["secondary_p"]
        col = S1 if p < .05 else MUTED
        ax.plot([lo * 100, hi * 100], [y, y], color=col, lw=2, solid_capstyle="round"); ax.plot(l * 100, y, "o", color=col, ms=8)
        ax.text(hi * 100 + 2, y, f"{l:+.0%}" + (" *" if p < .05 else ""), va="center", fontsize=10, color=INK)
    ax.axvline(0, color=INK, lw=1); ax.set_xlabel("Lift vs control, % (95% CI)"); ax.set_title(lab, loc="left", fontsize=11.5, color=INK)
axes[0].set_yticks(ys); axes[0].set_yticklabels([names[k] for k in E]); axes[1].set_xlim(-60, 60); axes[0].set_xlim(-100, 110)
fig.suptitle("Five sequential tests: revenue is underpowered, leading indicators are not", x=.01, ha="left", fontsize=14, fontweight="bold", color=INK)
fig.text(.01, .9, "* p < 0.05. Leading indicators: situation submitted, paywall reached, email given, subscribed, upsell bought. Simulated data.", fontsize=10, color=MUTED)
fig.subplots_adjust(left=.25, top=.8, wspace=.08); fig.savefig(os.path.join(OUT, "experiments.png"), dpi=200); plt.close(fig)

# 3. Retention: 4-week plans, activated vs not
s = R["retention"]["four_week_survival"]
fig, ax = plt.subplots(figsize=(8, 4.6)); xs = [2, 3, 4, 5, 6]
for key, col, lab in [("activated", S1, "Activated in 72 h"), ("not_activated", S2, "Not activated")]:
    pts = [(x, v) for x, v in zip(xs, s[key]["renewed_into_period_2_to_6"]) if v is not None]
    ax.plot([p[0] for p in pts], [p[1] * 100 for p in pts], color=col, lw=2, marker="o", ms=8)
    ax.text(pts[0][0] - .1, pts[0][1] * 100 + (4 if key == "activated" else -7), f"{lab}: {pts[0][1]:.0%}", ha="right" if False else "left", color=INK, fontsize=10)
ax.set_xticks(xs); ax.set_xticklabels([f"Period {x}" for x in xs]); ax.set_ylim(0, 100); ax.set_ylabel("% of 4-week subscribers still paying")
title(ax, "Activation lifts the first renewal: 73% vs 55%", "Activated = signed into the app within 24 h and did a coaching action within 72 h. Simulated data.")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "retention.png"), dpi=200); plt.close(fig)

# 4. North Star: weekly engaged subscribers
w = pd.Series(R["wes"]); w.index = pd.to_datetime(w.index); w = w.iloc[1:-1]
fig, ax = plt.subplots(figsize=(9, 4)); ax.plot(w.index, w.values, color=S1, lw=2)
ax.text(w.index[-1], w.values[-1] + 4, f"{w.values[-1]} this week", ha="right", color=INK, fontsize=10)
ax.set_ylabel("Subscribers with ≥1 coaching action"); ax.set_ylim(0, max(w.values) * 1.2)
title(ax, "North Star: weekly engaged subscribers", "Active or trialing, at least one coach session, plan step, check-in or review in the week. Simulated data.")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "north_star.png"), dpi=200); plt.close(fig)

# 5. Monitoring: AI fallback rate with the alert days
ev = pd.read_parquet(os.path.join(ROOT, "data", "v3", "events.parquet"), columns=["ts", "event", "mode", "platform"])
ai = ev[ev.event.isin(["coach_questions_generated", "coach_message_shown", "plan_generated"])].copy()
ai["day"] = ai.ts.dt.tz_localize(None).dt.floor("D"); rate = ai.groupby("day")["mode"].apply(lambda s: (s == "fallback").mean() * 100)
rate = rate[rate.index >= "2026-09-01"]
fig, ax = plt.subplots(figsize=(9, 4)); ax.plot(rate.index, rate.values, color=S1, lw=2)
for d in ["2026-10-06", "2026-10-07"]:
    ax.plot(pd.Timestamp(d), rate[pd.Timestamp(d)], "o", color="#ec4647", ms=9, zorder=3)
ax.annotate("Alert: model provider outage\nfallback 28% vs 4% baseline", (pd.Timestamp("2026-10-06"), rate[pd.Timestamp("2026-10-06")]),
            xytext=(25, -5), textcoords="offset points", fontsize=10, color=INK, va="center")
ax.axhline(10, color=MUTED, lw=1, ls=(0, (4, 3))); ax.text(rate.index[0], 11, "Guardrail 10%", color=MUTED, fontsize=9.5)
ax.set_ylabel("AI calls that fell back to a template, %"); ax.set_ylim(0, 35)
title(ax, "Monitoring caught the outage the same day", "Daily AI fallback rate, Sep–Nov. Red = days the anomaly rule fired. Simulated data.")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "alerts.png"), dpi=200); plt.close(fig)
print("charts ->", OUT)
