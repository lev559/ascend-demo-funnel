"""SIMULATED data v3 for Quietly: 25 weeks of paid traffic, the full subscription lifecycle and in-app usage. Not real users.

What is new compared with v2 (scripts/simulate_traffic.py, 3 weeks, funnel only):
  * Tracking plan v3 (analytics/tracking_plan.json): renamed events, super properties on every event, server-side revenue.
  * Channels (Meta, TikTok, Google, organic) with their own traffic quality, and a daily ad-spend table for CAC / ROAS.
  * Identity: anonymous $device_id until email_submitted, then $user_id. App events carry the same $user_id (web2app join).
  * Stripe webhook events: subscription_started, trial_converted, subscription_renewed, payment_failed,
    subscription_cancelled, subscription_ended, refund_issued, upsell_purchased.
  * In-app engagement (app_opened, app_login, coach_session_started, plan_step_completed, checkin_answered,
    weekly_review_completed) driven by a per-user engagement level that also drives renewals and refunds.
  * Experiments run one after another, like a real roadmap. A shipped winner keeps a 5% holdout.
Every assumption is in RATES / EXPERIMENTS below: the "true" effects that the analysis should recover.
Every event has simulated=True and sim_version=3.

Output: data/v3/events.ndjson, data/v3/profiles.ndjson, data/v3/ad_spend.csv, data/v3/assumptions.json
"""
import csv, hashlib, json, math, os, random, uuid
from datetime import datetime, timedelta, timezone

SEED = 3031
random.seed(SEED)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data", "v3"); os.makedirs(OUT, exist_ok=True)
START = datetime(2026, 6, 1, tzinfo=timezone.utc)
END = datetime(2026, 11, 23, tzinfo=timezone.utc)          # data cut-off (exclusive)
DAYS = (END - START).days
VISITORS_PER_DAY = (220, 420)                               # linear ramp as spend scales
FUNNEL_VERSION = "v3"

CHANNELS = {  # share of paid traffic, cost per landing visitor (USD), quality multipliers
    "meta":    {"share": .58, "cpv": .92, "start": 1.00, "buy": 1.00, "engage": 1.00, "refund": 1.0, "medium": "paid_social"},
    "tiktok":  {"share": .24, "cpv": .55, "start": .92,  "buy": .78,  "engage": .85,  "refund": 1.6, "medium": "paid_social"},
    "google":  {"share": .12, "cpv": 1.45, "start": 1.08, "buy": 1.30, "engage": 1.10, "refund": .8, "medium": "paid_search"},
    "organic": {"share": .06, "cpv": 0.0,  "start": 1.10, "buy": 1.20, "engage": 1.15, "refund": .7, "medium": "organic"},
}
ANGLES = {"overload": .26, "sunday": .12, "start": .18, "lost": .16, "private": .12, "voice": .08, "default": .08}
REASON_OF = {"overload": "overload", "sunday": "overload", "start": "start", "lost": "lost", "private": "talk"}
REASONS = ["overload", "start", "lost", "talk"]
COACH_W = {"nora": .24, "ines": .30, "max": .18, "theo": .28}
COACH_ENGAGE = {"nora": 1.05, "ines": 1.08, "max": .90, "theo": .97}
REASON_ENGAGE = {"overload": .95, "start": .92, "lost": 1.05, "talk": 1.12}

RATES = {
    "start_quiz": .56, "preselected_bonus": .05,
    "write_done": {"write": .74, "tap": .86},
    "gen_q_continue": .975, "ai_q_continue": .985, "interstitial_continue": .97, "name_continue": .95,
    "match_to_chat": .93, "chat_reply": .86, "loader_done": .96,
    "email": {"base": .60, "chat4": .04, "long": .02, "tap": -.02}, "opt_in": .38,
    "plan_to_paywall": .93,
    "checkout": {"weekly": .135, "annual_trial": .165},
    "checkout_mult": {"long": 1.06, "chat4": 1.05, "tap": .97},
    "checkout_to_paid": {"weekly": .72, "annual_trial": .76},
    "timer_late": .16,
    "plan_mix": {"weekly": {"1w": .40, "4w": .45, "12w": .15}, "annual_trial": {"year": .72, "month": .28}},
    "return_visit": .22, "downsell_buy": .07,
    "upsell": {"single": .21, "bundle": .155},
    "llm_fallback": .04, "crisis": .003, "nav_back": .05, "questions_wait": .18,
    # lifecycle
    "app_login": .72,                     # bought on web -> signs into the app within 24 h
    "engagement_mean": .50,               # Beta mean of the engagement level before multipliers
    "renew": {"1w": (.38, .40), "4w": (.50, .38), "12w": (.55, .35), "month": (.52, .36), "4w_back": (.45, .38)},  # base + slope × engagement
    "trial_to_paid": (.22, .50),          # base + slope × engagement
    "refund_first_charge": (.015, .07),   # base + slope × (1 − engagement)
    "payment_failed": .045, "payment_recovered": .55,
    "weekly_actions": 5.5, "engagement_decay": .94,
}
PRICES = {"1w": (6.93, 13.86, 7), "4w": (19.99, 39.99, 28), "12w": (39.99, 79.99, 84), "year": (0.0, 79.99, 365),
          "month": (19.99, 19.99, 30), "4w_back": (14.99, 39.99, 28)}
