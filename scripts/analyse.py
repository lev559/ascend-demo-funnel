"""Read-out of the two experiments and the funnel from data/events.csv (SIMULATED). DuckDB SQL + charts."""
import json, math, os
import duckdb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

R = os.path.join(os.path.dirname(__file__), "..")
c = duckdb.connect()
c.execute(f"create view e as select * from read_csv_auto('{R}/data/events.csv', all_varchar=false)")
Q = lambda s: c.execute(s).df()
O = {}

# 1. funnel by step
funnel = Q("""
with s as (
  select 'Landing' st, 1 o, count(distinct distinct_id) n from e where event='landing_viewed' union all
  select 'Quiz started', 2, count(distinct distinct_id) from e where event='quiz_started' union all
  select 'Q' || step || ' ' || step_id, 2 + step, count(distinct distinct_id) from e where event='quiz_step_completed' group by step, step_id union all
  select 'Paywall', 11, count(distinct distinct_id) from e where event='paywall_viewed' union all
  select 'Checkout', 12, count(distinct distinct_id) from e where event='checkout_started' union all
  select 'Purchase', 13, count(distinct distinct_id) from e where event='purchase_completed' union all
  select 'Upsell bought', 14, count(distinct distinct_id) from e where event='upsell_purchased')
select st, n, n * 1.0 / first_value(n) over (order by o) of_landing, n * 1.0 / lag(n) over (order by o) of_prev from s order by o""")
O["funnel"] = funnel.to_dict("records")

# 2. by creative angle
ang = Q("""
select angle, count(distinct distinct_id) filter (where event='landing_viewed') visits,
       count(distinct distinct_id) filter (where event='quiz_started') * 1.0 / count(distinct distinct_id) filter (where event='landing_viewed') start_rate,
       count(distinct distinct_id) filter (where event='paywall_viewed') * 1.0 / count(distinct distinct_id) filter (where event='quiz_started') quiz_to_paywall,
       count(distinct distinct_id) filter (where event='purchase_completed') * 1.0 / count(distinct distinct_id) filter (where event='landing_viewed') visit_to_purchase,
       sum(revenue) filter (where event in ('purchase_completed','upsell_purchased')) / count(distinct distinct_id) filter (where event='landing_viewed') rev_per_visit
from e group by 1 order by rev_per_visit desc""")
O["angles"] = ang.to_dict("records")

# 3. test 1: paywall layout (unit = user who saw the paywall)
t1 = Q("""
with u as (select distinct_id, any_value(layout) arm from e where event='paywall_viewed' group by 1),
p as (select distinct_id, sum(revenue) rev, any_value(plan) plan from e where event='purchase_completed' group by 1)
select arm, count(*) n, avg((p.distinct_id is not null)::int) cr, avg(coalesce(rev,0)) rpu, var_samp(coalesce(rev,0)) v,
       avg(coalesce(rev,0)) filter (where p.distinct_id is not null) aov,
       avg((plan='1w')::int) filter (where p.distinct_id is not null) sh_1w, avg((plan='4w')::int) filter (where p.distinct_id is not null) sh_4w,
       avg((plan='12w')::int) filter (where p.distinct_id is not null) sh_12w
from u left join p using(distinct_id) group by 1 order by 1""").set_index("arm")
O["t1"] = t1.reset_index().to_dict("records")

# 4. test 2: upsell offer (unit = buyer who saw the upsell)
t2 = Q("""
with u as (select distinct_id, any_value(variant) arm from e where event='upsell_viewed' group by 1),
p as (select distinct_id, sum(revenue) rev from e where event='upsell_purchased' group by 1)
select arm, count(*) n, avg((p.distinct_id is not null)::int) take, avg(coalesce(rev,0)) rpb, var_samp(coalesce(rev,0)) v
from u left join p using(distinct_id) group by 1 order by 1""").set_index("arm")
O["t2"] = t2.reset_index().to_dict("records")


def prop_diff(a, b, col):
    d = a[col] - b[col]; se = math.sqrt(a[col] * (1 - a[col]) / a.n + b[col] * (1 - b[col]) / b.n)
    return dict(diff=d, rel=d / b[col], lo=d - 1.96 * se, hi=d + 1.96 * se, p=math.erfc(abs(d / se) / math.sqrt(2)))


