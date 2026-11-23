"use client";
import { useEffect, useMemo, useState } from "react";
import { GrowthBook, GrowthBookProvider } from "@growthbook/growthbook-react";
import { OFFLINE_FEATURES, ANGLES } from "../lib/funnel";
import { getUserId, initAnalytics, track } from "../lib/analytics";

function readAngle() {
  const p = new URLSearchParams(window.location.search);
  const a = p.get("angle") || p.get("utm_content");
  if (a && ANGLES[a]) { sessionStorage.setItem("ascend_angle", a); return a; }
  return sessionStorage.getItem("ascend_angle") || "default";
}

export default function Providers({ children }) {
  const [ready, setReady] = useState(false);
  const gb = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY;
    return new GrowthBook({
      apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || "https://cdn.growthbook.io",
      clientKey: key || undefined,
      features: key ? undefined : OFFLINE_FEATURES,
      // Exposure event in the format GrowthBook's Mixpanel data source expects
      trackingCallback: (experiment, result) => {
        track("$experiment_started", { "Experiment name": experiment.key, "Variant name": result.variationId, variation_value: result.value, $source: "growthbook" });
      },
    });
  }, []);

  useEffect(() => {
    const id = getUserId();
    const angle = readAngle();
    const p = new URLSearchParams(window.location.search);
    const utm = { utm_source: p.get("utm_source") || "direct", utm_campaign: p.get("utm_campaign") || "none" };
    initAnalytics(id, { angle, ...utm });
    gb.setAttributes({ id, angle, ...utm });
    const done = () => setReady(true);
    if (process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY) gb.init({ timeout: 2000 }).finally(done);
    else done();
  }, [gb]);

  return <GrowthBookProvider growthbook={gb}>{ready ? children : <div className="wrap"><div className="spinner" /></div>}</GrowthBookProvider>;
}
