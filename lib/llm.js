// Server-only helper for the OpenAI-compatible chat endpoint (Cloudflare Workers AI by default, see lib/config.js).
import { LLM } from './config';

export const hasLLM = () => Boolean(process.env.LLM_API_KEY);

export async function callLLM(messages, { maxTokens = 300, timeout = 8000, temperature = 0.6 } = {}) {
  if (!hasLLM()) throw new Error('no key');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(`${LLM.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({ model: LLM.model, max_tokens: maxTokens, temperature, messages }),
    });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const data = await r.json();
    const text = (data?.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('empty');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Models sometimes wrap JSON in prose or code fences: take the outermost {...}
export function parseJSON(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no json');
  return JSON.parse(text.slice(a, b + 1));
}

export const reason = (e) => (e?.name === 'AbortError' ? 'timeout' : String(e?.message || 'error').slice(0, 40));
