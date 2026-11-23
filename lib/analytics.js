"use client";
// One place for all tracking: Mixpanel (if a token is set), GTM dataLayer (for Meta Pixel / GA4), console in demo mode.
import mixpanel from "mixpanel-browser";

let mpReady = false;

export function getUserId() {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem("ascend_uid");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("ascend_uid", id); }
    return id;
  } catch { return "anon"; }
}

export function initAnalytics(userId, superProps) {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (token && !mpReady) {
    mixpanel.init(token, { api_host: process.env.NEXT_PUBLIC_MIXPANEL_API_HOST || undefined, persistence: "localStorage", track_pageview: false });
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
