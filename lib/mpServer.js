// Server-side events to Mixpanel (Stripe webhook, safety flags). Server events are the source of truth for money:
// they can't be blocked by ad blockers, lost on a closed tab or duplicated by a page reload.
// Idempotent: $insert_id is derived from the Stripe event id, so a webhook retry never double counts.
import { PUBLIC } from "./config";

const HOST = PUBLIC.mixpanelHost;
const TOKEN = process.env.MIXPANEL_TOKEN || PUBLIC.mixpanelToken;
export const FUNNEL_VERSION = "v3";

// who: { userId, deviceId } from Stripe metadata or the request body
function ids({ userId, deviceId } = {}) {
  const out = {};
  if (deviceId) out.$device_id = String(deviceId).slice(0, 64);
  if (userId) { out.$user_id = String(userId).slice(0, 64); out.distinct_id = out.$user_id; }
  else if (deviceId) out.distinct_id = `$device:${out.$device_id}`;
  return out;
}

export async function serverTrack(event, who, props = {}, insertId) {
  const id = ids(who);
  if (!TOKEN || !id.distinct_id) return false;
  const body = [{ event, properties: { token: TOKEN, time: Date.now(), platform: "server", funnel_version: FUNNEL_VERSION, ip: 0,
    ...(insertId ? { $insert_id: String(insertId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 36) } : {}), ...id, ...props } }];
  try {
    const r = await fetch(`${HOST}/track?ip=0`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/plain" }, body: JSON.stringify(body) });
    return r.ok;
  } catch { return false; }
}

// Profile update: $set for state (plan, status), $add for counters (ltv_usd, periods_paid)
export async function serverProfile(userId, { set, add } = {}) {
  if (!TOKEN || !userId) return false;
  const ops = [];
  if (set) ops.push({ $token: TOKEN, $distinct_id: userId, $ip: "0", $set: set });
  if (add) ops.push({ $token: TOKEN, $distinct_id: userId, $ip: "0", $add: add });
  try {
    const r = await fetch(`${HOST}/engage?ip=0`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/plain" }, body: JSON.stringify(ops) });
    return r.ok;
  } catch { return false; }
}
