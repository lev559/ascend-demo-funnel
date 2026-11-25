"""Analysis of the v3 dataset, done the way an analytics team would do it on the warehouse copy of Mixpanel data.

  python3 scripts/analyse_v3.py      -> analytics/reports/results.json + numbers used in the memos

Sections: experiments (SRM, effect + 95% CI, regression adjustment, power, holdouts), unit economics
(LTV, CAC, payback, ROAS by channel), retention and churn drivers, North Star (WES), data quality.
Unit of randomisation and analysis = $device_id (the anonymous id the experiment was assigned on).
"""
import json, math, os
from datetime import datetime, timezone
import numpy as np
import pandas as pd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
D = os.path.join(ROOT, "data", "v3")
OUT = os.path.join(ROOT, "analytics", "reports"); os.makedirs(OUT, exist_ok=True)
A = json.load(open(os.path.join(D, "assumptions.json")))
END = pd.Timestamp(A["end"])
CACHE = os.path.join(D, "events.parquet")

# ---------- load ----------
if os.path.exists(CACHE) and os.path.getmtime(CACHE) > os.path.getmtime(os.path.join(D, "events.ndjson")):
    ev = pd.read_parquet(CACHE)
else:
    rows = []
    keep = ["time", "$device_id", "$user_id", "platform", "channel", "angle", "$os", "mp_country_code", "exp_entry_mode", "exp_quiz_length",
            "exp_chat_length", "exp_paywall_model", "exp_upsell_offer", "Experiment name", "variation_value", "assignment", "revenue", "amount",
            "plan", "mode", "reason", "period", "trial", "which", "how", "subscription_id", "paywall_model", "variant", "intro"]
    for line in open(os.path.join(D, "events.ndjson")):
        d = json.loads(line); p = d["properties"]
        r = {k: p.get(k) for k in keep}; r["event"] = d["event"]; rows.append(r)
    ev = pd.DataFrame(rows)
    ev["ts"] = pd.to_datetime(ev["time"], unit="s", utc=True)
    for c in ["revenue", "amount", "period"]: ev[c] = pd.to_numeric(ev[c])
    ev = ev.rename(columns={"$device_id": "device", "$user_id": "user", "$os": "os", "mp_country_code": "country"})
    for c in ev.columns:
        if ev[c].dtype == object and c not in ("revenue",): ev[c] = ev[c].astype("string")
    ev.to_parquet(CACHE)
ev["money"] = 0.0
ev.loc[ev.event.isin(["subscription_started", "trial_converted", "subscription_renewed", "upsell_purchased"]), "money"] = ev["revenue"]
ev.loc[ev.event == "refund_issued", "money"] = -ev["amount"]
print(f"{len(ev):,} events")

# ---------- visitor table ----------
land = ev[ev.event == "landing_viewed"].groupby("device").agg(t0=("ts", "min"), channel=("channel", "first"), angle=("angle", "first"),
                                                                os=("os", "first"), country=("country", "first"))
cnt = ev.pivot_table(index="device", columns="event", values="time", aggfunc="count", fill_value=0)
V = land.join(cnt, how="left").fillna(0)
mon = ev[ev.money != 0][["device", "ts", "money", "event"]].merge(land[["t0"]], left_on="device", right_index=True)
mon["age_d"] = (mon.ts - mon.t0).dt.total_seconds() / 86400
for h in [1, 30, 60, 90]:
    V[f"rev_d{h}"] = mon[mon.age_d < h].groupby("device").money.sum().reindex(V.index).fillna(0)
V["rev_all"] = mon.groupby("device").money.sum().reindex(V.index).fillna(0)
V["age_days"] = (END - V.t0).dt.total_seconds() / 86400
V["week"] = V.t0.dt.tz_localize(None).dt.to_period("W").astype(str)

res = {"dataset": {"visitors": int(len(V)), "events": int(len(ev)), "start": A["start"], "end": A["end"]}}


