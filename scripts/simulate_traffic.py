"""SIMULATED traffic for the Quietly funnel. Not real users.

Emits the same events and properties the live app sends (app/page.jsx, app/upsell, app/done, app/providers.jsx)
for 3 weeks of paid-social traffic with five experiments running at once, each a 50/50 split by user id:
  quiz-length   short | long        general questions (4 vs 7 before the situation questions) + 3 vs 5 AI questions
  entry-mode    write | tap         free text first vs tap a typical situation first
  chat-length   2 | 4               coach turns in the chat
  paywall-model weekly | annual_trial
  upsell-offer  single | bundle
Every assumed rate is in RATES below: these are the "true" effects the analysis should recover.
Every event carries simulated=True and a dataset marker (sim_version) so it can never be mixed with live data.
Output: data/events.ndjson (Mixpanel /import format), data/events.csv, data/assumptions.json.
"""
import csv, hashlib, json, os, random, uuid
from datetime import datetime, timedelta, timezone

SEED = 2027
random.seed(SEED)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data"); os.makedirs(OUT, exist_ok=True)
START = datetime(2026, 11, 2, 8, tzinfo=timezone.utc)
DAYS = 21
VISITS = (1200, 1700)

RATES = {
    "angle_mix": {"overload": .26, "sunday": .12, "start": .18, "lost": .16, "private": .12, "voice": .08, "default": .08},
    "start_quiz": .58,                     # landing -> taps a reason card
    "preselected_bonus": .05,              # +5pp when the ad angle preselects the reason card
    "write_done": {"write": .74, "tap": .86},   # reason -> situation submitted
    "tap_how": {"tap": .78, "typed": .22},      # in the tap arm, share who still write their own
    "write_how": {"typed": .63, "example": .37},
    "gen_q_continue": .975,                # per general question
    "ai_q_continue": .985,                 # per AI-written question (higher: about their own situation)
    "breather_continue": .97,
    "name_continue": .95,
    "voice_continue": .97,
    "match_to_chat": .93,
    "chat_reply": .86,                     # user sends each reply (per turn after the first)
    "loader_done": .96,
    "email": {"base": .60, "chat4": .04, "long": .02, "tap": -.02},   # email submitted | saw email
    "opt_in": .38,
    "plan_to_paywall": .93,                # plan1 -> plan2 -> deal -> paywall
    "checkout": {"weekly": .14, "annual_trial": .17},
    "checkout_mult": {"long": 1.15, "chat4": 1.10, "tap": .95},
    "checkout_to_purchase": {"weekly": .72, "annual_trial": .76},
    "timer_late": .16,                     # buyers who pay after the 10-minute intro window (full price)
    "plan_mix": {"weekly": {"1w": .40, "4w": .45, "12w": .15}, "annual_trial": {"year": .72, "month": .28}},
    "trial_to_paid": .50,
    "return_visit": .22,                   # paywall non-buyers who come back within 3 days -> downsell
    "downsell_buy": .07,
    "upsell": {"single": .21, "bundle": .15},
    "llm_fallback": .04,                   # model calls that fall back to the written fallback
}
PRICES = {"1w": (6.93, 13.86), "4w": (19.99, 39.99), "12w": (39.99, 79.99), "year": (0.0, 79.99), "month": (19.99, 19.99), "4w_back": (14.99, 39.99)}
UPSELL = {"single": ("sunday_review", 9.99), "bundle": ("voice_review", 14.99)}
REASON_OF = {"overload": "overload", "sunday": "overload", "start": "start", "lost": "lost", "private": "talk"}
REASONS = ["overload", "start", "lost", "talk"]
GEN_SHORT = ["age", "since", "tried", "stuck"]
GEN_LONG = GEN_SHORT + ["overthink", "energy", "support"]
P2_SHORT = ["voice", "time", "goal_when"]
P2_LONG = ["voice", "time", "checkin", "goal_when"]
COACH_W = {"nora": .24, "ines": .30, "max": .18, "theo": .28}


def pick(d):
    r, acc = random.random(), 0
    for k, w in d.items():
        acc += w
        if r < acc: return k
    return k


def bucket(exp, uid, a, b):  # deterministic 50/50, independent per experiment
    return a if int(hashlib.md5(f"{exp}:{uid}".encode()).hexdigest(), 16) % 2 == 0 else b


events = []


