"""SIMULATED traffic for the Duskwise demo funnel. Not real users.

Generates the same events the live funnel sends (app/page.jsx, app/upsell, app/done,
app/providers.jsx) for 3 weeks of paid-social traffic with four concurrent experiments,
each split 50/50 by a hash of the user id, independently of the others:
  quiz-length   : short (15 questions)       vs long (24 questions)
  paywall-model : weekly (1w / 4w / 12w)     vs annual_trial (7 days free, then $79.99/yr; or monthly)
  chat-mode     : scripted turn-2 reply      vs llm-written turn-2 reply
  upsell-offer  : single (Sunday review $9.99) vs bundle (voice + review $14.99)

Every rate in RATES is an ASSUMPTION, not a measurement. The "true" effects built in are:
  * long quiz: each extra question loses ~1.8% of people, so ~12% fewer reach the paywall,
    but paywall->checkout is x1.18 (more invested, better-matched users). Net revenue per
    visitor is flat to slightly positive (about +3%); the design does not hand the long quiz a big win.
  * annual_trial: checkout start 17% vs 14% ($0 today), 50% of trials convert to $79.99
    after 7 days. Revenue at purchase time is LOWER than weekly; higher only once trials mature.
    Weekly renewals are NOT simulated (first charge only), which flatters annual_trial.
  * llm chat: email capture +3pp (62% -> 65%) and paywall->checkout x1.05.
  * bundle upsell: take rate ~15% vs ~20%, but $14.99 vs $9.99 per buyer.
Quiz content, plans, prices and upsells are read from lib/funnel.js so they never drift.
Output: data/events.ndjson (Mixpanel /import format), data/events.csv, data/assumptions.json.
"""
import csv, hashlib, json, os, random, subprocess, uuid
from datetime import datetime, timedelta, timezone

SEED = 2026
START = datetime(2026, 10, 27, tzinfo=timezone.utc)
DAYS = 21
END = START + timedelta(days=DAYS)
VISITS_PER_DAY = (1200, 1700)

RATES = {
    "angle_mix": {"default": .10, "overload": .22, "sunday": .16, "start": .18, "lost": .12, "private": .10, "voice": .12},
    "start_quiz": {"default": .48, "overload": .60, "sunday": .57, "start": .55, "lost": .52, "private": .50, "voice": .58},
    # chance to answer each quiz screen and move on; anything not listed uses step_default
    "step_default": .986, "step_long_only": .982,
    "step_override": {"pile": .95, "tried": .975, "dropped": .98, "info_full": .99, "age": .975},
    "age_skip": .25,
    "match_to_chat": .93,           # coach match screen -> starts the chat
    "coach_switch": .07,            # picks a different coach on the match screen
    "chat_reply_1": .86,            # types what's on their plate
    "chat_reply_3": {"scripted": .94, "llm": .96},
    "llm_fallback": .03,            # llm arm: model error -> scripted fallback (reply_mode "fallback")
    "loader_answer": {"yes": .55, "no": .35},   # rest ignore the micro-question
    "loader_to_email": .97,
    "email_submit": {"scripted": .62, "llm": .65},
    "marketing_opt_in": .38,
    "result_to_paywall": .93,
    "paywall_to_checkout": {"weekly": .14, "annual_trial": .17},
    "checkout_lift": {"quiz-length": {"short": 1.0, "long": 1.18}, "chat-mode": {"scripted": 1.0, "llm": 1.05}},
    "checkout_to_purchase": {"weekly": .72, "annual_trial": .76},
    "plan_mix": {"weekly": {"1w": .45, "4w": .40, "12w": .15}, "annual_trial": {"year": .72, "month": .28}},
    "trial_to_paid": .50,           # after the 7-day trial, if it ends inside the window
    "upsell_checkout": {"single": .25, "bundle": .19},
    "upsell_checkout_to_paid": .80,
    "country_mix": {"US": .70, "GB": .11, "CA": .10, "AU": .09},
    "os_mix": {"iOS": .63, "Android": .37},
}
EXPERIMENTS = {"quiz-length": ["short", "long"], "paywall-model": ["weekly", "annual_trial"],
               "chat-mode": ["scripted", "llm"], "upsell-offer": ["single", "bundle"]}

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data")
JS = """import('%s/lib/funnel.js').then(m => console.log(JSON.stringify({
  questions: m.QUESTIONS.map(q => ({id: q.id, section: q.section || 'info', type: q.type, long: !!q.long,
    options: (q.options || []).map(o => Array.isArray(o) ? o[0] : o)})),
  angles: Object.keys(m.ANGLES), paywalls: m.PAYWALLS, upsells: m.UPSELLS})))""" % ROOT
