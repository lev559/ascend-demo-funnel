"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { ANGLES, STEPS, PLANS, roadmap } from "../lib/funnel";
import { track } from "../lib/analytics";

const load = (k, d) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } };

export default function Funnel() {
  const router = useRouter();
  const [stage, setStage] = useState("landing"); // landing | quiz | building | paywall | checkout
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("4w");
  const [progress, setProgress] = useState(0);
  const angle = typeof window !== "undefined" ? sessionStorage.getItem("ascend_angle") || "default" : "default";
  const hero = ANGLES[angle] || ANGLES.default;

  useEffect(() => { setAnswers(load("ascend_answers", {})); track("landing_viewed", { angle }); }, []);
  useEffect(() => { sessionStorage.setItem("ascend_answers", JSON.stringify(answers)); }, [answers]);

  const step = STEPS[i];
  const next = (patch = {}) => {
    const a = { ...answers, ...patch };
    setAnswers(a);
    track("quiz_step_completed", { step: i + 1, step_id: step.id, answer: patch[step.id] ?? null });
    if (i + 1 < STEPS.length) setI(i + 1);
    else build();
  };

  const build = () => {
    setStage("building");
    let p = 0;
    const t = setInterval(() => { p += 4; setProgress(p); if (p >= 100) { clearInterval(t); setStage("paywall"); } }, 90);
  };

  if (stage === "landing") return (
    <main className="wrap">
      <p className="eyebrow">Ascend · AI coach</p>
      <h1>{hero.title}</h1>
      <p className="lead">{hero.sub}</p>
      <button className="btn" onClick={() => { track("quiz_started", { angle }); setStage("quiz"); }}>Start the 1-minute quiz</button>
      <p className="fine">No account needed to see your plan.</p>
    </main>
  );

  if (stage === "quiz") return (
    <main className="wrap">
      <div className="bar"><div style={{ width: `${(i / STEPS.length) * 100}%` }} /></div>
      <p className="eyebrow">Step {i + 1} of {STEPS.length}</p>
      <h2>{step.q}</h2>
      {step.type === "single" && step.options.map((o) => (
        <button key={o} className="opt" onClick={() => next({ [step.id]: o })}>{o}</button>
      ))}
      {step.type === "info" && (<>
        <ul className="ticks">{step.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        <button className="btn" onClick={() => next()}>Continue</button>
      </>)}
      {step.type === "email" && (<form onSubmit={(e) => { e.preventDefault(); track("email_submitted", { step: i + 1 }); next({ email_given: true }); }}>
        <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="fine">Demo: the address is not stored or sent anywhere.</p>
        <button className="btn" type="submit">Show my plan</button>
      </form>)}
      {i > 0 && <button className="back" onClick={() => setI(i - 1)}>← Back</button>}
    </main>
  );

  if (stage === "building") return (
    <main className="wrap center">
      <h2>Building your 4-week plan…</h2>
      <div className="bar big"><div style={{ width: `${progress}%` }} /></div>
      <p className="lead">Matching it to: {answers.goal || "your goal"} · {answers.time || "10 minutes"} a day · {(answers.style || "").toLowerCase()}</p>
    </main>
  );

  return <Paywall answers={answers} plan={plan} setPlan={setPlan} router={router} />;
}

function Paywall({ answers, plan, setPlan, router }) {
  const layout = useFeatureValue("paywall-layout", "control");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  useEffect(() => { track("paywall_viewed", { layout }); }, [layout]);
  const sel = PLANS.find((p) => p.id === plan);

  const checkout = async () => {
    setBusy(true);
    track("checkout_started", { plan: sel.id, price: sel.price, layout });
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "plan", id: sel.id }) }).then((x) => x.json()).catch(() => ({ demo: true }));
    if (r.url) window.location.href = r.url; else { setDemo(true); setBusy(false); }
  };

  const payDemo = () => {
    track("purchase_completed", { plan: sel.id, revenue: sel.price, layout, mode: "demo" });
    router.push(`/upsell?plan=${sel.id}`);
  };

  return (
    <main className="wrap">
      {layout === "plan_preview" ? (<>
        <p className="eyebrow">Your plan is ready</p>
        <h2>Your 4 weeks to {(answers.goal || "your goal").toLowerCase()}</h2>
        <div className="card road">{roadmap(answers).map((r) => <div key={r.w}><b>{r.w}</b><span>{r.t}</span></div>)}</div>
        <p className="lead">Coaching style: {(answers.style || "supportive").toLowerCase()}. Daily check-in: {answers.time || "10 minutes"}.</p>
      </>) : (<>
        <p className="eyebrow">Your plan is ready</p>
        <h2>Choose your plan</h2>
      </>)}
      {PLANS.map((p) => (
        <label key={p.id} className={`plan ${plan === p.id ? "on" : ""}`} onClick={() => { setPlan(p.id); track("plan_selected", { plan: p.id }); }}>
          {p.popular && <span className="tag">Most popular</span>}
          <div><b>{p.name}</b><small>${p.price.toFixed(2)} · {p.note}</small></div>
          <div className="pd">${p.perDay.toFixed(2)}<small>per day</small></div>
        </label>
      ))}
      {!demo ? (
        <button className="btn" disabled={busy} onClick={checkout}>{busy ? "Opening checkout…" : "Get my plan"}</button>
      ) : (
        <div className="card test">
          <b>Test checkout</b>
          <p className="fine">Stripe isn't connected, so this simulates a successful payment. No card details are collected.</p>
          <button className="btn" onClick={payDemo}>Simulate payment of ${sel.price.toFixed(2)}</button>
        </div>
      )}
      <p className="fine">You'll be charged ${sel.price.toFixed(2)} today, {sel.note}. Cancel anytime in account settings before renewal.</p>
    </main>
  );
}