class User:
    def __init__(self, t):
        self.id = str(uuid.UUID(int=random.getrandbits(128), version=4)); self.t = t
        self.angle = pick(RATES["angle_mix"])
        self.os = "iOS" if random.random() < .62 else "Android"
        self.cc = pick({"US": .70, "GB": .11, "CA": .10, "AU": .09})

    def ev(self, name, wait=(1, 6), **props):
        self.t += timedelta(seconds=random.uniform(*wait))
        p = {"time": int(self.t.timestamp()), "distinct_id": self.id, "$insert_id": "%032x" % random.getrandbits(128),
             "angle": self.angle, "utm_source": "meta", "utm_campaign": f"duskwise_{self.angle}",
             "$os": self.os, "mp_country_code": self.cc, "sim_version": 2, "simulated": True, **props}
        events.append({"event": name, "properties": p})

    def expose(self, exp, value):  # GrowthBook trackingCallback (app/providers.jsx)
        variants = {"quiz-length": ["short", "long"], "entry-mode": ["write", "tap"], "chat-length": ["2", "4"],
                    "paywall-model": ["weekly", "annual_trial"], "upsell-offer": ["single", "bundle"]}[exp]
        self.ev("$experiment_started", (0, 1), **{"Experiment name": exp, "Variant name": variants.index(value),
                                                    "variation_value": value, "$source": "growthbook"})


def run(u):
    ql = bucket("quiz-length", u.id, "short", "long")
    em = bucket("entry-mode", u.id, "write", "tap")
    cl = bucket("chat-length", u.id, "2", "4")
    u.ev("landing_viewed", (0, 1))
    for exp, v in [("quiz-length", ql), ("chat-length", cl), ("entry-mode", em)]: u.expose(exp, v)
    pre = REASON_OF.get(u.angle)
    if random.random() > RATES["start_quiz"] + (RATES["preselected_bonus"] if pre else 0): return
    reason = pre if pre and random.random() < .8 else random.choice(REASONS)
    u.ev("quiz_started", (3, 15), angle=u.angle, reason=reason, preselected=reason == pre, quiz_length=ql, entry_mode=em)
    if random.random() > RATES["write_done"][em]: return
    how = pick(RATES["tap_how"] if em == "tap" else RATES["write_how"])
    u.ev("situation_written", (8, 60) if how == "typed" else (3, 10), length=random.randint(40, 220) if how == "typed" else 52, reason=reason, how=how, entry_mode=em)
    n_ai = 5 if ql == "long" else 3
    u.ev("coach_questions_generated", (0, 1), mode="fallback" if random.random() < RATES["llm_fallback"] else "llm", ms=random.randint(2500, 7000), n=n_ai, crisis=False)
    step = 0
    for qid in (GEN_LONG if ql == "long" else GEN_SHORT):
        if random.random() > RATES["gen_q_continue"]: return
        step += 1; u.ev("quiz_step_completed", (3, 9), step=step, step_id=qid, quiz_length=ql)
    if random.random() > RATES["breather_continue"]: return
    u.ev("breather_viewed", (1, 3), which="reflection")
    for i in range(n_ai):
        if random.random() > RATES["ai_q_continue"]: return
        step += 1; u.ev("quiz_step_completed", (4, 12), step=step, step_id=f"dyn_{i + 1}", quiz_length=ql)
    u.ev("breather_viewed", (1, 3), which="summary")
    if random.random() > RATES["name_continue"]: return
    u.ev("name_submitted", (3, 10))
    for qid in (P2_LONG if ql == "long" else P2_SHORT):
        if random.random() > (RATES["voice_continue"] if qid == "voice" else RATES["gen_q_continue"]): return
        step += 1; u.ev("quiz_step_completed", (3, 9), step=step, step_id=qid, quiz_length=ql)
    coach = pick(COACH_W)
    u.ev("coach_matched", (1, 2), coach=coach)
    if random.random() < .07:
        coach = random.choice([c for c in COACH_W if c != coach]); u.ev("coach_switched", (2, 6), coach=coach)
    if random.random() > RATES["match_to_chat"]: return
    turns = int(cl)
    for turn in range(1, turns + 1):
        mode = "fallback" if random.random() < RATES["llm_fallback"] else "llm"
        u.ev("coach_message_shown", (2, 5), coach=coach, turn=turn, mode=mode, ms=random.randint(1200, 4200), chat_length=turns)
        if turn == turns: break
        if random.random() > RATES["chat_reply"]: return
        u.ev("coach_reply_sent", (10, 45), coach=coach, turn=turn, quick=random.random() < .35, chat_length=turns)
    u.ev("chat_completed", (2, 6), coach=coach, chat_length=turns)
    u.ev("plan_generated", (3, 9), mode="fallback" if random.random() < RATES["llm_fallback"] else "llm", ms=random.randint(5000, 14000))
    for q in ["commit_time", "sunday_checkin"]:
        u.ev("loader_answer", (2, 4), q=q, a="yes" if random.random() < .78 else "no")
    if random.random() > RATES["loader_done"]: return
    u.ev("email_viewed", (1, 2))
    r = RATES["email"]
    p_email = r["base"] + (r["chat4"] if turns == 4 else 0) + (r["long"] if ql == "long" else 0) + (r["tap"] if em == "tap" else 0)
    if random.random() > p_email: return
    u.ev("email_submitted", (8, 25), marketing_opt_in=random.random() < RATES["opt_in"])
    u.ev("result_viewed", (2, 4), mode="llm")
    if random.random() > RATES["plan_to_paywall"]: return
    u.ev("deal_signed", (10, 30))
    model = bucket("paywall-model", u.id, "weekly", "annual_trial")
    u.expose("paywall-model", model)
    u.ev("paywall_viewed", (1, 2), paywall_model=model)
    m = RATES["checkout_mult"]
    p_co = RATES["checkout"][model] * (m["long"] if ql == "long" else 1) * (m["chat4"] if turns == 4 else 1) * (m["tap"] if em == "tap" else 1)
    if random.random() < p_co:
        plan = pick(RATES["plan_mix"][model])
        intro = random.random() > RATES["timer_late"]
        if not intro: u.ev("paywall_timer_expired", (600, 900))
        if plan not in ("4w", "year"): u.ev("plan_selected", (2, 8), plan=plan, paywall_model=model)
        price, full = PRICES[plan]
        today = 0.0 if plan == "year" else (price if intro else full)
        u.ev("checkout_started", (5, 40), plan=plan, price=today, paywall_model=model, intro=intro)
        if random.random() < RATES["checkout_to_purchase"][model]:
            u.ev("purchase_completed", (40, 120), plan=plan, revenue=today, currency="USD", trial=plan == "year", intro=intro)
            if plan == "year":
                paid_at = u.t + timedelta(days=7)
                if paid_at < START + timedelta(days=DAYS) and random.random() < RATES["trial_to_paid"]:
                    saved = u.t; u.t = paid_at; u.ev("trial_converted", (0, 60), plan="year", revenue=79.99, currency="USD"); u.t = saved
            upsell(u)
            return
    # left the paywall: some come back later and see the downsell (no timer)
    if random.random() < RATES["return_visit"]:
        u.t += timedelta(hours=random.uniform(6, 72))
        if u.t > START + timedelta(days=DAYS): return
        u.ev("downsell_viewed", (1, 3), paywall_model="downsell")
        if random.random() < RATES["downsell_buy"]:
            price, _ = PRICES["4w_back"]
            u.ev("checkout_started", (5, 30), plan="4w_back", price=price, paywall_model="downsell", intro=True)
            u.ev("purchase_completed", (40, 120), plan="4w_back", revenue=price, currency="USD", trial=False, intro=True)
            upsell(u)


