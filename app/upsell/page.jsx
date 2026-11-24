"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { UPSELLS, ALL_PLANS } from "../../lib/funnel";
import { track } from "../../lib/analytics";

function Upsell() {
  const router = useRouter();
  const q = useSearchParams();
  const variant = useFeatureValue("upsell-offer", "single");
  const offer = UPSELLS[variant] || UPSELLS.single;
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    // Purchase coming back from Stripe Checkout (test mode). In production this is confirmed by a Stripe webhook, not the browser.
    if (q.get("session_id") && !sessionStorage.getItem("tracked_" + q.get("session_id"))) {
      const p = ALL_PLANS.find((x) => x.id === q.get("plan"));
      track("purchase_completed", { plan: p?.id, revenue: p?.trialDays ? 0 : p?.price, mode: "stripe_test" });
      sessionStorage.setItem("tracked_" + q.get("session_id"), "1");
    }
    track("upsell_viewed", { offer: offer.id, variant });
  }, []);

  const accept = async () => {
    track("upsell_checkout_started", { offer: offer.id, price: offer.price, variant });
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "upsell", id: variant }) }).then((x) => x.json()).catch(() => ({ demo: true }));
    if (r.url) window.location.href = r.url; else setDemo(true);
  };

  return (
    <main className="screen">
      <span className="label">PAYMENT SUCCESSFUL · ONE MORE THING</span>
      <h2>{offer.title}</h2>
      <ul className="ticks">{offer.items.map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="price">${offer.price.toFixed(2)} {offer.was && <s>${offer.was.toFixed(2)}</s>} <small>one-time</small></p>
      {!demo ? <button className="btn" onClick={accept}>Add to my plan</button> : (
        <div className="card test"><b>Test checkout</b><p className="fine">Simulated one-time payment, no card details collected.</p>
          <button className="btn" onClick={() => { track("upsell_purchased", { offer: offer.id, revenue: offer.price, variant, mode: "demo" }); router.push("/done"); }}>Simulate payment of ${offer.price.toFixed(2)}</button></div>
      )}
      <button className="link" onClick={() => { track("upsell_declined", { offer: offer.id, variant }); router.push("/done"); }}>No thanks, continue to my plan</button>
    </main>
  );
}

export default function Page() { return <Suspense><Upsell /></Suspense>; }