def welch(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = b.mean() - a.mean(); se = math.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
    z = d / se if se else 0; p = math.erfc(abs(z) / math.sqrt(2))
    return d, se, p


def ols_adjusted(df, y, treat_col):
    """Regression adjustment on pre-assignment covariates (channel, angle, os, country, week).
    Returns (effect, se) for the treatment dummy, heteroskedasticity-robust (HC1)."""
    X = pd.get_dummies(df[["channel", "angle", "os", "country", "week"]].astype(str), drop_first=True).astype(float)
    X.insert(0, "treat", df[treat_col].astype(float)); X.insert(0, "const", 1.0)
    Xv, yv = X.values, df[y].values.astype(float)
    XtX_inv = np.linalg.pinv(Xv.T @ Xv); beta = XtX_inv @ Xv.T @ yv; e = yv - Xv @ beta
    n, k = Xv.shape; meat = (Xv * e[:, None] ** 2).T @ Xv
    cov = XtX_inv @ meat @ XtX_inv * n / (n - k)
    return beta[1], math.sqrt(cov[1, 1])


def srm(n_a, n_b):
    exp = (n_a + n_b) / 2; chi = (n_a - exp) ** 2 / exp + (n_b - exp) ** 2 / exp
    return chi, math.erfc(math.sqrt(chi / 2))   # df = 1


def mde(sd, n_per_arm, base):
    return (1.96 + 0.8416) * sd * math.sqrt(2 / n_per_arm) / base if base else None


# ---------- experiments ----------
EXP = {x["key"]: x for x in A["experiments"]}
expo = ev[ev.event == "$experiment_started"][["device", "Experiment name", "variation_value", "assignment", "ts"]]
METRIC = {"entry-mode": ("rev_d30", "situation_written"), "quiz-length": ("rev_d30", "paywall_viewed"),
          "chat-length": ("rev_d30", "email_submitted"), "paywall-model": ("rev_d30", "subscription_started"), "upsell-offer": ("upsell_rev", "upsell_purchased")}
upsell_rev = ev[ev.event == "upsell_purchased"].groupby("device").revenue.sum()
V["upsell_rev"] = upsell_rev.reindex(V.index).fillna(0)
res["experiments"] = {}
for key, x in EXP.items():
    e = expo[(expo["Experiment name"] == key) & (expo.assignment == "test")].drop_duplicates("device")
    df = V.join(e.set_index("device")[["variation_value"]], how="inner")
    df["treat"] = (df.variation_value == x["variant"]).astype(int)
    prim, sec = METRIC[key]
    a, b = df[df.treat == 0], df[df.treat == 1]
    chi, p_srm = srm(len(a), len(b))
    d, se, p = welch(a[prim], b[prim]); base = a[prim].mean()
    adj, adj_se = ols_adjusted(df, prim, "treat")
    pa, pb = (a[sec] > 0).mean(), (b[sec] > 0).mean()
    dsec, sesec, psec = welch(a[sec] > 0, b[sec] > 0)
    out = {"control": x["control"], "variant": x["variant"], "window": f'{x["start"]} → {x["end"]}', "n": [len(a), len(b)],
           "srm_chi2": round(chi, 2), "srm_p": round(p_srm, 4), "primary": prim,
           "primary_means": [round(base, 4), round(b[prim].mean(), 4)], "lift": round(d / base, 4) if base else None,
           "ci95": [round((d - 1.96 * se) / base, 4), round((d + 1.96 * se) / base, 4)] if base else None, "p": round(p, 4),
           "adj_lift": round(adj / base, 4) if base else None, "adj_ci95": [round((adj - 1.96 * adj_se) / base, 4), round((adj + 1.96 * adj_se) / base, 4)] if base else None,
           "variance_reduction": round(1 - (adj_se / se) ** 2, 3) if se else None,
           "mde_at_this_n": round(mde(a[prim].std(), len(a), base), 4) if base else None,
           "secondary": sec, "secondary_rates": [round(pa, 4), round(pb, 4)], "secondary_lift": round((pb - pa) / pa, 4) if pa else None, "secondary_p": round(psec, 4),
           "shipped": x["ship"]}
    # holdout: after ship, 5% stayed on control for 60 days
    h = expo[(expo["Experiment name"] == key) & (expo.assignment == "holdout")].drop_duplicates("device")
    if len(h):
        t1 = pd.Timestamp(x["end"], tz="UTC")
        post = V[(V.t0 >= t1) & (V.t0 < t1 + pd.Timedelta(days=60))]
        # holdout users only get an exposure event; everyone else in the window got the shipped variant
        hold = post[post.index.isin(h.device)]; rest = post[~post.index.isin(h.device)]
        if key == "paywall-model":   # only people who reached the paywall were exposed
            rest = rest[rest.paywall_viewed > 0]; hold = hold[hold.paywall_viewed > 0]
        if key == "upsell-offer":
            rest = rest[rest.upsell_viewed > 0]; hold = hold[hold.upsell_viewed > 0]
        if len(hold) < 5: res["experiments"][key] = out; continue
        hd, hse, hp = welch(hold[prim], rest[prim]); hb = hold[prim].mean()
        out["holdout"] = {"n": [len(hold), len(rest)], "means": [round(hb, 4), round(rest[prim].mean(), 4)],
                          "lift": round(hd / hb, 4) if hb else None, "p": round(hp, 4)}
    res["experiments"][key] = out

# ---------- unit economics ----------
spend = pd.read_csv(os.path.join(D, "ad_spend.csv"), parse_dates=["date"])
spend["month"] = spend.date.dt.to_period("M").astype(str)
subs = ev[ev.event == "subscription_started"].drop_duplicates("device")[["device", "ts", "plan", "subscription_id"]].merge(land, left_on="device", right_index=True)
subs["month"] = subs.ts.dt.tz_localize(None).dt.to_period("M").astype(str)
subs = subs.set_index("device")
for hzn in [30, 60, 90, 120]:
    m = mon[mon.device.isin(subs.index)].merge(subs[["ts"]].rename(columns={"ts": "ts_sub"}), left_on="device", right_index=True)
    m["age"] = (m.ts - m.ts_sub).dt.total_seconds() / 86400
    subs[f"ltv{hzn}"] = m[m.age < hzn].groupby("device").money.sum().reindex(subs.index).fillna(0)
subs["mature"] = (END - subs.ts).dt.days
econ = {}
for ch in ["meta", "tiktok", "google", "organic"]:
    s = subs[subs.channel == ch]
    sp = spend[spend.channel == ch].spend_usd.sum()
    vis = int((V.channel == ch).sum())
    row = {"visitors": vis, "subscribers": len(s), "spend": round(sp), "cvr": round(len(s) / vis, 4) if vis else None,
           "cac": round(sp / len(s), 2) if len(s) and sp else None}
    for hzn in [30, 60, 90, 120]:
        mm = s[s.mature >= hzn]
        row[f"ltv{hzn}"] = round(mm[f"ltv{hzn}"].mean(), 2) if len(mm) > 20 else None
        row[f"n{hzn}"] = len(mm)
    # payback: first horizon at which LTV >= CAC, linear interpolation on 30/60/90/120
    pts = [(0, 0)] + [(hz, row[f"ltv{hz}"]) for hz in [30, 60, 90, 120] if row[f"ltv{hz}"] is not None]
    pb = None
    if row["cac"]:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if y1 >= row["cac"]: pb = round(x0 + (row["cac"] - y0) / (y1 - y0) * (x1 - x0)); break
    row["payback_days"] = pb if row["cac"] else 0
    row["roas_d30"] = round(row["ltv30"] * len(s) / sp, 2) if sp and row["ltv30"] else None
    econ[ch] = row
res["unit_economics"] = econ
# LTV curve by day (for charts): mean cumulative net revenue per subscriber, cohorts with ≥120 days of age
m = mon[mon.device.isin(subs.index)].merge(subs[["ts", "channel"]].rename(columns={"ts": "ts_sub"}), left_on="device", right_index=True)
m["age"] = ((m.ts - m.ts_sub).dt.total_seconds() / 86400).clip(lower=0)
curve = {}
for ch in ["meta", "tiktok", "google"]:
    base = subs[(subs.channel == ch) & (subs.mature >= 120)]
    mm = m[m.device.isin(base.index)]
    curve[ch] = [round(mm[mm.age < d].money.sum() / max(len(base), 1), 2) for d in range(0, 121, 5)]
res["ltv_curve"] = {"days": list(range(0, 121, 5)), **curve}
monthly = []
for mth, g in subs.groupby("month"):
    sp = spend[spend.month == mth].spend_usd.sum(); paid = g[g.channel != "organic"]
    monthly.append({"month": mth, "spend": round(sp), "subscribers": len(g), "blended_cac": round(sp / len(paid), 2) if len(paid) else None,
                    "ltv30": round(g[g.mature >= 30].ltv30.mean(), 2) if (g.mature >= 30).sum() > 20 else None})
res["monthly"] = monthly

# ---------- retention ----------
life = ev[ev.subscription_id.notna()]
starts = ev[ev.event == "subscription_started"].drop_duplicates("subscription_id").set_index("subscription_id")
ended = life[life.event == "subscription_ended"].drop_duplicates("subscription_id").set_index("subscription_id").ts
starts["ended"] = ended.reindex(starts.index)
app = ev[ev.platform.isin(["ios", "android"])]
first_action = app[app.event.isin(["coach_session_started", "plan_step_completed", "checkin_answered", "weekly_review_completed"])].groupby("device").ts.min()
login = app[app.event == "app_login"].groupby("device").ts.min()
starts["activated"] = [bool(pd.notna(login.get(d)) and pd.notna(first_action.get(d)) and (first_action.get(d) - t).total_seconds() < 72 * 3600)
                       for d, t in zip(starts.device, starts.ts)]
reasons = ev[ev.event == "subscription_cancelled"]["reason"].value_counts(normalize=True).round(3).to_dict()
w4 = starts[starts.plan.isin(["4w", "4w_back"])]
ren = ev[ev.event == "subscription_renewed"].groupby("subscription_id").period.max()
w4 = w4.assign(max_period=ren.reindex(w4.index).fillna(1))
surv = {}
for act, g in w4.groupby("activated"):
    pts = []
    for k in range(1, 6):
        elig = g[(END - g.ts).dt.days >= 28 * k + 3]
        pts.append(round((elig.max_period >= k + 1).mean(), 3) if len(elig) > 20 else None)
    surv["activated" if act else "not_activated"] = {"n": int(len(g)), "renewed_into_period_2_to_6": pts}
by = {}
dev_info = land.join(V[[]], how="left")
for dim in ["channel", "plan"]:
    tab = {}
    for k, g in starts.drop(columns=["channel"], errors="ignore").merge(land[["channel"]], left_on="device", right_index=True).groupby(dim):
        elig = g[(END - g.ts).dt.days >= 35]
        tab[k] = {"n": int(len(elig)), "still_paying_d35": round(elig.ended.isna().mean() if len(elig) else 0, 3)}
    by[dim] = tab
res["retention"] = {"cancel_reasons": reasons, "four_week_survival": surv, "by": by,
                    "activation_rate": round(starts.activated.mean(), 3)}

# ---------- North Star: weekly engaged subscribers ----------
acts = app[app.event.isin(["coach_session_started", "plan_step_completed", "checkin_answered", "weekly_review_completed"])].copy()
acts["wk"] = acts.ts.dt.tz_localize(None).dt.to_period("W").dt.start_time
wes = acts.groupby("wk").device.nunique()
res["wes"] = {str(k.date()): int(v) for k, v in wes.items()}

# ---------- data quality ----------
mig = ev[(ev.ts < pd.Timestamp("2026-07-15", tz="UTC"))]
srv = mig[mig.event == "subscription_started"]; cli = mig[mig.event == "purchase_completed"]
srv_dev = set(srv.device); cli_dev = cli.device.value_counts()
res["data_quality"] = {
    "migration_window": "2026-06-01 → 2026-07-15",
    "server_purchases": int(len(srv)), "client_purchase_events": int(len(cli)),
    "server_purchases_missing_on_client": round(1 - len(srv_dev & set(cli_dev.index)) / len(srv_dev), 3),
    "client_duplicates": int((cli_dev > 1).sum()),
    "client_revenue": round(cli.revenue.sum(), 2), "server_revenue": round(srv.revenue.sum(), 2),
    "incidents": A.get("incidents", []),
}
json.dump(res, open(os.path.join(OUT, "results.json"), "w"), indent=1, default=str)
for k, v in res["experiments"].items(): print(k, {kk: v[kk] for kk in ["n", "srm_p", "lift", "ci95", "p", "adj_lift", "variance_reduction", "mde_at_this_n", "secondary_lift", "secondary_p"]}, v.get("holdout"))
print(json.dumps(res["unit_economics"], indent=0)[:1500]); print(res["retention"]); print(res["data_quality"])
