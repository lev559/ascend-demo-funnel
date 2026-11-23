"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { UPSELLS } from "../../lib/funnel";
import { track } from "../../lib/analytics";

function Done() {
  const q = useSearchParams();
  useEffect(() => {
    const sid = q.get("session_id");
    if (sid && q.get("upsell") && !sessionStorage.getItem("tracked_" + sid)) {
      const o = UPSELLS[q.get("upsell")];
      track("upsell_purchased", { offer: o?.id, revenue: o?.price, variant: q.get("upsell"), mode: "stripe_test" });
      sessionStorage.setItem("tracked_" + sid, "1");
    }
    track("onboarding_reached");
  }, []);
  return (
    <main className="wrap center">
      <h2>You're all set</h2>
      <p className="lead">In the real product this is where the app download and the first coaching session would start.</p>
      <p className="fine">This funnel is a portfolio demo. Nothing was charged.</p>
    </main>
  );
}
export default function Page() { return <Suspense><Done /></Suspense>; }