UPSELL = {"single": ("sunday_review", 9.99), "bundle": ("voice_review", 14.99)}

# Incidents the monitoring (scripts/alerts.py) should catch. Real teams have these; a clean dataset would be a lie.
INCIDENTS = [
    {"id": "llm_outage", "start": "2026-10-06T14:00", "end": "2026-10-07T09:00", "what": "Model provider outage: most AI calls fall back to written templates",
     "llm_fallback": .70, "checkout_mult": .82},
    {"id": "android_paywall_tracking", "start": "2026-09-22T10:00", "end": "2026-09-24T16:00", "what": "Release bug: paywall_viewed not sent on Android (tracking only, purchases unaffected)"},
]
for x in INCIDENTS:
    x["t0"] = datetime.fromisoformat(x["start"]).replace(tzinfo=timezone.utc); x["t1"] = datetime.fromisoformat(x["end"]).replace(tzinfo=timezone.utc)


def incident(t, key):
    for x in INCIDENTS:
        if x["t0"] <= t < x["t1"] and key in x: return x[key]
    return None


def fb(u):  # model fallback rate at this moment
    return incident(u.t, "llm_fallback") or RATES["llm_fallback"]


# Roadmap: one experiment at a time; the winner ships with a 5% holdout kept on the control for 60 days.
EXPERIMENTS = [
    {"key": "entry-mode",    "flag": "exp_entry_mode",    "start": "2026-06-01", "end": "2026-06-29", "control": "write",  "variant": "tap",          "ship": True},
    {"key": "quiz-length",   "flag": "exp_quiz_length",   "start": "2026-07-01", "end": "2026-07-29", "control": "short",  "variant": "long",         "ship": False},
    {"key": "chat-length",   "flag": "exp_chat_length",   "start": "2026-08-03", "end": "2026-08-31", "control": "2",      "variant": "4",            "ship": False},
    {"key": "paywall-model", "flag": "exp_paywall_model", "start": "2026-09-01", "end": "2026-10-13", "control": "weekly", "variant": "annual_trial", "ship": True},
    {"key": "upsell-offer",  "flag": "exp_upsell_offer",  "start": "2026-10-14", "end": "2026-11-18", "control": "single", "variant": "bundle",       "ship": False},
]
for x in EXPERIMENTS:
    x["t0"] = datetime.fromisoformat(x["start"]).replace(tzinfo=timezone.utc)
    x["t1"] = datetime.fromisoformat(x["end"]).replace(tzinfo=timezone.utc)


def h(s):
    return int(hashlib.md5(s.encode()).hexdigest(), 16)


def assign(exp, uid, t):
    """Returns (value, exposed_variant_name or None). Before the test: control. During: 50/50.
    After: variant if shipped, except a 5% holdout for 60 days."""
    if t < exp["t0"]: return exp["control"], None
    if t < exp["t1"]: return (exp["variant"] if h(f'{exp["key"]}:{uid}') % 2 else exp["control"]), "test"
    if not exp["ship"]: return exp["control"], None
    if t < exp["t1"] + timedelta(days=60) and h(f'holdout:{exp["key"]}:{uid}') % 100 < 5: return exp["control"], "holdout"
    return exp["variant"], None


def pick(d):
    r, acc = random.random(), 0
    for k, w in d.items():
        acc += w if not isinstance(w, dict) else w["share"]
        if r < acc: return k
    return k


def beta(mean, k=4.0):
    return random.betavariate(max(mean, .02) * k, max(1 - mean, .02) * k)


