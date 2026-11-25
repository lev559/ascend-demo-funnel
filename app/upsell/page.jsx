"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { UPSELLS, ALL_PLANS, money } from "../../lib/funnel";
import { track } from "../../lib/analytics";

function Upsell() {
  const router = useRouter();
  const q = useSearchParams();
  const variant = useFeatureValue("upsell-offer", "single");
  const offer = UPSELLS[variant] || UPSELLS.single;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Purchase coming back from Stripe Checkout. In production this is confirmed by a Stripe webhook, not the browser.
    const sid = q.get("session_id");
    if (sid && !sessionStorage.getItem("tracked_" + sid)) {
      const p = ALL_PLANS.find((x) => x.id === q.get("plan"));
      const intro = q.get("intro") === "1";
      track("purchase_completed", { plan: p?.id, revenue: p?.trialDays ? 0 : intro ? p?.price : p?.full, currency: "USD", trial: Boolean(p?.trialDays), intro });
      sessionStorage.setItem("tracked_" + sid, "1");
      try { const st = JSON.parse(localStorage.getItem("dw_state") || "{}"); localStorage.setItem("dw_state", JSON.stringify({ ...st, paid: true })); } catch {}
    }
    track("upsell_viewed", { offer: offer.id, variant });
  }, []);

  const accept = async () => {
    setBusy(true);
    track("upsell_checkout_started", { offer: offer.id, price: offer.price, variant });
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "upsell", id: variant }) }).then((x) => x.json()).catch(() => ({}));
    if (r.url) window.location.href = r.url; else setBusy(false);
  };

  return (
    <div className="app dark"><main className="screen">
      <div className="note">Payment successful · one more thing</div>
      <h2>{offer.title}</h2>
      <ul className="panel deal">{offer.items.map((x) => <li key={x}>{x}</li>)}</ul>
      <h2 className="ap">{money(offer.price)} {offer.was && <s style={{ color: "rgba(255,255,255,.4)", fontSize: 18 }}>{money(offer.was)}</s>} <span style={{ fontSize: 14, color: "rgba(255,255,255,.6)" }}>one-time</span></h2>
      <div className="spacer" />
      <button className="btn" disabled={busy} onClick={accept}>{busy ? "Opening checkout…" : "Add to my plan"}</button>
      <button className="btn ghost" onClick={() => { track("upsell_declined", { offer: offer.id, variant }); router.push("/done"); }}>No thanks</button>
    </main></div>
  );
}
export default function Page() { return <Suspense><Upsell /></Suspense>; }
