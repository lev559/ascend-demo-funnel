"use client";
// One place for all client tracking: Mixpanel (if a token is set), GTM dataLayer (for Meta Pixel / GA4), console in demo mode.
// Identity follows Mixpanel's Simplified ID Merge: the SDK keeps an anonymous $device_id until the email step,
// then identify(user_id) joins everything before and after (and the app later calls identify with the same id).
// Event names and properties are specified in analytics/tracking_plan.json.
import mixpanel from "mixpanel-browser";
import { PUBLIC } from "./config";

export const FUNNEL_VERSION = "v3";
let mpReady = false;

// Stable anonymous id for experiment bucketing (GrowthBook). Not the Mixpanel distinct_id.
export function getUserId() {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem("quietly_uid");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("quietly_uid", id); }
    return id;
  } catch { return "anon"; }
}

// Known user id, created once at the email step and reused by Stripe metadata and the app
export function getKnownUserId(create = false) {
  try {
    let id = localStorage.getItem("quietly_user_id");
    if (!id && create) { id = "u_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12); localStorage.setItem("quietly_user_id", id); }
    return id;
  } catch { return null; }
}

export function getDeviceId() {
  try { return mpReady ? mixpanel.get_property("$device_id") : null; } catch { return null; }
}

export function channelOf(source = "") {
  const s = source.toLowerCase();
  if (/facebook|fb|meta|instagram|ig/.test(s)) return "meta";
  if (/tiktok/.test(s)) return "tiktok";
  if (/google|adwords|gads/.test(s)) return "google";
  if (!s || s === "direct") return "organic";
  return "referral";
}

// fresh = "Start fresh" link (/?fresh=1): forget the known user before anything is tracked,
// so experiment exposures and the funnel land on the same new anonymous id
export function initAnalytics(superProps, { fresh = false } = {}) {
  const token = PUBLIC.mixpanelToken;
  if (fresh) { try { localStorage.removeItem("quietly_user_id"); } catch {} }
  if (token && !mpReady) {
    mixpanel.init(token, { api_host: PUBLIC.mixpanelHost, persistence: "localStorage", track_pageview: false });
    if (fresh) mixpanel.reset();
    mixpanel.register({ platform: "web", funnel_version: FUNNEL_VERSION, ...superProps });
    const known = getKnownUserId();
    if (known) mixpanel.identify(known);
    mpReady = true;
  }
}

// Experiment assignment as a super property (exp_quiz_length = "long"), so every event can be split by variant
export function setExperiment(key, value) {
  const prop = "exp_" + key.replace(/-/g, "_");
  if (mpReady) mixpanel.register({ [prop]: String(value) });
  try { const all = JSON.parse(sessionStorage.getItem("dw_exp") || "{}"); all[prop] = String(value); sessionStorage.setItem("dw_exp", JSON.stringify(all)); } catch {}
}
export function getExperiments() {
  try { return JSON.parse(sessionStorage.getItem("dw_exp") || "{}"); } catch { return {}; }
}

// Called right after email_submitted. Profile holds no email or name: this build has no messaging tool to need them.
export function identifyUser(profile = {}) {
  const id = getKnownUserId(true);
  if (!mpReady || !id) return id;
  mixpanel.identify(id);
  const sp = (k) => mixpanel.get_property(k);
  mixpanel.people.set_once({ first_seen: new Date().toISOString().slice(0, 10), acquisition_channel: sp("channel"), first_angle: sp("angle") });
  mixpanel.people.set({ ...profile, subscription_status: "none" });
  return id;
}

export function track(event, props = {}) {
  if (typeof window === "undefined") return;
  if (mpReady) mixpanel.track(event, props);
  (window.dataLayer = window.dataLayer || []).push({ event, ...props });
  if (!mpReady) console.info("[track]", event, props);
}
