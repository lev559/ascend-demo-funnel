import { NextResponse } from 'next/server';
import { COACHES, opener, timeQuestion, scriptedRepeat, TIME_REPLIES } from '../../../lib/coaches';
import { isCrisis, CRISIS_REPLY, isSafeReply } from '../../../lib/safety';
import { systemPrompt, userPrompt } from '../../../lib/coachPrompt';
import { LLM } from '../../../lib/config';

// POST { coachId, turn: 1|2|3, pile, message, chatMode: 'scripted'|'llm' }
// -> { text, mode: 'scripted' | 'llm' | 'fallback' | 'safety', quickReplies? }
//
// LLM mode is on when LLM_API_KEY is set (endpoint and model: lib/config.js, overridable by env). Any OpenAI-compatible
// chat endpoint works (Cloudflare Workers AI, OpenRouter, Groq, Gemini's OpenAI endpoint).
// The key stays on the server; the browser never sees it.

const TIMEOUT_MS = 2500;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const coachId = COACHES[body.coachId] ? body.coachId : 'theo';
  const turn = Number(body.turn) || 1;
  const message = String(body.message || '').slice(0, 500);

  if (message && isCrisis(message)) {
    return NextResponse.json({ text: CRISIS_REPLY, mode: 'safety' });
  }
  if (turn === 1) return NextResponse.json({ text: opener(coachId), mode: 'scripted' });
  if (turn === 3) return NextResponse.json({ text: timeQuestion(coachId), mode: 'scripted', quickReplies: TIME_REPLIES });

  // Turn 2: repeat-back + one thing tonight
  const fallback = scriptedRepeat(coachId, body.pile, message);
  const LLM_API_KEY = process.env.LLM_API_KEY;
  const LLM_BASE_URL = LLM.baseUrl, LLM_MODEL = LLM.model;
  // chat-mode experiment: the 'scripted' arm never calls the model
  if (body.chatMode === 'scripted' || !LLM_API_KEY || !message) {
    return NextResponse.json({ text: fallback, mode: 'scripted' });
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 120,
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt(coachId) },
          { role: 'user', content: userPrompt({ pile: body.pile, message }) },
        ],
      }),
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`LLM ${r.status}`);
    const data = await r.json();
    const text = (data?.choices?.[0]?.message?.content || '').trim().replace(/^"|"$/g, '');
    if (!isSafeReply(text)) return NextResponse.json({ text: fallback, mode: 'fallback' });
    return NextResponse.json({ text, mode: 'llm' });
  } catch {
    // timeout, rate limit (429), provider down: the user still gets a good scripted line
    return NextResponse.json({ text: fallback, mode: 'fallback' });
  }
}