F = json.loads(subprocess.run(["node", "-e", JS], capture_output=True, text=True, check=True).stdout)
assert set(RATES["angle_mix"]) == set(F["angles"]), "angle_mix must use the ANGLES keys from lib/funnel.js"
PLANS = {p["id"]: p for m in F["paywalls"].values() for p in m["plans"]}

rng = random.Random(SEED)
events = []


def pick(d):
    r, acc = rng.random(), 0
    for k, v in d.items():
        acc += v
        if r < acc: return k
    return k


def bucket(exp, uid):  # deterministic 50/50 split, independent per experiment
    return EXPERIMENTS[exp][int(hashlib.md5(f"{exp}:{uid}".encode()).hexdigest(), 16) % 2]


def match_coach(answers):  # same rule as coachInputs() + matchCoach()
    calm = answers.get("advice", "").startswith("“Take a breath")
    practical = answers.get("need") != "Someone in my corner"
    return ("ines" if practical else "nora") if calm else ("theo" if practical else "max")


class User:
    def __init__(self, t):
        self.id = str(uuid.UUID(int=rng.getrandbits(128), version=4))
        self.t = t
        angle = pick(RATES["angle_mix"])
        self.base = {"angle": angle, "utm_source": "meta", "utm_campaign": f"duskwise_{angle}",
                     "$os": pick(RATES["os_mix"]), "mp_country_code": pick(RATES["country_mix"])}
        self.arm = {e: bucket(e, self.id) for e in EXPERIMENTS}

    def ev(self, name, wait=(1, 5), at=None, **props):
        if at is None: self.t += timedelta(seconds=rng.randint(*wait))
        when = at or self.t
        events.append({"event": name, "properties": {
            "time": int(when.timestamp() * 1000), "distinct_id": self.id, "$insert_id": "%032x" % rng.getrandbits(128),
            "simulated": True, **self.base, **props}})

    def expose(self, exp):  # GrowthBook trackingCallback in app/providers.jsx
        v = self.arm[exp]
        self.ev("$experiment_started", (0, 1), **{"Experiment name": exp, "Variant name": EXPERIMENTS[exp].index(v),
                                                   "variation_value": v, "$source": "growthbook"})


