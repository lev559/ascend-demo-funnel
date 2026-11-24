"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { ANGLES, questionsFor, countQuestions, coachInputs, canWait, PAYWALLS, renewalDate } from "../lib/funnel";
import { COACHES, matchCoach } from "../lib/coaches";
import { track } from "../lib/analytics";

const save = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
const load = (k, d) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } };

export default function Funnel() {
  const router = useRouter();
  const quizLength = useFeatureValue("quiz-length", "short");
  const chatMode = useFeatureValue("chat-mode", "scripted");
  const [stage, setStage] = useState("landing"); // landing | quiz | match | chat | loader | email | result | paywall
  const [answers, setAnswers] = useState({});
  const [coachId, setCoachId] = useState("theo");
  const [tonight, setTonight] = useState("");
  const angle = typeof window !== "undefined" ? sessionStorage.getItem("duskwise_angle") || "default" : "default";
  const hero = ANGLES[angle] || ANGLES.default;

  useEffect(() => { setAnswers(load("dw_answers", {})); track("landing_viewed", { angle }); }, []);
  useEffect(() => { save("dw_answers", answers); }, [answers]);
  useEffect(() => { window.scrollTo(0, 0); }, [stage]);

  const go = (s) => setStage(s);

  if (stage === "landing") return (
    <main className="screen night">
      <div className="lamp" aria-hidden="true"><i /><i /><b /></div>
      <header className="top"><span className="logo">Duskwise</span><span className="label">2-MIN QUIZ</span></header>
      <div className="hero">
        <h1>{hero.title}</h1>
        <p className="lead">{hero.sub}</p>
      </div>
      <div className="bottom">
        <button className="btn glow" onClick={() => { track("quiz_started", { angle, quiz_length: quizLength }); go("quiz"); }}>{hero.cta}</button>
        <p className="fine center">{countQuestions(quizLength)} short questions · no account needed</p>
      </div>
    </main>
  );

  if (stage === "quiz") return (
    <Quiz length={quizLength} answers={answers} setAnswers={setAnswers} onBack={() => go("landing")}
      onDone={(a) => { const c = matchCoach(coachInputs(a)); setCoachId(c); track("coach_matched", { coach: c }); go("match"); }} />
  );

  if (stage === "match") return <Match coachId={coachId} setCoachId={setCoachId} onNext={() => go("chat")} />;

  if (stage === "chat") return (
    <Chat coachId={coachId} chatMode={chatMode} pile={(answers.pile || [])[0]}
      onDone={(firstMsg, time) => { setTonight(firstMsg); setAnswers({ ...answers, tonight_time: time }); go("loader"); }} />
  );

  if (stage === "loader") return <Loader coachId={coachId} onDone={(checkin) => { setAnswers({ ...answers, sunday_checkin: checkin }); go("email"); }} />;

  if (stage === "email") return <Email coachId={coachId} onDone={() => go("result")} />;

  if (stage === "result") return <Result coachId={coachId} answers={answers} tonight={tonight} onNext={() => go("paywall")} />;

  return <Paywall coachId={coachId} router={router} />;
}

