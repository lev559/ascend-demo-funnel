import { NextResponse } from 'next/server';
import { allowModelCall } from '../../../../lib/ratelimit';
import { callLLM, parseJSON, hasLLM, reason as why } from '../../../../lib/llm';
import { planPrompt } from '../../../../lib/coachPrompt';
import { fallbackPlan } from '../../../../lib/fallbacks';
import { BANNED, isCrisis } from '../../../../lib/safety';

const s = (v, n) => String(v || '').trim().slice(0, n);

// POST { ctx, coachId, history, days: ['Wed', ...7] } -> plan JSON + mode
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const ctx = body.ctx || {};
  const days = Array.isArray(body.days) && body.days.length === 7 ? body.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const fb = () => fallbackPlan(ctx.reason, days, body.coachId);
  const risky = isCrisis(ctx.text) || history.some((m) => m.role === 'user' && isCrisis(m.content));
  if (risky || !hasLLM()) return NextResponse.json({ ...fb(), mode: 'fallback', reason: risky ? 'risk' : 'no key' });
  const gate = allowModelCall(req);
  if (!gate.ok) return NextResponse.json({ ...fb(), mode: 'fallback', reason: gate.reason });
  try {
    const p = parseJSON(await callLLM(planPrompt(ctx, body.coachId, history, days), { maxTokens: 900, timeout: 20000, temperature: 0.5 }));
    const plan = {
      profile: s(p.profile, 40), insight: s(p.insight, 220),
      next_step: { title: s(p.next_step?.title, 80), detail: s(p.next_step?.detail, 200), when: s(p.next_step?.when, 20) || 'This week' },
      technique: { name: s(p.technique?.name, 60), source: s(p.technique?.source, 90), how: s(p.technique?.how, 260) },
      days: (p.days || []).slice(0, 5).map((d) => ({ day: s(d.day, 4), task: s(d.task, 120) })).filter((d) => d.day && d.task),
      deal: (p.deal || []).slice(0, 4).map((x) => s(x, 80)).filter(Boolean),
      now: s(p.now, 120), soon: s(p.soon, 140), goal: s(p.goal, 50),
    };
    if (!plan.insight || !plan.next_step.title || plan.days.length < 4 || plan.deal.length < 3 || BANNED.test(JSON.stringify(plan))) throw new Error('bad shape');
    return NextResponse.json({ ...plan, mode: 'llm' });
  } catch (e) {
    return NextResponse.json({ ...fb(), mode: 'fallback', reason: why(e) });
  }
}
