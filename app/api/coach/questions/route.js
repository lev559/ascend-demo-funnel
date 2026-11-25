import { NextResponse } from 'next/server';
import { callLLM, parseJSON, hasLLM, reason as why } from '../../../../lib/llm';
import { questionsPrompt } from '../../../../lib/coachPrompt';
import { fallbackQuestions } from '../../../../lib/fallbacks';
import { isCrisis, CRISIS_REPLY, BANNED } from '../../../../lib/safety';

// POST { ctx: {reason, text, general}, n } -> { reflection, questions[], mode }
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const ctx = body.ctx || {};
  const n = Math.min(Math.max(Number(body.n) || 3, 1), 5);
  if (isCrisis(ctx.text)) return NextResponse.json({ crisis: true, text: CRISIS_REPLY });
  const fb = () => fallbackQuestions(ctx.reason, ctx.text, n);
  if (!hasLLM()) return NextResponse.json({ ...fb(), mode: 'fallback', reason: 'no key' });
  try {
    const out = parseJSON(await callLLM(questionsPrompt(ctx, n), { maxTokens: 760, timeout: 9000, temperature: 0.5 }));
    if (out.risk === true) return NextResponse.json({ crisis: true, text: CRISIS_REPLY, mode: 'model_flag' });
    const qs = (out.questions || []).filter((q) => q && q.q && Array.isArray(q.options) && q.options.length >= 3)
      .slice(0, n).map((q) => ({ q: String(q.q).slice(0, 120), label: String(q.label || '').slice(0, 30), options: q.options.slice(0, 4).map((o) => ({ label: String(o.label || o).slice(0, 40), sub: String(o.sub || '').slice(0, 60) })) }));
    const r = out.reflection || {};
    const all = JSON.stringify({ qs, r });
    if (qs.length < n || !r.headline || BANNED.test(all)) throw new Error('bad shape');
    return NextResponse.json({ reflection: { quote: String(r.quote || '').slice(0, 80), headline: String(r.headline).slice(0, 120), body: String(r.body || '').slice(0, 300) }, questions: qs, mode: 'llm' });
  } catch (e) {
    return NextResponse.json({ ...fb(), mode: 'fallback', reason: why(e) });
  }
}