events, profiles, spend = [], {}, {}
n_users = [0]


class User:
    def __init__(self, t):
        self.device = str(uuid.UUID(int=random.getrandbits(128), version=4)); self.user_id = None; self.t = t
        self.channel = pick(CHANNELS); self.angle = pick(ANGLES)
        self.os = "iOS" if random.random() < .62 else "Android"
        self.cc = pick({"US": .68, "GB": .12, "CA": .10, "AU": .10})
        c = CHANNELS[self.channel]
        self.utm = {"utm_source": self.channel if self.channel != "organic" else "direct", "utm_medium": c["medium"],
                    "utm_campaign": f"quietly_{self.angle}_{self.channel}" if self.channel != "organic" else "none",
                    "utm_content": self.angle}
        self.flags = {}; self.platform = "web"
        day = self.t.date().isoformat(); key = (day, self.channel, self.utm["utm_campaign"])
        spend[key] = spend.get(key, 0) + c["cpv"] * random.uniform(.8, 1.2)

    def flag(self, exp):
        v, how = assign(exp, self.device, self.t)
        self.flags[exp["flag"]] = v
        if how: self.ev("$experiment_started", (0, 1), **{"Experiment name": exp["key"], "Variant name": v, "variation_value": v,
                                                          "$source": "growthbook", "assignment": how})
        return v

    def ev(self, name, wait=(1, 6), platform=None, **props):
        if wait: self.t += timedelta(seconds=random.uniform(*wait))
        if self.t >= END: raise StopIteration
        p = {"time": int(self.t.timestamp()), "$insert_id": "%032x" % random.getrandbits(128), "$device_id": self.device,
             "platform": platform or self.platform, "funnel_version": FUNNEL_VERSION, "angle": self.angle, "channel": self.channel,
             **self.utm, **self.flags, "$os": self.os, "mp_country_code": self.cc, "sim_version": 3, "simulated": True, **props}
        if self.user_id: p["$user_id"] = self.user_id
        p["distinct_id"] = self.user_id or f"$device:{self.device}"
        events.append({"event": name, "properties": p})


def flags_for(u):
    return {x["key"]: u.flag(x) for x in EXPERIMENTS if x["key"] in ("entry-mode", "quiz-length", "chat-length")}


