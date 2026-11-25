"use client";
// One place for all tracking: Mixpanel (if a token is set), GTM dataLayer (for Meta Pixel / GA4), console in demo mode.
import mixpanel from "mixpanel-browser";
import { PUBLIC } from "./config";

let mpReady = false;

export function getUserId() {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem("quietly_uid");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("quietly_uid", id); }
    return id;
  } catch { return "anon"; }
}

export function initAnalytics(userId, superProps) {
  const token = PUBLIC.mixpanelToken;
  if (token && !mpReady) {
    mixpanel.init(token, { api_host: PUBLIC.mixpanelHost, persistence: "localStorage", track_pageview: false });
    mixpanel.identify(userId);
    mixpanel.register(superProps);
    mpReady = true;
  }
}

export function track(event, props = {}) {
  if (typeof window === "undefined") return;
  if (mpReady) mixpanel.track(event, props);
  (window.dataLayer = window.dataLayer || []).push({ event, ...props });
  if (!mpReady) console.info("[track]", event, props);
}
