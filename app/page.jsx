"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { REASONS, ANGLES, questionsFor, dynamicCount, coachFromAnswers, PAYWALLS, DOWNSELL, OFFER_MINUTES, perDay, renewalDate, money } from "../lib/funnel";
import { COACHES, whyCoach } from "../lib/coaches";
import { track, identifyUser, getKnownUserId, getDeviceId, getExperiments } from "../lib/analytics";
import { ReasonArt, CoachAvatar, OptArt } from "./art";

const KEY = "dw_state";
const loadState = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saveState = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, did: getDeviceId(), uid: getKnownUserId() }) }).then((r) => r.json());
const P1 = ["age", "since", "tried", "stuck", "overthink", "energy", "support"];
// Situation questions are generated in the background while the person answers the general ones.
const pending = {};
function fetchQuestions(ctx, n) {
  const key = `${ctx.reason}|${n}|${ctx.text}`;
  if (!pending[key]) {
    const t0 = Date.now();
    pending[key] = post("/api/coach/questions", { ctx, n }).catch(() => null).then((r) => {
      track("coach_questions_generated", { mode: r?.mode || "error", ms: Date.now() - t0, n, crisis: Boolean(r?.crisis) });
      return r?.crisis ? r : r?.questions?.length ? r : { reflection: {}, questions: [] };
    });
  }
  return pending[key];
}
const nextDays = () => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 864e5).toLocaleDateString("en-US", { weekday: "short" }));