def run(u):
    c = CHANNELS[u.channel]
    u.ev("landing_viewed", (0, 1))
    f = flags_for(u); em, ql, cl = f["entry-mode"], f["quiz-length"], f["chat-length"]
    pre = REASON_OF.get(u.angle)
    if random.random() > (RATES["start_quiz"] + (RATES["preselected_bonus"] if pre else 0)) * c["start"]: return
    reason = pre if pre and random.random() < .8 else random.choice(REASONS)
    u.reason = reason
    u.ev("quiz_started", (3, 15), reason=reason, preselected=reason == pre, quiz_length=ql, entry_mode=em)
    if random.random() > RATES["write_done"][em]: return
    how = pick({"tap": .78, "typed": .22} if em == "tap" else {"typed": .63, "example": .37})
    u.ev("situation_written", (8, 60) if how == "typed" else (3, 10), text_length=random.randint(40, 220) if how == "typed" else 52, reason=reason, how=how, entry_mode=em)
    if random.random() < RATES["crisis"]:
        u.ev("crisis_flagged", (0, 1), platform="server", source=random.choice(["regex", "model"]), surface="questions"); return
    n_ai = 5 if ql == "long" else 3
    u.ev("coach_questions_generated", (0, 1), mode="fallback" if random.random() < fb(u) else "llm", ms=random.randint(2500, 7000), n=n_ai, crisis=False)
    step = 0
    for qid in (["age", "since", "tried", "stuck", "overthink", "energy", "support"] if ql == "long" else ["age", "since", "tried", "stuck"]):
        if random.random() > RATES["gen_q_continue"]: return
        if random.random() < RATES["nav_back"] / 4: u.ev("nav_back_clicked", (1, 3), **{"from": "quiz"})
        step += 1; u.ev("quiz_step_completed", (3, 9), step=step, step_id=qid, quiz_length=ql)
    if random.random() < RATES["questions_wait"]: u.ev("questions_wait_shown", (0, 1), ms=random.randint(300, 2500))
    if random.random() > RATES["interstitial_continue"]: return
    u.ev("interstitial_viewed", (1, 3), which="reflection")
    for i in range(n_ai):
        if random.random() > RATES["ai_q_continue"]: return
        step += 1; u.ev("quiz_step_completed", (4, 12), step=step, step_id=f"dyn_{i + 1}", quiz_length=ql)
    u.ev("interstitial_viewed", (1, 3), which="summary")
    if random.random() > RATES["name_continue"]: return
    u.ev("name_submitted", (3, 10))
    for qid in (["voice", "time", "checkin", "goal_when"] if ql == "long" else ["voice", "time", "goal_when"]):
        if random.random() > (.97 if qid == "voice" else RATES["gen_q_continue"]): return
        step += 1; u.ev("quiz_step_completed", (3, 9), step=step, step_id=qid, quiz_length=ql)
    coach = pick(COACH_W)
    u.ev("coach_matched", (1, 2), coach=coach)
    if random.random() < .07:
        coach = random.choice([k for k in COACH_W if k != coach]); u.ev("coach_switched", (2, 6), coach=coach)
    u.coach = coach
    if random.random() > RATES["match_to_chat"]: return
    turns = int(cl)
    for turn in range(1, turns + 1):
        u.ev("coach_message_shown", (2, 5), coach=coach, turn=turn, mode="fallback" if random.random() < fb(u) else "llm", ms=random.randint(1200, 4200), chat_length=cl)
        if turn == turns: break
        if random.random() > RATES["chat_reply"]: return
        u.ev("coach_reply_sent", (10, 45), coach=coach, turn=turn, quick=random.random() < .35, chat_length=cl)
    u.ev("chat_completed", (2, 6), coach=coach, chat_length=cl)
    u.ev("plan_generated", (3, 9), mode="fallback" if random.random() < fb(u) else "llm", ms=random.randint(5000, 14000))
    for q in ["commit_time", "sunday_checkin"]:
        u.ev("loader_question_answered", (2, 4), q=q, a="yes" if random.random() < .78 else "no")
    if random.random() > RATES["loader_done"]: return
    u.ev("email_viewed", (1, 2))
    r = RATES["email"]
    if random.random() > r["base"] + (r["chat4"] if turns == 4 else 0) + (r["long"] if ql == "long" else 0) + (r["tap"] if em == "tap" else 0): return
    opt = random.random() < RATES["opt_in"]
    u.ev("email_submitted", (8, 25), marketing_opt_in=opt)
    # identify(): from here on every event carries $user_id; Mixpanel merges the device history into this user
    u.user_id = "u_" + ("%012x" % random.getrandbits(48))
    profiles[u.user_id] = {"first_seen": (u.t - timedelta(minutes=8)).date().isoformat(), "acquisition_channel": u.channel, "first_angle": u.angle,
                           "reason": reason, "coach": coach, "marketing_opt_in": opt, "age_band": pick({"18–24": .17, "25–34": .38, "35–44": .25, "45–54": .13, "55+": .07}),
                           "subscription_status": "none", "ltv_usd": 0.0, "periods_paid": 0}
    u.ev("result_viewed", (2, 4), mode="llm")
    if random.random() > RATES["plan_to_paywall"]: return
    u.ev("commitment_signed", (10, 30))
    model = u.flag(EXPERIMENTS[3])
    if u.os == "Android" and any(x["id"] == "android_paywall_tracking" and x["t0"] <= u.t < x["t1"] for x in INCIDENTS): u.t += timedelta(seconds=2)
    else: u.ev("paywall_viewed", (1, 2), paywall_model=model)
    m = RATES["checkout_mult"]
    p_co = RATES["checkout"][model] * c["buy"] * (m["long"] if ql == "long" else 1) * (m["chat4"] if turns == 4 else 1) * (m["tap"] if em == "tap" else 1) * (incident(u.t, "checkout_mult") or 1)
    if random.random() < p_co:
        plan = pick(RATES["plan_mix"][model]); intro = random.random() > RATES["timer_late"]
        if not intro: u.ev("paywall_timer_expired", (600, 900))
        if plan not in ("4w", "year"): u.ev("plan_selected", (2, 8), plan=plan, paywall_model=model)
        price, full, _ = PRICES[plan]; today = 0.0 if plan == "year" else (price if intro else full)
        u.ev("checkout_started", (5, 40), plan=plan, price=today, paywall_model=model, intro=intro)
        if random.random() < RATES["checkout_to_paid"][model]:
            subscribe(u, plan, today, intro, model); return
        u.ev("checkout_abandoned", (60, 300), plan=plan)
    if random.random() < RATES["return_visit"]:
        u.t += timedelta(hours=random.uniform(6, 72))
        u.ev("downsell_viewed", (1, 3), paywall_model="downsell")
        if random.random() < RATES["downsell_buy"] * c["buy"]:
            price = PRICES["4w_back"][0]
            u.ev("checkout_started", (5, 30), plan="4w_back", price=price, paywall_model="downsell", intro=True)
            subscribe(u, "4w_back", price, True, "downsell")


