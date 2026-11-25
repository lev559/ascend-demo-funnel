import { NextResponse } from 'next/server';
import { allowModelCall } from '../../../lib/ratelimit';
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
  const gate = allowModelCall(req);
  if (!gate.ok) return NextResponse.json({ ...fb(), mode: 'fallback', reason: gate.reason });
  try {
    const raw = await callLLM(chatPrompt(ctx, coachId, history, turn, max), { maxTokens: 260, timeout: 9000 });
    let text = raw, replies = [];
    if (/^\s*RISK\b/.test(raw)) return NextResponse.json({ text: CRISIS_REPLY, replies: [], mode: 'safety' });
    const m = raw.match(/\n\s*REPLIES:\s*(.+)\s*$/i);
    if (m) { replies = m[1].split('|').map((x) => x.trim()).filter(Boolean); text = raw.slice(0, m.index); }
    try { if (text.trim().startsWith('{')) { const j = parseJSON(text); text = j.text || text; replies = j.replies || replies; } } catch {}
    text = String(text || '').trim().replace(/^"|"$/g, '').replace(/^(Theo|Nora|Ines|Max):\s*/, '');
    if (!isSafeReply(text)) throw new Error(text ? 'unsafe' : 'empty');
    replies = turn === max ? [] : replies.map((r) => String(r).slice(0, 32)).filter(Boolean).slice(0, 2);
    return NextResponse.json({ text, replies, mode: 'llm' });
  } catch (e) {
    return NextResponse.json({ ...fb(), mode: 'fallback', reason: why(e) });
  }
}