/* ---------- Quiz ---------- */
function Quiz({ length, answers, setAnswers, onDone, onBack }) {
  const qs = questionsFor(length);
  const total = qs.filter((q) => q.type !== "info").length;
  const [i, setI] = useState(0);
  const [multi, setMulti] = useState([]);
  const q = qs[i];
  const n = qs.slice(0, i + 1).filter((x) => x.type !== "info").length;

  useEffect(() => { setMulti(Array.isArray(answers[q.id]) ? answers[q.id] : []); }, [i]);

  const next = (value) => {
    const a = value === undefined ? answers : { ...answers, [q.id]: value };
    setAnswers(a);
    track("quiz_step_completed", { step: i + 1, step_id: q.id, section: q.section || "info", quiz_length: length, answer: Array.isArray(value) ? value.join(",") : value ?? null });
    if (i + 1 < qs.length) setI(i + 1); else onDone(a);
  };

  return (
    <main className="screen">
      <div className="progress-row">
        <button className="icon-btn" aria-label="Back" onClick={() => (i ? setI(i - 1) : onBack())}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="bar"><div style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      </div>
      {q.type === "info" ? (
        <>
          <div className="card big"><h2>{q.q}</h2><p className="lead">{q.body}</p></div>
          <button className="btn" onClick={() => next()}>Continue</button>
        </>
      ) : (
        <>
          <div className="qhead">
            <span className="label">{(q.section || "").toUpperCase()} · STEP {n} OF {total}</span>
            {q.type === "statement" ? <p className="muted">Does this sound like you?</p> : null}
            <h2 className={q.type === "statement" ? "statement" : ""}>{q.q}</h2>
            {q.hint && <p className="muted">{q.hint}</p>}
          </div>
          <div className="opts">
            {q.type === "multi" && q.options.map(([id, label, sub]) => {
              const on = multi.includes(id);
              return (
                <button key={id} className={`opt ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setMulti(on ? multi.filter((x) => x !== id) : [...multi, id])}>
                  <span><b>{label}</b>{sub && <small>{sub}</small>}</span><span className="check" aria-hidden="true" />
                </button>
              );
            })}
            {(q.type === "single" || q.type === "statement") && q.options.map((o) => (
              <button key={o} className={`opt ${answers[q.id] === o ? "on" : ""}`} onClick={() => next(o)}><span><b>{o}</b></span></button>
            ))}
          </div>
          {q.type === "multi" && <button className="btn" disabled={!multi.length} onClick={() => next(multi)}>Continue</button>}
          {q.skippable && <button className="link" onClick={() => next("skipped")}>Skip</button>}
          {q.type === "statement" && <p className="fine center">No wrong answers. We use this to pick your coach's tone, not to label you.</p>}
        </>
      )}
    </main>
  );
}

/* ---------- Coach match ---------- */
function Avatar({ id, size = 40 }) {
  const c = COACHES[id];
  return <span className="avatar" style={{ width: size, height: size, background: c.color, fontSize: size * 0.45 }}>{c.initial}</span>;
}

function Match({ coachId, setCoachId, onNext }) {
  const c = COACHES[coachId];
  useEffect(() => { track("coach_match_viewed", { coach: coachId }); }, []);
  return (
    <main className="screen night">
      <div className="qhead">
        <span className="label">YOUR COACH</span>
        <h2>{coachId === "theo" || coachId === "max" ? "You'd listen to a direct voice." : "You'd listen to a calm voice."}</h2>
        <p className="muted">Matched to your answers. You can switch any time.</p>
      </div>
      <div className="coach-card">
        <div className="row"><Avatar id={coachId} size={56} /><div><b className="cname">{c.name}</b><span className="label accent">{c.tags.toUpperCase()}</span></div></div>
        <p className="lead">“{c.sample}”</p>
      </div>
      <div className="others">
        {Object.keys(COACHES).filter((k) => k !== coachId).map((k) => (
          <button key={k} className="other" onClick={() => { setCoachId(k); track("coach_switched", { from: coachId, to: k }); }}>
            <Avatar id={k} size={36} /><b>{COACHES[k].name}</b><small>{COACHES[k].tags.toLowerCase()}</small>
          </button>
        ))}
      </div>
      <div className="bottom">
        <button className="btn glow" onClick={onNext}>Talk to {c.name}</button>
        <p className="fine center">{c.name} is an AI coach, not a person or a therapist.</p>
      </div>
    </main>
  );
}

/* ---------- Mini-chat ---------- */
async function coachSay(body) {
  try {
    const r = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await r.json();
  } catch { return { text: "Sorry, I lost the connection for a second. Let's keep going.", mode: "error" }; }
}

function Chat({ coachId, chatMode, pile, onDone }) {
  const c = COACHES[coachId];
  const [msgs, setMsgs] = useState([]);
  const [turn, setTurn] = useState(1);
  const [typing, setTyping] = useState(true);
  const [text, setText] = useState("");
  const [quick, setQuick] = useState([]);
  const first = useRef("");
  const end = useRef(null);

  const coach = async (t, message) => {
    setTyping(true);
    const r = await coachSay({ coachId, turn: t, pile, message, chatMode });
    await new Promise((ok) => setTimeout(ok, 500));
    setMsgs((m) => [...m, { who: "coach", text: r.text }]);
    setTyping(false);
    track("coach_message_shown", { turn: t, coach: coachId, chat_mode: chatMode, reply_mode: r.mode });
    if (r.quickReplies) setQuick(r.quickReplies);
    return r;
  };

  useEffect(() => { coach(1); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const send = async (value) => {
    const v = (value ?? text).trim();
    if (!v || typing) return;
    setText(""); setQuick([]);
    setMsgs((m) => [...m, { who: "me", text: v }]);
    track("coach_reply_sent", { turn, coach: coachId, chat_mode: chatMode, chars: v.length });
    if (turn === 1) {
      first.current = v;
      const r = await coach(2, v);
      if (r.mode === "safety") return; // stop coaching, the help message stays on screen
      setTurn(3); await coach(3);
    } else if (turn === 3) {
      onDone(first.current, v);
    }
  };

  return (
    <main className="screen chat">
      <header className="chat-head"><Avatar id={coachId} /><div><b>{c.name}</b><small>AI coach · {c.tags.toLowerCase()}</small></div></header>
      <div className="msgs">
        {msgs.map((m, k) => <div key={k} className={`msg ${m.who}`}>{m.text}</div>)}
        {typing && <div className="msg coach typing" aria-label={`${c.name} is typing`}><i /><i /><i /></div>}
        {!!quick.length && <div className="quick">{quick.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>}
        <div ref={end} />
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="reply" className="sr">Reply to {c.name}</label>
        <input id="reply" value={text} onChange={(e) => setText(e.target.value)} placeholder={turn === 1 ? "Type what's on your plate" : "Or type your answer"} maxLength={500} autoComplete="off" />
        <button className="send" aria-label="Send" disabled={typing || !text.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
    </main>
  );
}

/* ---------- Loader with one micro-question ---------- */
function Loader({ coachId, onDone }) {
  const c = COACHES[coachId];
  const [p, setP] = useState(0);
  const [asked, setAsked] = useState(false);
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    const t = setInterval(() => setP((x) => {
      const nx = x + 2;
      if (nx >= 60 && answer === null) { setAsked(true); return 60; }
      if (nx >= 100) { clearInterval(t); return 100; }
      return nx;
    }), 70);
    return () => clearInterval(t);
  }, [answer]);
  useEffect(() => { if (p >= 100) onDone(answer); }, [p]);
  const bars = [["Reading what you told me", Math.min(100, p * 3)], ["Finding what can wait", Math.max(0, Math.min(100, (p - 30) * 2))], ["Planning your first 7 days", Math.max(0, (p - 60) * 2.5)]];
  return (
    <main className="screen">
      <div className="row"><Avatar id={coachId} size={44} /><h2>{c.name} is sorting your week</h2></div>
      <div className="bars">{bars.map(([l, v]) => (
        <div key={l}><div className="bar-label"><span>{l}</span><span>{v >= 100 ? "Done" : `${Math.round(v)}%`}</span></div><div className="bar thick"><div style={{ width: `${Math.min(100, v)}%` }} /></div></div>
      ))}</div>
      {asked && answer === null && (
        <div className="sheet" role="dialog" aria-label="Quick question">
          <span className="label">ONE QUICK QUESTION</span>
          <h3>Should {c.name} check in with you on Sunday evenings?</h3>
          <div className="two">
            <button className="btn ghost" onClick={() => { setAnswer(false); track("loader_question_answered", { answer: "no" }); }}>Not now</button>
            <button className="btn" onClick={() => { setAnswer(true); track("loader_question_answered", { answer: "yes" }); }}>Yes, please</button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- Email ---------- */
function Email({ coachId, onDone }) {
  const c = COACHES[coachId];
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  useEffect(() => { track("email_viewed"); }, []);
  return (
    <main className="screen">
      <div className="qhead">
        <h2>Where should {c.name} send your plan?</h2>
        <p className="muted">We'll save this conversation so {c.name} remembers it tomorrow.</p>
      </div>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); track("email_submitted", { marketing_opt_in: tips }); onDone(); }}>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="note">Your chats stay private and are never used for ads. Demo: this address is not stored or sent anywhere.</div>
        <label className="checkbox"><input type="checkbox" checked={tips} onChange={(e) => setTips(e.target.checked)} /> Send me {c.name}'s weekly tips by email (optional)</label>
        <button className="btn" type="submit">See my plan</button>
        <p className="fine center">By continuing you agree to the Terms and Privacy Policy.</p>
      </form>
    </main>
  );
}

/* ---------- Result ---------- */
function Result({ coachId, answers, tonight, onNext }) {
  const c = COACHES[coachId];
  const list = canWait(answers);
  const one = tonight ? tonight.split(/[.,!?;\n]| and /)[0].trim().slice(0, 70) : "The one thing that unlocks the rest";
  const mins = answers.tonight_time && answers.tonight_time !== "Not tonight" ? answers.tonight_time.toUpperCase() : (answers.time || "15 minutes").toUpperCase();
  useEffect(() => { track("result_viewed", { coach: coachId }); }, []);
  return (
    <main className="screen">
      <div className="qhead"><span className="label">YOUR WEEK, SORTED BY {c.name.toUpperCase()}</span><h2 className="xl">One thing tonight. The rest can wait.</h2></div>
      <div className="card dark">
        <span className="label accent">TONIGHT · {mins}</span>
        <b className="cname">{one.charAt(0).toUpperCase() + one.slice(1)}</b>
        <p className="muted on-dark">{c.name} will check in when you're done.</p>
      </div>
      <div className="card">
        <b>Can wait this week</b>
        {list.map((x) => <div key={x.what} className="wait"><s>{x.what}</s><span>{x.when}</span></div>)}
      </div>
      <div className="row"><Avatar id={coachId} size={36} /><p>I'll keep this list and move things as your week changes.</p></div>
      <button className="btn" onClick={onNext}>Keep {c.name} for the week</button>
    </main>
  );
}

/* ---------- Paywall ---------- */
function Paywall({ coachId, router }) {
  const c = COACHES[coachId];
  const model = useFeatureValue("paywall-model", "weekly");
  const cfg = PAYWALLS[model] || PAYWALLS.weekly;
  const [plan, setPlan] = useState(cfg.default);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  useEffect(() => { track("paywall_viewed", { paywall_model: model }); setPlan(cfg.default); }, [model]);
  const sel = cfg.plans.find((p) => p.id === plan) || cfg.plans[0];
  const firstCharge = sel.trialDays ? sel.trialDays : sel.days;
  const terms = sel.trialDays
    ? `$0 today. Your trial ends on ${renewalDate(sel.trialDays)}, then $${sel.price.toFixed(2)} per year until you cancel. Reminder 3 days before.`
    : `$${sel.price.toFixed(2)} today. Renews on ${renewalDate(firstCharge)} at $${sel.price.toFixed(2)} ${sel.renew.replace(/^then \$[\d.]+ /, "")} until you cancel.`;

  const checkout = async () => {
    setBusy(true);
    track("checkout_started", { plan: sel.id, price: sel.price, paywall_model: model });
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "plan", id: sel.id }) }).then((x) => x.json()).catch(() => ({ demo: true }));
    if (r.url) window.location.href = r.url; else { setDemo(true); setBusy(false); }
  };
  const payDemo = () => {
    track("purchase_completed", { plan: sel.id, revenue: sel.trialDays ? 0 : sel.price, paywall_model: model, mode: "demo" });
    router.push(`/upsell?plan=${sel.id}`);
  };

  return (
    <main className="screen">
      <div className="qhead"><h2 className="xl">Keep {c.name} in your week</h2><p className="muted">Daily check-ins, your “can wait” list, and a coach who remembers.</p></div>
      <div className="opts">
        {cfg.plans.map((p) => (
          <button key={p.id} className={`plan ${plan === p.id ? "on" : ""}`} onClick={() => { setPlan(p.id); track("plan_selected", { plan: p.id, paywall_model: model }); }}>
            {p.popular && <span className="tag">MOST PICKED</span>}
            <span className="pl"><b>{p.name}</b><small>{p.renew}</small></span>
            <span className="pr"><b>{p.trialDays ? "$0" : `$${p.price.toFixed(2)}`}</b><small>${p.perDay.toFixed(2)} / day</small></span>
          </button>
        ))}
      </div>
      <ul className="ticks"><li>Reminder email 3 days before every renewal</li><li>Cancel in 2 taps from your web account</li></ul>
      {!demo ? (
        <button className="btn" disabled={busy} onClick={checkout}>{busy ? "Opening checkout…" : sel.trialDays ? "Start my 7 free days" : `Start my ${sel.name}`}</button>
      ) : (
        <div className="card test"><b>Test checkout</b><p className="fine">Stripe isn't connected, so this simulates a successful payment. No card details are collected.</p>
          <button className="btn" onClick={payDemo}>Simulate {sel.trialDays ? "trial start" : `payment of $${sel.price.toFixed(2)}`}</button></div>
      )}
      <p className="fine center">{terms} Prices are illustrative.</p>
    </main>
  );
}
