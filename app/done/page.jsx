"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { COACHES } from "../../lib/coaches";
import { track } from "../../lib/analytics";
import { CoachAvatar } from "../art";

function Done() {
  const q = useSearchParams();
  const [st, setSt] = useState({});
  useEffect(() => {
    try { setSt(JSON.parse(localStorage.getItem("dw_state") || "{}")); } catch {}
    // upsell_purchased is sent by the Stripe webhook (server), not from here
    track("onboarding_reached");
  }, []);
  const c = COACHES[st.coachId] || COACHES.theo;
  return (
    <div className="app dark"><main className="screen" style={{ textAlign: "center", alignItems: "center", justifyContent: "center" }}>
      <CoachAvatar id={st.coachId || "theo"} size={84} />
      <h1>You're all set{st.name ? `, ${st.name}` : ""}.</h1>
      <p className="sub">{c.name} has your plan and remembers your chat. Get the app and pick up where you left off.</p>
      {st.plan?.next_step && <div className="tonight" style={{ textAlign: "left", width: "100%" }}><div className="note">First step</div><h3 style={{ marginTop: 4 }}>{st.plan.next_step.title}</h3></div>}
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <a className="btn" href="#" onClick={(e) => { e.preventDefault(); track("app_download_clicked", { store: "ios" }); }}>App Store</a>
        <a className="btn ghost" href="#" onClick={(e) => { e.preventDefault(); track("app_download_clicked", { store: "android" }); }}>Google Play</a>
      </div>
      <p className="fine">Sign in with {st.email || "your email"}.</p>
    </main></div>
  );
}
export default function Page() { return <Suspense><Done /></Suspense>; }