export default function Funnel() {
  const router = useRouter();
  const quizLength = useFeatureValue("quiz-length", "short");
  const chatLength = Number(useFeatureValue("chat-length", "2")) || 2;
  const entryMode = useFeatureValue("entry-mode", "write");
  const [s, setS] = useState(null);
  const [returning, setReturning] = useState(false);
  const angle = typeof window !== "undefined" ? sessionStorage.getItem("quietly_angle") || "default" : "default";

  useEffect(() => {
    // /?fresh=1 (linked from the case page) starts over: clears saved progress and the intro-price timer
    if (new URLSearchParams(window.location.search).has("fresh")) {
      try {
        ["dw_state", "dw_offer_deadline"].forEach((k) => localStorage.removeItem(k));
        const keep = ["quietly_angle", "dw_case"].map((k) => [k, sessionStorage.getItem(k)]);
        sessionStorage.clear();
        keep.forEach(([k, val]) => val && sessionStorage.setItem(k, val));
      } catch {}
      window.history.replaceState(null, "", window.location.pathname);
    }
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("checkout") === "cancelled") { track("checkout_abandoned", { plan: qs.get("plan") }); window.history.replaceState(null, "", window.location.pathname); }
    const st = loadState();
    let back = false;
    try { back = !sessionStorage.getItem("dw_session") && st.stage === "paywall" && !st.paid; sessionStorage.setItem("dw_session", "1"); } catch {}
    setReturning(back);
    setS(st.stage ? st : { stage: "landing" });
    if (!st.stage || st.stage === "landing") track("landing_viewed", { angle });
  }, []);
  useEffect(() => { if (s) saveState(s); }, [s]);
  useEffect(() => { window.scrollTo(0, 0); }, [s?.stage, s?.idx]);
  // Browser / Android back button goes one step back inside the funnel instead of leaving it.
  const sRef = useRef(s); sRef.current = s;
  useEffect(() => { if (s && s.stage !== "landing") window.history.pushState({ dw: `${s.stage}:${s.idx ?? ""}` }, ""); }, [s?.stage, s?.idx]);
  useEffect(() => {
    const onPop = () => {
      const cur = sRef.current; if (!cur) return;
      const prev = { write: { stage: "landing" }, match: { stage: "quiz" }, chat: { stage: "match" } }[cur.stage];
      if (cur.stage === "quiz") setS((p) => (p.idx > 0 ? { ...p, idx: p.idx - 1 } : { ...p, stage: "write" }));
      else if (cur.stage === "plan2") setS((p) => ({ ...p, stage: "plan1" }));
      else if (cur.stage === "deal") setS((p) => ({ ...p, stage: "plan2" }));
      else if (prev) setS((p) => ({ ...p, ...prev }));
      else window.history.pushState({ dw: "stay" }, "");
      track("nav_back_clicked", { from: cur.stage });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  if (!s) return <div className="app dark"><div className="spinner" /></div>;

  const up = (patch) => setS((p) => ({ ...p, ...patch }));
  const ctx = {
    name: s.name, reason: s.reason, text: s.text,
    dynamic: (s.dyn?.questions || []).map((q, i) => ({ q: q.q, label: q.label, a: s.dynA?.[i] })).filter((x) => x.a),
    general: s.general || {},
  };

  /* ---- 1. Landing: the first question is on the first screen ---- */
  if (s.stage === "landing") {
    const hero = ANGLES[angle] || ANGLES.default;
    const order = Object.keys(REASONS).sort((a, b) => (b === hero.reason) - (a === hero.reason));
    return (
      <div className="app dark"><main className="screen">
        <div className="top"><span className="logo">Quietly</span><span style={{ marginLeft: "auto" }}>2-MIN CHAT</span></div>
        <h1>{hero.title}<br /><span className="ap">{hero.accent}</span></h1>
        <ChatPreview />
        <p className="sub">What brings you here today?</p>
        <div className="cards2">
          {order.map((id) => { const r = REASONS[id]; return (
            <button key={id} className={`icard ${id === hero.reason ? "pick" : ""}`} onClick={() => { track("quiz_started", { angle, reason: id, preselected: id === hero.reason, quiz_length: quizLength, entry_mode: entryMode }); up({ stage: "write", reason: id }); }}>
              {id === hero.reason && <em className="foryou">For you</em>}
              <ReasonArt kind={r.art} /><span>{r.label}</span>
            </button>); })}
        </div>
        <p className="fine">Takes 2 minutes · No account needed · Not therapy</p>
        <div className="spacer" />
        <Legal />
      </main></div>
    );
  }

  /* ---- 2. In their own words ---- */
  if (s.stage === "write") return (
    <Write reason={s.reason} initial={s.text} mode={entryMode} onBack={() => up({ stage: "landing" })}
      onDone={(text, how) => {
        track("situation_written", { text_length: text.length, reason: s.reason, how, entry_mode: entryMode });
        fetchQuestions({ name: s.name, reason: s.reason, text, general: s.general || {} }, dynamicCount(quizLength))
          .then((r) => (r.crisis ? up({ stage: "crisis", crisis: r.text }) : up({ dyn: r })));
        up({ stage: "quiz", idx: 0, text, dyn: null, dynA: [] });
      }} />
  );

  /* ---- 3. Model reads it and writes questions for this situation ---- */
  if (s.stage === "reading") return (
    <Reading ctx={{ ...ctx, text: s.text }} n={dynamicCount(quizLength)}
      onCrisis={(text) => up({ stage: "crisis", crisis: text })}
      onDone={(dyn) => up({ stage: "quiz", idx: 0, dyn, dynA: [], general: s.general || {} })} />
  );

  if (s.stage === "crisis") return (
    <div className="app dark"><main className="screen">
      <h2>Thank you for telling us.</h2>
      <div className="crisis">{s.crisis}</div>
      <p className="sub">Quietly is a coaching app and can't help in an emergency. If you're safe and want to keep going, you can.</p>
      <div className="spacer" />
      <button className="btn ghost" onClick={() => up({ stage: "write" })}>Go back</button>
    </main></div>
  );

  /* ---- 4. Quiz: reflection → their questions → about you → summary → name → coach questions ---- */
  if (s.stage === "quiz") {
    const general = questionsFor(quizLength);
    const nDyn = s.dyn ? s.dyn.questions.length : dynamicCount(quizLength);
    const steps = [
      ...general.filter((q) => P1.includes(q.id)).map((q) => ({ t: "gen", q, sec: 0 })),
      { t: "reflect", sec: 1 },
      ...Array.from({ length: nDyn }, (_, i) => ({ t: "dyn", i, sec: 1 })),
      { t: "summary", sec: 1 },
      { t: "name", sec: 2 },
      ...general.filter((q) => !P1.includes(q.id)).map((q) => ({ t: "gen", q, sec: 2 })),
    ];
    const step = steps[s.idx] || steps[0];
    const secTotal = [0, 1, 2].map((k) => steps.filter((x) => x.sec === k).length);
    const secDone = [0, 1, 2].map((k) => steps.slice(0, s.idx).filter((x) => x.sec === k).length);
    const next = (patch = {}) => {
      if (step.t === "dyn" || step.t === "gen") track("quiz_step_completed", { step: s.idx + 1, step_id: step.t === "dyn" ? `dyn_${step.i + 1}` : step.q.id, quiz_length: quizLength });
      if (s.idx + 1 >= steps.length) {
        const g = { ...(s.general || {}), ...(patch.general || {}) };
        const c = coachFromAnswers(g);
        track("coach_matched", { coach: c });
        up({ ...patch, stage: "match", coachId: c, why: whyCoach(c) });
      } else up({ ...patch, idx: s.idx + 1 });
    };
    const back = () => (s.idx === 0 ? up({ stage: "write" }) : up({ idx: s.idx - 1 }));
    const dark = step.t === "reflect" || step.t === "summary";
    const Prog = () => (
      <div className="top"><button className="back" onClick={back} aria-label="Back">‹</button>
        <div className="prog">{secTotal.map((t, k) => <i key={k}><b style={{ width: `${t ? (secDone[k] / t) * 100 : 0}%` }} /></i>)}</div></div>);

    if ((step.t === "reflect" || step.t === "dyn") && !s.dyn) return (
      <Reading ctx={{ ...ctx, text: s.text }} n={dynamicCount(quizLength)}
        onCrisis={(text) => up({ stage: "crisis", crisis: text })} onDone={(dyn) => up({ dyn })} />);
    if (step.t === "reflect") return <Reflect dyn={s.dyn} Prog={Prog} onNext={() => next()} />;
    if (step.t === "dyn") {
      const q = s.dyn.questions[step.i];
      if (!q) return <Reflect dyn={s.dyn} Prog={Prog} onNext={() => up({ idx: steps.findIndex((x) => x.t === "summary") })} />;
      return (
        <div className="app"><main className="screen"><Prog />
          <div className="note">Your situation · {step.i + 1} of {s.dyn.questions.length}</div>
          <h2>{q.q}</h2>
          <div className="opts">{q.options.map((o) => (
            <button key={o.label} className={`opt ${s.dynA?.[step.i] === o.label ? "sel" : ""}`}
              onClick={() => { const a = [...(s.dynA || [])]; a[step.i] = o.label; setTimeout(() => next({ dynA: a }), 180); up({ dynA: a }); }}>
              <span>{o.label}{o.sub && <small>{o.sub}</small>}</span><span className="chk" /></button>))}</div>
        </main></div>);
    }
    if (step.t === "summary") return (
      <Summary ctx={ctx} general={s.general} Prog={Prog} onNext={() => next()} />
    );
    if (step.t === "name") return (
      <div className="app"><main className="screen"><Prog />
        <h2>What should your coach call you?</h2>
        <p className="sub">First name is enough.</p>
        <NameField initial={s.name} onDone={(name) => { track("name_submitted"); next({ name }); }} />
      </main></div>);
    return (
      <Question q={step.q} value={s.general?.[step.q.id]} Prog={Prog} name={s.name}
        onAnswer={(v, auto) => { const general = { ...(s.general || {}), [step.q.id]: v }; up({ general }); if (auto) setTimeout(() => next({ general }), 180); }}
        onNext={() => next()} />
    );
  }

  /* ---- 5. Coach match ---- */
  if (s.stage === "match") return (
    <Match coachId={s.coachId} why={s.why} name={s.name}
      onSwitch={(c) => { track("coach_switched", { coach: c }); up({ coachId: c, why: "Your pick. You can switch any time." }); }}
      onNext={() => up({ stage: "chat", history: [] })} />
  );

  /* ---- 6. Chat with the coach (length = chat-length experiment) ---- */
  if (s.stage === "chat") return (
    <Chat coachId={s.coachId} ctx={ctx} max={chatLength} history={s.history || []} setHistory={(h) => up({ history: h })}
      onDone={() => up({ stage: "loader", plan: null })} />
  );

  /* ---- 7. Loader: the plan is written meanwhile ---- */
  if (s.stage === "loader") return (
    <Loader coach={COACHES[s.coachId]} ctx={ctx} coachId={s.coachId} history={s.history || []} time={s.general?.time}
      onPlan={(plan) => up({ plan })} onAnswer={(k, v) => up({ general: { ...(s.general || {}), [k]: v } })}
      onDone={() => up({ stage: "email" })} />
  );

  /* ---- 8. Email + separate marketing consent ---- */
  if (s.stage === "email") return <Email coach={COACHES[s.coachId]} coachId={s.coachId} name={s.name} onDone={(email) => up({ stage: "consent", email })} />;
  if (s.stage === "consent") return (
    <div className="app dark"><main className="screen">
      <div className="spacer" />
      <CoachAvatar id={s.coachId} size={64} />
      <h2>Want {COACHES[s.coachId].name}'s weekly notes by email?</h2>
      <p className="sub">One short email on Sundays: an idea to try and a question for the week. Unsubscribe in one click.</p>
      <div className="spacer" />
      <button className="btn" onClick={() => { track("email_submitted", { marketing_opt_in: true }); identifyUser({ marketing_opt_in: true, reason: s.reason, coach: s.coachId, age_band: s.general?.age }); up({ stage: "plan1", marketing: true }); }}>Yes, send them</button>
      <button className="btn ghost" onClick={() => { track("email_submitted", { marketing_opt_in: false }); identifyUser({ marketing_opt_in: false, reason: s.reason, coach: s.coachId, age_band: s.general?.age }); up({ stage: "plan1", marketing: false }); }}>No, thanks</button>
    </main></div>
  );

  /* ---- 9. Plan written for them ---- */
  if (!s.plan && ["plan1", "plan2", "deal", "paywall"].includes(s.stage)) return <PlanWait ctx={ctx} coachId={s.coachId} history={s.history || []} onPlan={(plan) => up({ plan })} />;
  if (s.stage === "plan1") return <Plan1 plan={s.plan} coach={COACHES[s.coachId]} name={s.name} onNext={() => up({ stage: "plan2" })} />;
  if (s.stage === "plan2") return <Plan2 plan={s.plan} coach={COACHES[s.coachId]} onNext={() => up({ stage: "deal" })} />;
  if (s.stage === "deal") return <Deal plan={s.plan} coach={COACHES[s.coachId]} name={s.name} onDone={() => { track("commitment_signed"); up({ stage: "paywall" }); }} />;

  /* ---- 10. Paywall ---- */
  return <Paywall s={s} returning={returning} router={router} onPaid={() => up({ paid: true })} />;
}

function useEffectOnce(fn) { const done = useRef(false); useEffect(() => { if (!done.current) { done.current = true; fn(); } }, []); }

function Legal() {
  // Visitors who came from the general case page (?case=open) get linked back to it
  const [caseHref, setCaseHref] = useState("/case");
  useEffect(() => {
    try { if (sessionStorage.getItem("dw_case") === "open") setCaseHref("/case-study"); } catch {}
  }, []);
  return <footer className="legal"><a href="/terms">Terms</a>·<a href="/privacy">Privacy</a>·<a href="/subscription">Manage subscription</a>·<a href={caseHref}>How this was built</a></footer>;
}

/* ---------- Write (entry-mode experiment: free text first vs tap a typical situation first) ---------- */
function Write({ reason, initial, mode, onBack, onDone }) {
  const r = REASONS[reason] || REASONS.overload;
  const [t, setT] = useState(initial || "");
  const [typing, setTyping] = useState(mode === "write" || Boolean(initial));
  const ok = t.trim().split(/\s+/).length >= 4;
  return (
    <div className="app"><main className="screen">
      <div className="top"><button className="back" onClick={onBack} aria-label="Back">‹</button><span>{r.label.toUpperCase()}</span></div>
      <h2>{typing ? "What's going on? In a sentence or two." : "Which sounds closest to you?"}</h2>
      <p className="sub">{typing ? "Your coach reads this first, so the questions and the chat are about your situation, not a template." : "Pick one, or say it in your own words. Your coach builds the next questions from it."}</p>
      {typing ? (<>
        <textarea className="ta" value={t} onChange={(e) => setT(e.target.value)} placeholder={`e.g. ${r.hint}`} maxLength={500} autoFocus={mode === "write"} />
        {!t && <><div className="note" style={{ marginTop: 2 }}>Not sure how to put it? Tap one</div>
          <div className="opts">{r.examples.map((x) => <button key={x} className="opt small" onClick={() => onDone(x, "example")}><span>{x}</span></button>)}</div></>}
      </>) : (<>
        <div className="opts">{r.examples.map((x) => <button key={x} className="opt" onClick={() => onDone(x, "tap")}><span>{x}</span><span className="chk" /></button>)}</div>
        <button className="opt write-own" onClick={() => setTyping(true)}><span>✎ Something else, I'll write it</span></button>
      </>)}
      <p className="fine" style={{ textAlign: "left" }}>🔒 Private. Never used for ads.</p>
      <div className="spacer" />
      {typing && <button className="btn ink" disabled={!ok} onClick={() => onDone(t.trim(), "typed")}>Continue</button>}
    </main></div>
  );
}

/* ---------- Landing chat preview (animated) ---------- */
function ChatPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="bub me p1">I'm bored at work and can't decide if I should quit</div>
      <div className="prow p2"><CoachAvatar id="ines" size={28} /><div className="bub">Before deciding, let's test it: one small project this week. Then you'll know more than any quiz can tell you.</div></div>
    </div>
  );
}