def subscribe(u, plan, today, intro, model):
    c = CHANNELS[u.channel]; sid = "sub_" + ("%014x" % random.getrandbits(56)); prof = profiles[u.user_id]
    if u.t < datetime(2026, 7, 15, tzinfo=timezone.utc):   # migration window: old client event still firing
        # the client event is lossy (ad blockers, closed tabs) and duplicates on reload; that is why revenue moved server-side
        if random.random() < .93:
            u.ev("purchase_completed", (30, 60), plan=plan, revenue=today, currency="USD", trial=plan == "year", intro=intro)
            if random.random() < .02: u.ev("purchase_completed", (5, 30), plan=plan, revenue=today, currency="USD", trial=plan == "year", intro=intro)
    base = {"plan": plan, "subscription_id": sid, "paywall_model": model}
    u.ev("subscription_started", (2, 20), platform="server", revenue=today, intro=intro, trial=plan == "year", **base)
    prof.update(signup_date=u.t.date().isoformat(), plan=plan, subscription_status="trialing" if plan == "year" else "active",
                ltv_usd=round(today, 2), periods_paid=0 if plan == "year" else 1)
    # upsell (web, right after purchase)
    v = u.flag(EXPERIMENTS[4]); offer, price = UPSELL[v]
    u.ev("upsell_viewed", (2, 5), offer=offer, variant=v)
    if random.random() < RATES["upsell"][v]:
        u.ev("upsell_checkout_started", (3, 10), offer=offer, price=price, variant=v)
        u.ev("upsell_purchased", (30, 90), platform="server", offer=offer, revenue=price, variant=v)
        prof["ltv_usd"] = round(prof["ltv_usd"] + price, 2)
    else:
        u.ev("upsell_declined", (2, 6), offer=offer, variant=v)
    u.ev("onboarding_reached", (2, 5))
    if random.random() < .8: u.ev("app_download_clicked", (3, 20), store="ios" if u.os == "iOS" else "android")
    lifecycle(u, plan, today, base, prof, c)