def run(u):
    ql, chat, pm, up = (u.arm[e] for e in ("quiz-length", "chat-mode", "paywall-model", "upsell-offer"))
    u.expose("quiz-length"); u.expose("chat-mode")  # both read on the first render of app/page.jsx
    u.ev("landing_viewed", (0, 1), angle=u.base["angle"])
    if rng.random() > RATES["start_quiz"][u.base["angle"]]: return
    u.ev("quiz_started", (4, 25), angle=u.base["angle"], quiz_length=ql)
    answers = {}
    qs = [q for q in F["questions"] if ql == "long" or not q["long"]]
    for i, q in enumerate(qs):
        p = RATES["step_override"].get(q["id"], RATES["step_long_only"] if q["long"] else RATES["step_default"])
        if rng.random() > p: return
        if q["type"] == "info": ans = None
        elif q["type"] == "multi": ans = ",".join(rng.sample(q["options"], rng.randint(1, 3)))
        elif q["id"] == "age" and rng.random() < RATES["age_skip"]: ans = "skipped"
        else: ans = rng.choice(q["options"])
        answers[q["id"]] = ans or ""
        u.ev("quiz_step_completed", (3, 14), step=i + 1, step_id=q["id"], section=q["section"], quiz_length=ql, answer=ans)
    coach = match_coach(answers)
    u.ev("coach_matched", (1, 2), coach=coach)
    u.ev("coach_match_viewed", (0, 1), coach=coach)
    if rng.random() < RATES["coach_switch"]:
        new = rng.choice([c for c in ("nora", "ines", "max", "theo") if c != coach])
        u.ev("coach_switched", (3, 12), **{"from": coach, "to": new}); coach = new
    if rng.random() > RATES["match_to_chat"]: return
    say = lambda turn, mode: u.ev("coach_message_shown", (1, 4), turn=turn, coach=coach, chat_mode=chat, reply_mode=mode)
    say(1, "scripted")
    if rng.random() > RATES["chat_reply_1"]: return
    u.ev("coach_reply_sent", (10, 60), turn=1, coach=coach, chat_mode=chat, chars=rng.randint(12, 180))
    say(2, "scripted" if chat == "scripted" else ("fallback" if rng.random() < RATES["llm_fallback"] else "llm"))
    say(3, "scripted")
    if rng.random() > RATES["chat_reply_3"][chat]: return
    u.ev("coach_reply_sent", (3, 15), turn=3, coach=coach, chat_mode=chat, chars=rng.choice([10, 6, 11]))
    a = pick({**RATES["loader_answer"], "none": 1})
    if a != "none": u.ev("loader_question_answered", (3, 8), answer=a)
    if rng.random() > RATES["loader_to_email"]: return
    u.ev("email_viewed", (2, 6))
    if rng.random() > RATES["email_submit"][chat]: return
    u.ev("email_submitted", (8, 40), marketing_opt_in=rng.random() < RATES["marketing_opt_in"])
    u.ev("result_viewed", (1, 3), coach=coach)
    if rng.random() > RATES["result_to_paywall"]: return
    u.expose("paywall-model")  # useFeatureValue in <Paywall>
    u.ev("paywall_viewed", (0, 1), paywall_model=pm)
    lift = RATES["checkout_lift"]["quiz-length"][ql] * RATES["checkout_lift"]["chat-mode"][chat]
    if rng.random() > RATES["paywall_to_checkout"][pm] * lift: return
    plan = PLANS[pick(RATES["plan_mix"][pm])]
    if plan["id"] != F["paywalls"][pm]["default"] or rng.random() < .3:
        u.ev("plan_selected", (5, 40), plan=plan["id"], paywall_model=pm)
    u.ev("checkout_started", (3, 20), plan=plan["id"], price=plan["price"], paywall_model=pm)
    if rng.random() > RATES["checkout_to_purchase"][pm]: return
    trial = bool(plan.get("trialDays"))
    u.ev("purchase_completed", (40, 180), plan=plan["id"], revenue=0 if trial else plan["price"], currency="USD",
         trial=trial, paywall_model=pm, mode="simulated")
    if trial:
        ends = u.t + timedelta(days=plan["trialDays"])
        if ends < END and rng.random() < RATES["trial_to_paid"]:
            u.ev("trial_converted", at=ends, plan=plan["id"], revenue=plan["price"], currency="USD", paywall_model=pm)
    offer = F["upsells"][up]
    u.expose("upsell-offer")  # useFeatureValue on /upsell
    u.ev("upsell_viewed", (2, 5), offer=offer["id"], variant=up)
    if rng.random() < RATES["upsell_checkout"][up]:
        u.ev("upsell_checkout_started", (5, 30), offer=offer["id"], price=offer["price"], variant=up)
        if rng.random() < RATES["upsell_checkout_to_paid"]:
            u.ev("upsell_purchased", (30, 120), offer=offer["id"], revenue=offer["price"], currency="USD", variant=up, mode="simulated")
        else: return  # left on the payment screen
    else:
        u.ev("upsell_declined", (4, 30), offer=offer["id"], variant=up)
    u.ev("onboarding_reached", (1, 3))


for d in range(DAYS):
    day = START + timedelta(days=d)
    for _ in range(rng.randint(*VISITS_PER_DAY)):
        run(User(day + timedelta(seconds=rng.randint(0, 86399))))

events = [e for e in events if e["properties"]["time"] < END.timestamp() * 1000]
events.sort(key=lambda e: e["properties"]["time"])
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "events.ndjson"), "w") as f:
    for e in events: f.write(json.dumps(e, ensure_ascii=False) + "\n")
cols = ["event", "time", "distinct_id", "angle", "utm_source", "utm_campaign", "$os", "mp_country_code",
        "Experiment name", "Variant name", "variation_value", "quiz_length", "step", "step_id", "section", "answer",
        "coach", "turn", "chat_mode", "reply_mode", "chars", "marketing_opt_in", "paywall_model", "plan", "price",
        "revenue", "currency", "trial", "offer", "variant"]
with open(os.path.join(OUT, "events.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(cols)
    for e in events:
        p = e["properties"]
        w.writerow([e["event"], datetime.fromtimestamp(p["time"] / 1000, timezone.utc).isoformat()] +
                   ["" if p.get(c) is None else p[c] for c in cols[2:]])
json.dump({"seed": SEED, "start": START.isoformat(), "days": DAYS, "experiments": EXPERIMENTS, "rates": RATES},
          open(os.path.join(OUT, "assumptions.json"), "w"), indent=1)
print(f"SIMULATED: {len(events):,} events, {len({e['properties']['distinct_id'] for e in events}):,} visitors, "
      f"{START:%Y-%m-%d} to {END - timedelta(days=1):%Y-%m-%d}")