/* ---------- Reading (questions are generated) ---------- */
function Reading({ ctx, n, onDone, onCrisis }) {
  useEffectOnce(() => {
    const t0 = Date.now();
    fetchQuestions(ctx, n).then((r) => {
      if (r.crisis) return onCrisis(r.text);
      track("questions_wait_shown", { ms: Date.now() - t0 });
      setTimeout(() => onDone(r), Math.max(0, 700 - (Date.now() - t0)));
    });
  });
  return (
    <div className="app dark"><main className="screen" style={{ justifyContent: "center", textAlign: "center" }}>
      <div className="spinner" />
      <h2>Reading what you wrote…</h2>
      <p className="sub">Picking the questions that matter for your situation.</p>
    </main></div>
  );
}

/* ---------- General question ---------- */
// Each general question has its own layout (numbers, list with icons, grid of tiles, row, timeline)
// so the quiz doesn't feel like the same screen repeated. Answers stay plain strings for analytics and the model.
function Question({ q, value, onAnswer, onNext, Prog, name }) {
  if (q.type === "statement") return (
    <div className="app"><main className="screen"><Prog />
      <div className="note">About you</div>
      <h2>Does this sound like you?</h2>
      <div className={`quote2 ${q.id}`}><span className="qm">“</span><p>{q.q.replace(/[“”]/g, "")}</p><OptArt name={q.art} size={52} /></div>
      <div className="scale2">{q.options.map((o, i) => (
        <button key={o} className={value === o ? "sel" : ""} onClick={() => onAnswer(o, true)} aria-label={o}>
          <i style={{ width: 16 + i * 6, height: 16 + i * 6 }} /></button>))}</div>
      <div className="scalel"><span>Not me</span><span>Somewhat</span><span>That's me</span></div>
      <div className="aside"><span className="nlogo">Q</span><span>{q.id === "stuck" ? "Knowing and doing are different skills. This tells your coach which one to start with." : "Thinking is useful up to a point. This tells your coach when to nudge you to act."}</span></div>
    </main></div>
  );
  if (q.type === "voice") return (
    <div className="app"><main className="screen"><Prog />
      <div className="note">Your coach</div>
      <h2>{q.q}</h2><p className="sub">{q.hint}</p>
      <div className="opts">{q.options.map((o) => (
        <button key={o.coach} className={`opt voice ${value === o.coach ? "sel" : ""}`} onClick={() => onAnswer(o.coach, true)}>
          <span className="vdot" style={{ background: COACHES[o.coach].color }} />
          <span><span className="vq">{o.label}</span><small>{o.sub}</small></span><span className="chk" /></button>))}</div>
    </main></div>
  );
  const multi = q.type === "multi";
  const sel = multi ? value || [] : value;
  const layout = q.layout || "list";
  const pick = (o) => (multi ? onAnswer(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]) : onAnswer(o, true));
  const isOn = (o) => (multi ? sel.includes(o) : sel === o);
  const showAside = q.aside && (!multi || sel.length > 0);
  return (
    <div className="app"><main className="screen"><Prog />
      <div className="note">{["voice", "time", "checkin", "goal_when"].includes(q.id) ? "Your coach" : "About you"}</div>
      <h2>{q.q}</h2>{q.hint && <p className="sub">{q.hint}</p>}
      {q.preview && (
        <div className="notif"><span className="nlogo">Q</span><span><b>Quietly</b> · now<br />{name ? `${name}, quick` : "Quick"} check-in: how did today's step go?</span></div>)}
      {layout === "timeline" ? (
        <div className="tline">{q.options.map((o, i) => (
          <button key={o} className={`tstop ${isOn(o) ? "sel" : ""}`} onClick={() => pick(o)}>
            <i /><b>{o}</b><small>{q.subs?.[i]}</small></button>))}</div>
      ) : (
        <div className={`opts ${layout}`}>{q.options.map((o, i) => (
          <button key={o} className={`opt ${layout} ${multi ? "multi" : ""} ${isOn(o) ? "sel" : ""}`} onClick={() => pick(o)}>
            {layout === "numbers" ? <b className="num">{o}</b> : <OptArt name={q.art?.[i]} size={layout === "list" ? 38 : 44} />}
            {layout !== "numbers" && <span>{o}{q.subs?.[i] && <small>{q.subs[i]}</small>}</span>}
            <span className="chk" /></button>))}</div>
      )}
      {showAside && <div className="aside"><span className="nlogo">Q</span><span>{q.aside}</span></div>}
      {multi && <><div className="spacer" /><div className="sticky-cta"><button className="btn ink" disabled={!sel.length} onClick={onNext}>Continue</button></div></>}
    </main></div>
  );
}

function Reflect({ dyn, Prog, onNext }) {
  useEffectOnce(() => track("interstitial_viewed", { which: "reflection" }));
  const r = dyn.reflection || {};
  return (
    <div className="app dark"><main className="screen"><Prog />
      {r.quote && <h2>“{r.quote}”</h2>}
      <h2 className="ap" style={{ marginTop: r.quote ? -6 : 0 }}>{r.headline}</h2>
      <p className="sub">{r.body}</p>
      <div className="panel summary"><div>{dyn.questions.length} questions written for your situation</div><div>Then you pick your coach's voice</div><div>And a short chat to find your next step</div></div>
      <div className="spacer" /><button className="btn" onClick={onNext}>Let's go</button>
    </main></div>);
}

function Summary({ ctx, general = {}, Prog, onNext }) {
  useEffectOnce(() => track("interstitial_viewed", { which: "summary" }));
  const lines = [
    ctx.text && `In your words: “${ctx.text.split(/[.!?\n]/)[0].slice(0, 90)}”`,
    ...ctx.dynamic.slice(0, 3).map((d) => `${d.label || "You said"}: ${d.a.charAt(0).toLowerCase() + d.a.slice(1)}`),
    general.since && `On your mind for ${general.since.toLowerCase()}`,
    Array.isArray(general.tried) && general.tried.length && `Already tried: ${general.tried.join(", ").toLowerCase()}`,
  ].filter(Boolean);
  return (
    <div className="app dark"><main className="screen"><Prog />
      <div className="note">What your coach knows so far</div>
      <h2>You won't have to <span className="ap">explain this twice.</span></h2>
      <div className="panel summary">{lines.map((l) => <div key={l}>{l}</div>)}</div>
      <p className="sub">Your coach remembers all of this, in every chat. Next: your name and the voice you'd listen to.</p>
      <div className="spacer" /><button className="btn" onClick={onNext}>Continue</button>
    </main></div>
  );
}

function NameField({ initial, onDone }) {
  const [n, setN] = useState(initial || "");
  return (<>
    <input className="field" value={n} onChange={(e) => setN(e.target.value)} placeholder="Your first name" autoComplete="given-name" maxLength={30} autoFocus />
    <div className="spacer" />
    <button className="btn ink" disabled={!n.trim()} onClick={() => onDone(n.trim().split(" ")[0])}>Continue</button>
  </>);
}

/* ---------- Match ---------- */
function Match({ coachId, why, name, onSwitch, onNext }) {
  const c = COACHES[coachId];
  return (
    <div className="app dark"><main className="screen">
      <div className="note">Your coach</div>
      <h2>{name ? `${name}, meet ` : "Meet "}<span style={{ color: c.color }}>{c.name}.</span></h2>
      <div className="panel coachcard" style={{ borderColor: c.color }}>
        <CoachAvatar id={coachId} size={76} />
        <div><h3>{c.name}</h3><div className="note" style={{ color: c.color }}>{c.tags}</div><p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.4 }}>“{c.sample}”</p></div>
      </div>
      <div className="panel" style={{ fontSize: 14, lineHeight: 1.45 }}><div className="note" style={{ marginBottom: 6 }}>Why {c.name}</div>{why}</div>
      <p className="sub" style={{ fontSize: 13 }}>Or pick another voice:</p>
      <div className="coachrow">{Object.keys(COACHES).filter((k) => k !== coachId).map((k) => (
        <button key={k} className="cmini" onClick={() => onSwitch(k)}><CoachAvatar id={k} size={46} />{COACHES[k].name}<small>{COACHES[k].short}</small></button>))}</div>
      <div className="spacer" />
      <button className="btn" onClick={onNext}>Talk to {c.name}</button>
      <p className="fine">{c.name} is an AI coach, not a person or a therapist.</p>
    </main></div>
  );
}