def upsell(u):
    v = bucket("upsell-offer", u.id, "single", "bundle")
    u.expose("upsell-offer", v)
    offer, price = UPSELL[v]
    u.ev("upsell_viewed", (2, 5), offer=offer, variant=v)
    if random.random() < RATES["upsell"][v]:
        u.ev("upsell_checkout_started", (3, 10), offer=offer, price=price, variant=v)
        u.ev("upsell_purchased", (30, 90), offer=offer, revenue=price, variant=v)
    else:
        u.ev("upsell_declined", (2, 6), offer=offer, variant=v)
    u.ev("onboarding_reached", (2, 5))


n_users = 0
for d in range(DAYS):
    for _ in range(random.randint(*VISITS)):
        t = START + timedelta(days=d, seconds=random.uniform(0, 86400 - 3600))
        run(User(t)); n_users += 1

events.sort(key=lambda e: e["properties"]["time"])
with open(os.path.join(OUT, "events.ndjson"), "w") as f:
    for e in events: f.write(json.dumps(e) + "\n")
cols = sorted({k for e in events for k in e["properties"]} - {"$insert_id"})
with open(os.path.join(OUT, "events.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["event"] + [c if c != "time" else "time" for c in cols])
    for e in events:
        p = e["properties"]
        w.writerow([e["event"]] + [datetime.fromtimestamp(p["time"], timezone.utc).isoformat() if c == "time" else p.get(c, "") for c in cols])
json.dump({"seed": SEED, "start": START.isoformat(), "days": DAYS, "users": n_users, "events": len(events), "rates": RATES, "prices": PRICES},
          open(os.path.join(OUT, "assumptions.json"), "w"), indent=1)
print(f"{n_users} simulated visitors, {len(events)} events -> data/events.ndjson, data/events.csv")
