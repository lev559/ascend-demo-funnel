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
    <main className="screen night center">
      <h1>You're all set.</h1>
      <p className="lead">In the real product this is where you download the app and your coach picks up the conversation where you left it.</p>
      <p className="fine">This funnel is a portfolio demo. Nothing was charged.</p>
    </main>
  );
}
export default function Page() { return <Suspense><Done /></Suspense>; }
