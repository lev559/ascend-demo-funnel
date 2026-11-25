import { NextResponse } from 'next/server';
import { COACHES } from '../../../lib/coaches';
import { callLLM, parseJSON, hasLLM, reason as why } from '../../../lib/llm';
import { chatPrompt } from '../../../lib/coachPrompt';
import { fallbackChat } from '../../../lib/fallbacks';
import { isCrisis, CRISIS_REPLY, isSafeReply } from '../../../lib/safety';

// POST { coachId, ctx, history:[{role,content}], turn, max } -> { text, replies, mode }
// The key stays on the server; the browser never sees it.
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const coachId = COACHES[body.coachId] ? body.coachId : 'theo';
  const ctx = body.ctx || {};
  const max = Math.min(Math.max(Number(body.max) || 2, 2), 5);
  const turn = Math.min(Math.max(Number(body.turn) || 1, 1), max);
  const history = (Array.isArray(body.history) ? body.history : []).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '').slice(0, 600) }));
  const last = [...history].reverse().find((m) => m.role === 'user');
  if (last && isCrisis(last.content)) return NextResponse.json({ text: CRISIS_REPLY, replies: [], mode: 'safety' });

  const fb = () => fallbackChat(coachId, turn, max, ctx.name || 'there');
  if (!hasLLM()) return NextResponse.json({ ...fb(), mode: 'fallback', reason: 'no key' });
  try {
    const raw = await callLLM(chatPrompt(ctx, coachId, history, turn, max), { maxTokens: 260, timeout: 9000 });
    let text, replies = [], risk = false;
    try { const j = parseJSON(raw); text = j.text; risk = j.risk === true; replies = Array.isArray(j.replies) ? j.replies : []; } catch { text = raw; }
    if (risk) return NextResponse.json({ text: CRISIS_REPLY, replies: [], mode: 'safety' });
    text = String(text || '').trim().replace(/^"|"$/g, '').replace(/^(Theo|Nora|Ines|Max):\s*/, '');
    if (!isSafeReply(text)) throw new Error(text ? 'unsafe' : 'empty');
    replies = turn === max ? [] : replies.map((r) => String(r).slice(0, 32)).filter(Boolean).slice(0, 2);
    return NextResponse.json({ text, replies, mode: 'llm' });
  } catch (e) {
    return NextResponse.json({ ...fb(), mode: 'fallback', reason: why(e) });
  }
}