def lifecycle(u, plan, first_charge, base, prof, c):
    t0 = u.t; app = "ios" if u.os == "iOS" else "android"
    eng = min(.97, beta(RATES["engagement_mean"]) * c["engage"] * COACH_ENGAGE[u.coach] * REASON_ENGAGE[u.reason])
    active_app = random.random() < RATES["app_login"] * (.7 + .5 * eng)
    if active_app:
        u.t = t0 + timedelta(hours=random.uniform(.2, 20))
        u.ev("app_opened", None, platform=app, first_open=True); u.ev("app_login", (20, 90), platform=app)
    _, full, days = PRICES[plan]
    period, paid_until, ltv = (0 if plan == "year" else 1), t0 + timedelta(days=7 if plan == "year" else days), first_charge
    cancelled = False; week = 0
    # refund on the first charge (30-day guarantee)
    if first_charge > 0 and random.random() < (RATES["refund_first_charge"][0] + RATES["refund_first_charge"][1] * (1 - eng)) * c["refund"]:
        u.t = t0 + timedelta(days=random.uniform(1, 14))
        if u.t < END:
            u.ev("refund_issued", None, platform="server", plan=plan, amount=first_charge, reason=random.choice(["requested", "requested", "guarantee"]))
            u.ev("subscription_cancelled", (1, 5), platform="server", period=period, reason="not_helpful", **base)
            u.ev("subscription_ended", (1, 5), platform="server", periods_paid=0, **base)
            prof.update(ltv_usd=0.0, subscription_status="ended", periods_paid=0)
        return
    while True:
        # weekly in-app usage until the paid period ends
        while active_app and t0 + timedelta(days=7 * (week + 1)) <= paid_until:
            lam = RATES["weekly_actions"] * eng * RATES["engagement_decay"] ** week
            for _ in range(min(12, poisson(lam))):
                u.t = t0 + timedelta(days=7 * week + random.uniform(0, 7))
                if u.t >= END: break
                kind = pick({"coach_session_started": .45, "plan_step_completed": .30, "checkin_answered": .20, "weekly_review_completed": .05})
                extra = {"coach_session_started": {"coach": u.coach}, "plan_step_completed": {"day": random.randint(1, 7), "plan_week": week + 1},
                         "checkin_answered": {"slot": random.choice(["morning", "evening", "sunday"])}, "weekly_review_completed": {"week": week + 1}}[kind]
                u.ev(kind, None, platform=app, **extra)
            week += 1
        u.t = paid_until
        if u.t >= END: break
        recent = eng * RATES["engagement_decay"] ** week if active_app else eng * .35
        if plan == "year":
            p = RATES["trial_to_paid"][0] + RATES["trial_to_paid"][1] * recent
        else:
            a, b = RATES["renew"][plan]; p = a + b * recent
        if random.random() > p:
            u.t = paid_until - timedelta(days=random.uniform(.2, min(5, days * .6)))
            reason = "not_using" if recent < .3 else pick({"too_expensive": .45, "not_helpful": .3, "other": .15, "none": .10})
            u.ev("subscription_cancelled", None, platform="server", period=period + 1, reason=reason, **base)
            u.t = paid_until; u.ev("subscription_ended", (1, 60), platform="server", periods_paid=period, **base)
            prof.update(subscription_status="ended"); break
        if random.random() < RATES["payment_failed"]:
            u.ev("payment_failed", (60, 600), platform="server", attempt=1, **base)
            if random.random() > RATES["payment_recovered"]:
                u.t += timedelta(days=7); u.ev("subscription_ended", None, platform="server", periods_paid=period, **base)
                prof.update(subscription_status="ended"); break
            u.t += timedelta(days=3)
        period += 1; ltv += full
        if plan == "year":
            u.ev("trial_converted", (60, 600), platform="server", revenue=full, **base); paid_until = t0 + timedelta(days=7 + 365)
        else:
            u.ev("subscription_renewed", (60, 600), platform="server", revenue=full, period=period, **base); paid_until += timedelta(days=days)
        prof.update(ltv_usd=round(prof["ltv_usd"] + full, 2), periods_paid=period, subscription_status="active")
    if prof["subscription_status"] == "trialing" and paid_until < END: prof["subscription_status"] = "active"


def poisson(lam):
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= random.random()
        if p <= L: return k
        k += 1


for d in range(DAYS):
    n = int(VISITORS_PER_DAY[0] + (VISITORS_PER_DAY[1] - VISITORS_PER_DAY[0]) * d / DAYS)
    for _ in range(int(n * random.uniform(.9, 1.1))):
        u = User(START + timedelta(days=d, seconds=random.uniform(0, 86400 - 3600)))
        try: run(u)
        except StopIteration: pass
        n_users[0] += 1

events.sort(key=lambda e: e["properties"]["time"])
with open(os.path.join(OUT, "events.ndjson"), "w") as f:
    for e in events: f.write(json.dumps(e, ensure_ascii=False) + "\n")
with open(os.path.join(OUT, "profiles.ndjson"), "w") as f:
    for uid, p in profiles.items(): f.write(json.dumps({"$distinct_id": uid, "$set": p}, ensure_ascii=False) + "\n")
with open(os.path.join(OUT, "ad_spend.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["date", "channel", "utm_campaign", "spend_usd"])
    for (day, ch, camp), s in sorted(spend.items()):
        if ch != "organic": w.writerow([day, ch, camp, round(s, 2)])
json.dump({"seed": SEED, "start": START.isoformat(), "end": END.isoformat(), "visitors": n_users[0], "events": len(events), "profiles": len(profiles),
           "rates": RATES, "channels": CHANNELS, "prices": PRICES, "experiments": [{k: v for k, v in x.items() if k not in ("t0", "t1")} for x in EXPERIMENTS],
           "incidents": [{k: v for k, v in x.items() if k not in ("t0", "t1")} for x in INCIDENTS]},
          open(os.path.join(OUT, "assumptions.json"), "w"), indent=1, ensure_ascii=False)
print(f"{n_users[0]:,} visitors, {len(events):,} events, {len(profiles):,} profiles -> data/v3/")