/* ---------- Chat ---------- */
function Chat({ coachId, ctx, max, history, setHistory, onDone }) {
  const c = COACHES[coachId];
  const [typing, setTyping] = useState(false);
  const [replies, setReplies] = useState([]);
  const [input, setInput] = useState("");
  const end = useRef(null);
  const coachTurns = history.filter((m) => m.role === "assistant").length;
  const finished = coachTurns >= max;

  const ask = async (h) => {
    setTyping(true); setReplies([]);
    const turn = h.filter((m) => m.role === "assistant").length + 1;
    const t0 = Date.now();
    const r = await post("/api/coach", { coachId, ctx, history: h, turn, max }).catch(() => ({ text: "Sorry, I lost my train of thought. Tell me a bit more?", replies: [], mode: "error" }));
    await new Promise((ok) => setTimeout(ok, Math.max(0, 900 - (Date.now() - t0))));
    setTyping(false);
    setHistory([...h, { role: "assistant", content: r.text }]);
    setReplies(r.replies || []);
    track("coach_message_shown", { coach: coachId, turn, mode: r.mode, ms: Date.now() - t0, chat_length: max });
  };
  useEffectOnce(() => { if (!history.length) ask([]); });
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [history.length, typing]);
  const send = (text) => {
    if (!text.trim() || typing || finished) return;
    const h = [...history, { role: "user", content: text.trim() }];
    setHistory(h); setInput("");
    track("coach_reply_sent", { coach: coachId, turn: coachTurns, quick: replies.includes(text), chat_length: max });
    ask(h);
  };
  return (
    <div className="app"><main className="screen" style={{ paddingBottom: 14 }}>
      <div className="chathead"><CoachAvatar id={coachId} size={40} /><div><b>{c.name}</b><div className="fine" style={{ textAlign: "left" }}>AI coach · {c.tags.toLowerCase()}</div></div></div>
      <div className="msgs">
        {history.map((m, i) => <div key={i} className={`bub ${m.role === "user" ? "me" : ""}`}>{m.content}</div>)}
        {typing && <div className="bub typing"><i /><i /><i /></div>}
        <div ref={end} />
      </div>
      {finished ? (
        <button className="btn" onClick={() => { track("chat_completed", { coach: coachId, chat_length: max }); onDone(); }}>See my plan</button>
      ) : (<>
        {!!replies.length && !typing && <div className="qr">{replies.map((r) => <button key={r} onClick={() => send(r)}>{r}</button>)}</div>}
        <div className="inputrow">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder={`Message ${c.name}`} maxLength={400} disabled={typing || !history.length} />
          <button className="send" onClick={() => send(input)} disabled={!input.trim() || typing} aria-label="Send">→</button>
        </div>
      </>)}
    </main></div>
  );
}

