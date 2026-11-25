"use client";
import { useEffect, useMemo, useState } from "react";
import { GrowthBook, GrowthBookProvider } from "@growthbook/growthbook-react";
import { OFFLINE_FEATURES, ANGLES } from "../lib/funnel";
import { getUserId, initAnalytics, track, setExperiment, channelOf } from "../lib/analytics";
import { PUBLIC } from "../lib/config";

function readAngle() {
  const p = new URLSearchParams(window.location.search);
  const a = p.get("angle") || p.get("utm_content");
  if (a && ANGLES[a]) { sessionStorage.setItem("quietly_angle", a); return a; }
  return sessionStorage.getItem("quietly_angle") || "default";
}

export default function Providers({ children }) {
  const [ready, setReady] = useState(false);
  const gb = useMemo(() => {
    const key = PUBLIC.growthbookKey;
    return new GrowthBook({
      apiHost: PUBLIC.growthbookHost,
      clientKey: key || undefined,
      features: key ? undefined : OFFLINE_FEATURES,
      // Exposure event in the format GrowthBook's Mixpanel data source expects
      trackingCallback: (experiment, result) => {
        setExperiment(experiment.key, result.value);
        track("$experiment_started", { "Experiment name": experiment.key, "Variant name": result.variationId, variation_value: result.value, $source: "growthbook", assignment: "test" });
      },
    });
  }, []);

  useEffect(() => {
    const id = getUserId();
    const angle = readAngle();
    try { if (new URLSearchParams(window.location.search).get("case") === "open") sessionStorage.setItem("dw_case", "open"); } catch {}
    const p = new URLSearchParams(window.location.search);
    const utm = { utm_source: p.get("utm_source") || "direct", utm_medium: p.get("utm_medium") || "none", utm_campaign: p.get("utm_campaign") || "none", utm_content: p.get("utm_content") || angle };
    initAnalytics({ angle, ...utm, channel: channelOf(p.get("utm_source") || "") }, { fresh: p.has("fresh") });
    gb.setAttributes({ id, angle, ...utm });
    const done = () => setReady(true);
    // Live mode: features come from GrowthBook. Any experiment not (yet) set up there, or a timeout,
    // falls back to the same split assigned locally, so the funnel never loses an experiment.
    const fillMissing = () => {
      const live = gb.getFeatures() || {};
      const missing = Object.fromEntries(Object.entries(OFFLINE_FEATURES).filter(([k]) => !live[k]));
      if (Object.keys(missing).length) gb.setFeatures({ ...live, ...missing });
    };
    if (PUBLIC.growthbookKey) gb.init({ timeout: 2000 }).then(fillMissing, fillMissing).finally(done);
    else done();
  }, [gb]);

  return <GrowthBookProvider growthbook={gb}>{ready ? children : <div className="wrap"><div className="spinner" /></div>}</GrowthBookProvider>;
}
