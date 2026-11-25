// Best-effort abuse guard for the AI routes (server only). Limits per IP and a daily ceiling per server instance.
// When a limit is hit the routes answer with their written fallbacks, so the funnel keeps working and no model call is made.
// In production this would live in a shared store (Vercel KV / Upstash) or a firewall rule; in-memory is enough for a demo.
const PER_IP_HOUR = 40;
const DAILY_CAP = 800;
const hits = new Map();
let day = { key: '', count: 0 };

export function allowModelCall(req) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (day.key !== today) day = { key: today, count: 0 };
  if (day.count >= DAILY_CAP) return { ok: false, reason: 'daily cap' };
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const h = hits.get(ip);
  if (!h || now > h.reset) hits.set(ip, { count: 1, reset: now + 3600e3 });
  else if (h.count >= PER_IP_HOUR) return { ok: false, reason: 'rate limit' };
  else h.count += 1;
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  day.count += 1;
  return { ok: true };
}