/* ---------- Loader with two commitment questions ---------- */
function Loader({ coach, ctx, coachId, history, time, onPlan, onAnswer, onDone }) {
  const [p, setP] = useState(0);
  const [pop, setPop] = useState(null);
  const asked = useRef({});
  useEffectOnce(() => {
    const t0 = Date.now();
    post("/api/coach/plan", { ctx, coachId, history, days: nextDays() }).catch(() => null).then((plan) => {
      if (plan) { onPlan(plan); track("plan_generated", { mode: plan.mode, ms: Date.now() - t0 }); }
    });
  });
  useEffect(() => {
    if (pop) return;
    if (p >= 100) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    if (p >= 34 && !asked.current.a) { asked.current.a = 1; setPop("a"); return; }
    if (p >= 68 && !asked.current.b) { asked.current.b = 1; setPop("b"); return; }
    const t = setTimeout(() => setP((x) => Math.min(100, x + 1)), 85);
    return () => clearTimeout(t);
  }, [p, pop]);
  const bars = [["Reading your chat", Math.min(100, p * 3)], [`Choosing your first step`, Math.max(0, Math.min(100, (p - 33) * 3))], ["Planning your next 7 days", Math.max(0, Math.min(100, (p - 66) * 3))]];
  const pops = {
    a: { q: `Can you give this ${(time || "15 minutes").toLowerCase()} a day for the next week?`, k: "commit_time" },
    b: { q: `Should ${coach.name} check in with you on Sunday evenings?`, k: "sunday_checkin" },
  };
  return (
    <div className="app dark"><main className="screen">
      <div className="spacer" style={{ maxHeight: 30 }} />
      <h2>{coach.name} is writing your plan</h2>
      {bars.map(([l, v]) => <div key={l}><div className="lrow"><span>{l}</span><span>{v >= 100 ? "Done" : `${Math.round(v)}%`}</span></div><div className="lbar"><b style={{ width: `${v}%` }} /></div></div>)}
      <div className="panel" style={{ fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>
        <div className="note" style={{ marginBottom: 6 }}>What happens next</div>
        Your plan, a first step sized for your week, and a coach who remembers this chat tomorrow.
      </div>
      {pop && (
        <div className="overlay"><div className="pop">
          <div className="note">One quick question</div>
          <h3 style={{ marginTop: 8 }}>{pops[pop].q}</h3>
          <div className="two">
            <button onClick={() => { onAnswer(pops[pop].k, "no"); track("loader_question_answered", { q: pops[pop].k, a: "no" }); setPop(null); }}>{pop === "a" ? "Not sure" : "Not now"}</button>
            <button className="y" onClick={() => { onAnswer(pops[pop].k, "yes"); track("loader_question_answered", { q: pops[pop].k, a: "yes" }); setPop(null); }}>Yes</button>
          </div>
        </div></div>
      )}
    </main></div>
  );
}

function PlanWait({ ctx, coachId, history, onPlan }) {
  useEffectOnce(() => { post("/api/coach/plan", { ctx, coachId, history, days: nextDays() }).catch(() => null).then((p) => p && onPlan(p)); });
  return <div className="app dark"><main className="screen" style={{ justifyContent: "center", textAlign: "center" }}><div className="spinner" /><h2>Finishing your plan…</h2></main></div>;
}

/* ---------- Email ---------- */
function Email({ coach, coachId, name, onDone }) {
  const [e, setE] = useState("");
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
  useEffectOnce(() => track("email_viewed"));
  return (
    <div className="app"><main className="screen">
      <div className="panel" style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--night)" }}>
        <CoachAvatar id={coachId} size={42} /><div style={{ fontSize: 14 }}>Your plan is ready{name ? `, ${name}` : ""}. Where should I send it?</div></div>
      <h2>Save your plan</h2>
      <p className="sub">{coach.name} keeps this conversation, so tomorrow you pick up where you left off.</p>
      <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={e} onChange={(x) => setE(x.target.value)} />
      <p className="fine" style={{ textAlign: "left" }}>🔒 Your chats stay private and are never used for ads.</p>
      <div className="spacer" />
      <button className="btn ink" disabled={!ok} onClick={() => onDone(e.trim())}>See my plan</button>
      <p className="fine">By continuing you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
    </main></div>
  );
}

/* ---------- Plan ---------- */
function Plan1({ plan, coach, name, onNext }) {
  useEffectOnce(() => track("result_viewed", { mode: plan.mode }));
  return (
    <div className="app dark"><main className="screen">
      <div className="note">{name ? `${name}'s plan` : "Your plan"} · by {coach.name}</div>
      <h2><span className="ap">{plan.profile}</span></h2>
      <p style={{ fontSize: 17, lineHeight: 1.45 }}>{plan.insight}</p>
      <div className="tonight"><div className="note">Your next step · {plan.next_step.when}</div><h3 style={{ margin: "5px 0" }}>{plan.next_step.title}</h3><div style={{ fontSize: 14, lineHeight: 1.45 }}>{plan.next_step.detail}</div></div>
      {plan.technique?.name && (
        <div className="tech"><div className="note">Try this · {plan.technique.name}</div>
          <div style={{ marginTop: 6 }}>{plan.technique.how}</div>
          {plan.technique.source && <div style={{ marginTop: 6, fontSize: 12.5, opacity: .65 }}>From {plan.technique.source}</div>}</div>)}
      <div className="spacer" /><button className="btn" onClick={onNext}>See my 7 days</button>
    </main></div>
  );
}
function Plan2({ plan, coach, onNext }) {
  return (
    <div className="app dark"><main className="screen">
      <div className="note">Your next 7 days</div>
      <h2>Small steps, <span className="ap">in order.</span></h2>
      <div className="panel" style={{ padding: "6px 16px" }}>{plan.days.map((d, i) => <div className="step" key={i}><span className="d">{d.day.toUpperCase()}</span><span>{d.task}</span></div>)}</div>
      <p className="sub" style={{ fontSize: 14 }}>{coach.name} checks in along the way and changes the plan when your week changes.</p>
      <div className="spacer" /><button className="btn" onClick={onNext}>Keep this plan</button>
    </main></div>
  );
}

function Deal({ plan, coach, name, onDone }) {
  const [h, setH] = useState(0);
  const timer = useRef(null);
  const start = () => { clearInterval(timer.current); timer.current = setInterval(() => setH((x) => { if (x >= 100) { clearInterval(timer.current); setTimeout(onDone, 350); return 100; } return x + 4; }), 50); };
  const stop = () => { clearInterval(timer.current); setH((x) => (x >= 100 ? x : 0)); };
  useEffect(() => () => clearInterval(timer.current), []);
  const C = 2 * Math.PI * 74;
  return (
    <div className="app dark"><main className="screen">
      <h2>Your deal with {coach.name}</h2>
      <ul className="panel deal">{plan.deal.map((d) => <li key={d}>{d}</li>)}<li>I can say “this isn't working” and we change course</li></ul>
      <div className="spacer" />
      <div className="hold" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onContextMenu={(e) => e.preventDefault()}>
        <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="74" stroke="rgba(255,179,107,.2)" strokeWidth="8" fill="none" /><circle cx="80" cy="80" r="74" stroke="#FFB36B" strokeWidth="8" fill="none" strokeDasharray={C} strokeDashoffset={C * (1 - h / 100)} transform="rotate(-90 80 80)" strokeLinecap="round" /></svg>
        <span>{h >= 100 ? "Deal ✓" : <>Press<br />and hold</>}</span>
      </div>
      <p className="fine">{name || "Me"} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
    </main></div>
  );
}

/* ---------- Paywall ---------- */
// Example reviews: a design slot until real ones exist. Labelled on screen.
const EXAMPLE_REVIEWS = [
  ["First app that didn't hand me another to-do list. It told me what could wait.", "Maya, 34"],
  ["I was stuck on whether to change careers. The small tests made it obvious in two weeks.", "Daniel, 31"],
  ["Sunday check-ins are the only planning I actually stick to.", "Priya, 41"],
];
// Real replies our coach model gave to test requests (scripts/coach_tests.json)
const REAL_REPLIES = [
  ["nora", "Had a fight with my sister about who takes care of our dad and I said things I regret", "Hi Alex, I'm Nora. You're dealing with a tough situation after a fight with your sister about your dad's care. What's the first step you think you could take to start talking to her again?"],
  ["ines", "4 years at the same job, I'm bored and can't tell if I should quit or study something new", "Hi Alex, I'm Ines. You're feeling stuck after 4 years at the same job. What's the first step you'd take if you decided to study something new?"],
  ["max", "My manager criticised my work in front of the whole team today", "Hi Alex, I'm Max. You were criticised by your manager in front of the team, which is tough. What's the first thing you want to say to your manager when you talk it out?"],
];
const FAQ = [
  ["Is this therapy?", "No. Your coach is an AI that helps with everyday decisions, habits and plans. If you're in crisis, it points you to real help lines."],
  ["What happens to my chats?", "They're private to you, used only to make your coach remember, and never used for ads. You can delete them any time."],
  ["Can I switch coach?", "Yes, any time, in one tap. Your history moves with you."],
  ["How do I cancel?", "In your account, two taps. We email you 3 days before every renewal."],
];
function Paywall({ s, returning, router, onPaid }) {
  const model = useFeatureValue("paywall-model", "weekly");
  const c = COACHES[s.coachId] || COACHES.theo;
  const plan = s.plan;
  const cfg = returning ? { default: DOWNSELL.id, plans: [DOWNSELL] } : PAYWALLS[model] || PAYWALLS.weekly;
  const [sel, setSel] = useState(cfg.default);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(null);
  const [open, setOpen] = useState(-1);
  const plansRef = useRef(null);

  useEffect(() => {
    let dl = Number(localStorage.getItem("dw_offer_deadline"));
    if (!dl) { dl = Date.now() + OFFER_MINUTES * 60e3; localStorage.setItem("dw_offer_deadline", String(dl)); }
    const tick = () => setLeft(Math.max(0, dl - Date.now()));
    tick(); const t = setInterval(tick, 1000);
    track(returning ? "downsell_viewed" : "paywall_viewed", { paywall_model: returning ? "downsell" : model });
    return () => clearInterval(t);
  }, []);
  const intro = returning || (left === null || left > 0);
  useEffect(() => { if (left === 0 && !returning) track("paywall_timer_expired"); }, [left === 0]);
  const p = cfg.plans.find((x) => x.id === sel) || cfg.plans[0];
  const today = p.trialDays ? 0 : intro ? p.price : p.full;
  const mm = left === null ? "10:00" : `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
  const code = `${(s.name || "QUIET").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8)}_${new Date().toLocaleDateString("en-US", { month: "short" }).toUpperCase()}`;
  const terms = p.trialDays
    ? `$0 today. Your free trial ends on ${renewalDate(p.trialDays)}, then ${money(p.full)} per year until you cancel. We'll remind you 3 days before.`
    : `${money(today)} today for your first ${p.count > 1 ? `${p.count} ${p.interval}s` : p.interval}. Then ${money(p.full)} every ${p.count > 1 ? `${p.count} ${p.interval}s` : p.interval}, starting ${renewalDate(p.days)}, until you cancel. We'll remind you 3 days before.`;

  const checkout = async () => {
    setBusy(true);
    track("checkout_started", { plan: p.id, price: today, paywall_model: returning ? "downsell" : model, intro });
    const r = await post("/api/checkout", { kind: "plan", id: p.id, intro, uid: getKnownUserId(true), did: getDeviceId(), paywall_model: returning ? "downsell" : model, exp: getExperiments() }).catch(() => ({}));
    if (r.url) { onPaid(); window.location.href = r.url; } else setBusy(false);
  };
  const scrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  const chatProof = (s.history || []).filter((m) => m.role === "assistant").slice(-1)[0];

  return (
    <div className="app dark">
      {!returning && (
        <div className="timerbar">
          {intro ? <div><small>Intro price held for</small><span className="t">{mm}</span></div> : <div><small>Intro price</small><span className="t" style={{ fontSize: 15 }}>expired</span></div>}
          <button onClick={scrollToPlans}>Get my plan</button>
        </div>)}
      <main className="screen" style={{ gap: 16 }}>
        <h2>{returning ? `Welcome back${s.name ? `, ${s.name}` : ""}. ` : s.name ? `${s.name}, your` : "Your"} {returning ? "Your plan is still here" : "plan to"} <span className="ap">{returning ? "" : plan?.goal || "move forward"}</span>{returning ? "." : " is ready"}</h2>
        {plan && (
          <div className="ba"><div className="b"><div className="note">Now</div>{plan.now}</div><div className="a"><div className="note">With {c.name}</div>{plan.soon}</div></div>)}
        {plan?.next_step && <div className="panel" style={{ display: "flex", gap: 12, alignItems: "center" }}><CoachAvatar id={s.coachId} size={40} /><div style={{ fontSize: 14 }}><div className="note" style={{ marginBottom: 3 }}>First step</div>{plan.next_step.title}</div></div>}

        {!returning && (
          <div className={`promo ${intro ? "" : "off"}`}>🎁 <span>{intro ? <>Promo code <b>{code}</b> applied: intro price on your first period</> : "Your intro price has expired"}</span></div>)}
        {returning && <div className="promo">🎁 <span>A lower price for coming back: <b>{money(DOWNSELL.price)}</b> for your first 4 weeks</span></div>}

        <div className="plans" ref={plansRef}>
          {cfg.plans.map((x) => {
            const now = x.trialDays ? 0 : intro ? x.price : x.full;
            const pd = x.trialDays ? perDay(x) : now / x.days;
            return (
              <button key={x.id} className={`plan ${sel === x.id ? "sel" : ""}`} onClick={() => { setSel(x.id); track("plan_selected", { plan: x.id, paywall_model: model }); }}>
                {x.popular && !returning && <span className="badge">MOST POPULAR</span>}
                <span className="radio" />
                <span><div className="nm">{x.name}</div>
                  <div className="pr">{x.trialDays ? <>$0 today, then {money(x.full)}/yr</> : <>{intro && x.full > x.price && <s>{money(x.full)}</s>}{money(now)}</>}</div></span>
                <span className="pd"><b>{money(pd).replace("$", "$")}</b><small>per day</small></span>
              </button>);
          })}
        </div>
        <button className="btn" disabled={busy} onClick={checkout}>{busy ? "Opening secure checkout…" : p.trialDays ? "Start my 7 free days" : `Get my plan`}</button>
        <p className="terms">{terms}</p>
        <div className="pay">{["visa", "mastercard", "amex", "applepay", "googlepay"].map((k) => <img key={k} src={`/pay/${k}.svg`} alt={{ visa: "Visa", mastercard: "Mastercard", amex: "American Express", applepay: "Apple Pay", googlepay: "Google Pay" }[k]} height={26} />)}</div>
        <p className="terms" style={{ marginTop: -8 }}>🔒 Secure payment by Stripe</p>

        <div className="section-title">What you get</div>
        <div className="hl">
          <div><b>{c.name}, any time</b>Text or voice, day or night.</div>
          <div><b>Remembers you</b>Never explain your situation twice.</div>
          <div><b>Steps, not lists</b>Big goals cut into what fits today.</div>
          <div><b>Ideas that work</b>Methods from well-known books, applied to you.</div>
          <div><b>Check-ins</b>{s.general?.sunday_checkin === "yes" ? "Sunday evenings, as you asked." : "When you want them, never spammy."}</div>
          <div><b>Plan that adapts</b>Changes when your week does.</div>
        </div>
        {plan?.days && (
          <div className="mock"><b>Your week in the app</b>{plan.days.slice(0, 3).map((d, i) => <div className="row" key={i}><span>{d.task}</span><span style={{ color: "var(--muted)" }}>{d.day}</span></div>)}</div>)}
        {chatProof && (
          <div className="panel" style={{ fontSize: 14, lineHeight: 1.45 }}><div className="note" style={{ marginBottom: 6 }}>From your chat with {c.name}</div>“{chatProof.content}”</div>)}
        <div className="section-title">How the coaches answer</div>
        <p className="terms" style={{ textAlign: "left", marginTop: -8 }}>Real replies from our AI coaches to test requests.</p>
        <div className="replies">{REAL_REPLIES.map(([id, q, a]) => (
          <div className="rcard" key={id}><div className="bub me">{q}</div>
            <div className="rrow"><CoachAvatar id={id} size={30} /><div className="bub">{a}</div></div></div>))}</div>
        <div className="section-title" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>What people say <span className="stars">★★★★★ 4.8</span></div>
        <p className="terms" style={{ textAlign: "left", marginTop: -8 }}>Example reviews, shown for design.</p>
        <div className="reviews">{EXAMPLE_REVIEWS.map(([t, w]) => <div className="review" key={w}><span className="stars">★★★★★</span><p>“{t}”</p><b>{w}</b></div>)}</div>
        <div className="guar"><b>30-day money-back guarantee.</b> If you don't find it useful, email us within 30 days and we'll refund you in full.</div>
        <div className="section-title">Questions</div>
        <div className="faq">{FAQ.map(([q, a], i) => <div key={q}><button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><span>{open === i ? "–" : "+"}</span></button>{open === i && <p>{a}</p>}</div>)}</div>
        <button className="btn" onClick={scrollToPlans}>Get my plan</button>
        <p className="terms">{c.name} is an AI coach, not a therapist or medical service. Subscriptions renew automatically until cancelled. <a href="/subscription" style={{ color: "inherit" }}>Manage or cancel</a>.</p>
      </main>
      <Legal />
    </div>
  );
}