def mean_diff(a, b, col):
    d = a[col] - b[col]; se = math.sqrt(a.v / a.n + b.v / b.n)
    return dict(diff=d, rel=d / b[col], lo=d - 1.96 * se, hi=d + 1.96 * se, p=math.erfc(abs(d / se) / math.sqrt(2)))


O["t1_cr"] = prop_diff(t1.loc["plan_preview"], t1.loc["control"], "cr")
O["t1_rpu"] = mean_diff(t1.loc["plan_preview"], t1.loc["control"], "rpu")
O["t2_take"] = prop_diff(t2.loc["bundle"], t2.loc["single"], "take")
O["t2_rpb"] = mean_diff(t2.loc["bundle"], t2.loc["single"], "rpb")
for k, t in (("t1_srm", t1), ("t2_srm", t2)):
    e_ = t.n.sum() / 2; O[k] = float(((t.n - e_) ** 2 / e_).sum())

# power: how many paywall viewers per arm to detect the observed relative lift on CR
p0 = t1.loc["control"].cr; p1 = t1.loc["plan_preview"].cr
pb = (p0 + p1) / 2
O["t1_needed_per_arm"] = math.ceil((1.96 * math.sqrt(2 * pb * (1 - pb)) + 0.8416 * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (p1 - p0) ** 2)
O["paywall_per_day"] = float(t1.n.sum() / 22)

# daily cumulative lift for test 1 (to show why we don't stop early)
daily = Q("""
with u as (select distinct_id, any_value(layout) arm, min(time::timestamp)::date d from e where event='paywall_viewed' group by 1),
p as (select distinct distinct_id from e where event='purchase_completed')
select d, arm, count(*) n, sum((p.distinct_id is not null)::int) b from u left join p using(distinct_id) group by all order by d""")
daily.to_csv(f"{R}/data/t1_daily.csv", index=False)

json.dump(O, open(f"{R}/data/results.json", "w"), indent=1, default=float)

# ---------- charts ----------
G, G2, GR, INK, MUTED, GRID, ACC = "#0f6b4f", "#7fbfa4", "#c9d3ce", "#1f2933", "#6b7280", "#e5e7eb", "#b45309"
plt.rcParams.update({"font.family": "DejaVu Sans", "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": GRID,
                     "xtick.color": MUTED, "ytick.color": MUTED, "text.parse_math": False})
os.makedirs(f"{R}/charts", exist_ok=True)


def save(fig, name, note):
    fig.text(.01, -.02, "SIMULATED DATA · " + note, color=MUTED, fontsize=8.5, va="top")
    fig.savefig(f"{R}/charts/{name}.png", dpi=200, bbox_inches="tight", facecolor="white"); plt.close(fig)


f = funnel.copy()
fig, ax = plt.subplots(figsize=(10, 5))
ax.barh(f.st[::-1], f.of_landing[::-1] * 100, color=[G if s in ("Paywall", "Purchase", "Upsell bought") else G2 for s in f.st[::-1]])
for y, (v, pv) in enumerate(zip(f.of_landing[::-1] * 100, f.of_prev[::-1])):
    ax.text(v + .6, y, f"{v:.1f}%" + (f"  ({pv:.0%} of previous)" if pv == pv else ""), va="center", fontsize=9, color=INK)
ax.set_xlim(0, 125); ax.set_xticks([])
fig.suptitle("Where visitors drop: email and paywall are the two big steps", x=.01, ha="left", fontweight="bold", fontsize=13)
save(fig, "a1_funnel", "22 days of Meta traffic to the demo funnel · % of landing visitors")

fig, axs = plt.subplots(1, 2, figsize=(10.5, 3.8))
names = ["Control", "Plan preview"]
v = [t1.loc["control"].cr * 100, t1.loc["plan_preview"].cr * 100]
axs[0].bar(names, v, color=[GR, G], width=.55)
for i, x in enumerate(v): axs[0].text(i, x + .15, f"{x:.2f}%", ha="center", fontweight="bold")
axs[0].set_title("Paywall viewers who bought", loc="left", fontsize=11); axs[0].set_yticks([])
v = [t1.loc["control"].rpu, t1.loc["plan_preview"].rpu]
axs[1].bar(names, v, color=[GR, G], width=.55)
for i, x in enumerate(v): axs[1].text(i, x + .03, f"${x:.2f}", ha="center", fontweight="bold")
axs[1].set_title("Revenue per paywall viewer", loc="left", fontsize=11); axs[1].set_yticks([])
fig.suptitle(f"Test 1: showing the personal plan above prices: {O['t1_cr']['rel']:+.0%} conversion (p={O['t1_cr']['p']:.3f})",
             x=.01, y=1.04, ha="left", fontweight="bold", fontsize=13)
save(fig, "a2_test_paywall", f"GrowthBook experiment 'paywall-layout', ~{int(t1.n.mean()):,} paywall viewers per arm")

fig, axs = plt.subplots(1, 2, figsize=(10.5, 3.8))
names = ["Workbook $9.99", "Bundle $14.99"]
v = [t2.loc["single"]["take"] * 100, t2.loc["bundle"]["take"] * 100]
axs[0].bar(names, v, color=[GR, G], width=.55)
for i, x in enumerate(v): axs[0].text(i, x + .3, f"{x:.1f}%", ha="center", fontweight="bold")
axs[0].set_title("Buyers who took the upsell", loc="left", fontsize=11); axs[0].set_yticks([])
v = [t2.loc["single"].rpb, t2.loc["bundle"].rpb]
axs[1].bar(names, v, color=[GR, G], width=.55)
for i, x in enumerate(v): axs[1].text(i, x + .03, f"${x:.2f}", ha="center", fontweight="bold")
axs[1].set_title("Upsell revenue per buyer", loc="left", fontsize=11); axs[1].set_yticks([])
fig.suptitle("Test 2: the bundle cuts take-up by a quarter; revenue per buyer is a tie", x=.01, y=1.04, ha="left", fontweight="bold", fontsize=13)
save(fig, "a3_test_upsell", f"GrowthBook experiment 'upsell-offer', ~{int(t2.n.mean()):,} buyers per arm")

import pandas as pd
dd = daily.pivot_table(index="d", columns="arm", values=["n", "b"], aggfunc="sum").cumsum()
cr_c, cr_v = dd["b"]["control"] / dd["n"]["control"], dd["b"]["plan_preview"] / dd["n"]["plan_preview"]
se = ((cr_c * (1 - cr_c) / dd["n"]["control"]) + (cr_v * (1 - cr_v) / dd["n"]["plan_preview"])) ** .5
rel, lo, hi = (cr_v - cr_c) / cr_c * 100, (cr_v - cr_c - 1.96 * se) / cr_c * 100, (cr_v - cr_c + 1.96 * se) / cr_c * 100
fig, ax = plt.subplots(figsize=(10, 3.8))
ax.fill_between(range(len(rel)), lo, hi, color=G2, alpha=.4); ax.plot(range(len(rel)), rel, color=G, lw=2.5)
ax.axhline(0, color=INK, lw=.8)
ax.set_xticks(range(0, len(rel), 3), [pd.Timestamp(x).strftime("%b %d") for x in dd.index[::3]]); ax.set_ylabel("Relative lift in conversion, %")
fig.suptitle("Test 1 day by day: early days swing wildly, so the length is fixed in advance", x=.01, ha="left", fontweight="bold", fontsize=13)
save(fig, "a4_test_daily", "cumulative lift with 95% interval")

a = ang.copy()
fig, ax = plt.subplots(figsize=(10, 3.4))
ax.barh(a.angle[::-1], a.rev_per_visit[::-1], color=G2)
for y, (r, s) in enumerate(zip(a.rev_per_visit[::-1], a.start_rate[::-1])): ax.text(r + .01, y, f"${r:.2f} per visit · {s:.0%} start the quiz", va="center", fontsize=9.5)
ax.set_xlim(0, a.rev_per_visit.max() * 1.6); ax.set_xticks([])
fig.suptitle("Creative angles: the first screen matched to the ad decides who starts", x=.01, ha="left", fontweight="bold", fontsize=13)
save(fig, "a5_angles", "?angle= adapts the first screen to the ad · revenue includes upsells")
print(json.dumps({k: O[k] for k in ("t1_cr", "t1_rpu", "t2_take", "t2_rpb", "t1_srm", "t2_srm", "t1_needed_per_arm", "paywall_per_day")}, indent=1, default=float))
print(t1.round(4).to_string()); print(t2.round(4).to_string()); print(funnel.round(3).to_string()); print(ang.round(3).to_string())
