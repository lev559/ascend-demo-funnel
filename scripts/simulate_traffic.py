"""SIMULATED traffic for the Ascend demo funnel. Not real users.

Generates the same events the live funnel sends (see lib/analytics.js) for 3 weeks of
Meta traffic, with two experiments running:
  paywall-layout : control vs plan_preview  (personalised 4-week roadmap above the prices)
  upsell-offer   : single ($9.99 workbook)  vs bundle ($14.99 Momentum Pack)
Every rate below is an assumption, listed in RATES so anyone can see what the
"true" effects are. Output: data/events.ndjson (Mixpanel /import format) + data/events.csv.
"""
import csv, json, os, random, uuid
from datetime import datetime, timedelta, timezone

random.seed(7)
OUT = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUT, exist_ok=True)

START = datetime(2026, 10, 27, tzinfo=timezone.utc)
DAYS = 22
VISITS_PER_DAY = (1200, 1700)

RATES = {
    "angle_mix": {"procrastination": .40, "career": .30, "confidence": .20, "default": .10},
    "start_quiz": {"procrastination": .62, "career": .57, "confidence": .50, "default": .45},
    # chance to complete each of the 8 quiz steps (step 8 = email)
    "step_continue": [.95, .94, .96, .95, .97, .96, .97, .80],
    "build_to_paywall": .96,
    "paywall_to_checkout": {"control": .120, "plan_preview": .136},
    "checkout_to_purchase": .70,
    "plan_mix": {"control": {"1w": .47, "4w": .38, "12w": .15}, "plan_preview": {"1w": .41, "4w": .43, "12w": .16}},
    "upsell_take": {"single": .19, "bundle": .145},
    "country_mix": {"US": .72, "GB": .10, "CA": .09, "AU": .09},
    "os_mix": {"iOS": .62, "Android": .38},
}
PRICES = {"1w": 6.99, "4w": 19.99, "12w": 39.99}
UPSELL = {"single": ("workbook", 9.99), "bundle": ("workbook_accountability", 14.99)}
STEP_IDS = ["goal", "blocker", "style", "time", "how", "horizon", "momentum", "email"]


def pick(d):
    r, acc = random.random(), 0
    for k, v in d.items():
        acc += v
        if r < acc: return k
    return k


events = []


def ev(name, uid, t, **props):
    events.append({"event": name, "properties": {"time": int(t.timestamp() * 1000), "distinct_id": uid,
                                                   "$insert_id": uuid.uuid4().hex[:32], "simulated": True, **props}})


for d in range(DAYS):
    day = START + timedelta(days=d)
    for _ in range(random.randint(*VISITS_PER_DAY)):
        uid = "sim-" + uuid.uuid4().hex[:16]
        angle = pick(RATES["angle_mix"])
        base = dict(angle=angle, utm_source="meta", utm_campaign=f"ascend_{angle}", country=pick(RATES["country_mix"]), os=pick(RATES["os_mix"]))
        t = day + timedelta(seconds=random.randint(0, 86399))
        ev("landing_viewed", uid, t, **base)
        if random.random() > RATES["start_quiz"][angle]: continue
        t += timedelta(seconds=random.randint(3, 20)); ev("quiz_started", uid, t, **base)
        ok = True
        for s, p in enumerate(RATES["step_continue"]):
            if random.random() > p: ok = False; break
            t += timedelta(seconds=random.randint(4, 25))
            if STEP_IDS[s] == "email": ev("email_submitted", uid, t, step=s + 1, **base)
            ev("quiz_step_completed", uid, t, step=s + 1, step_id=STEP_IDS[s], **base)
        if not ok or random.random() > RATES["build_to_paywall"]: continue
        layout = random.choice(["control", "plan_preview"])
        t += timedelta(seconds=random.randint(3, 6))
        ev("$experiment_started", uid, t, **{"Experiment name": "paywall-layout", "Variant name": ["control", "plan_preview"].index(layout), "variation_value": layout, "$source": "growthbook"}, **base)
        ev("paywall_viewed", uid, t, layout=layout, **base)
        if random.random() > RATES["paywall_to_checkout"][layout]: continue
        plan = pick(RATES["plan_mix"][layout])
        t += timedelta(seconds=random.randint(10, 120)); ev("checkout_started", uid, t, plan=plan, price=PRICES[plan], layout=layout, **base)
        if random.random() > RATES["checkout_to_purchase"]: continue
        t += timedelta(seconds=random.randint(30, 180)); ev("purchase_completed", uid, t, plan=plan, revenue=PRICES[plan], layout=layout, mode="simulated", **base)
        offer = random.choice(["single", "bundle"])
        oid, price = UPSELL[offer]
        t += timedelta(seconds=2)
        ev("$experiment_started", uid, t, **{"Experiment name": "upsell-offer", "Variant name": ["single", "bundle"].index(offer), "variation_value": offer, "$source": "growthbook"}, **base)
        ev("upsell_viewed", uid, t, offer=oid, variant=offer, **base)
        if random.random() < RATES["upsell_take"][offer]:
            t += timedelta(seconds=random.randint(20, 90)); ev("upsell_purchased", uid, t, offer=oid, revenue=price, variant=offer, mode="simulated", **base)
        else:
            t += timedelta(seconds=random.randint(5, 40)); ev("upsell_declined", uid, t, offer=oid, variant=offer, **base)
        ev("onboarding_reached", uid, t + timedelta(seconds=5), **base)

events.sort(key=lambda e: e["properties"]["time"])
with open(os.path.join(OUT, "events.ndjson"), "w") as f:
    for e in events: f.write(json.dumps(e) + "\n")
cols = ["event", "time", "distinct_id", "angle", "country", "os", "step", "step_id", "layout", "plan", "price", "revenue",
        "offer", "variant", "Experiment name", "variation_value"]
with open(os.path.join(OUT, "events.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(cols)
    for e in events:
        p = e["properties"]
        w.writerow([e["event"], datetime.fromtimestamp(p["time"] / 1000, timezone.utc).isoformat()] + [p.get(c, "") for c in cols[2:]])
json.dump(RATES, open(os.path.join(OUT, "assumptions.json"), "w"), indent=1)
print(len(events), "events")
