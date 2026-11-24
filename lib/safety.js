// Crisis check runs BEFORE any coaching reply, scripted or LLM.
// If it matches, the coach stops coaching and shows help lines instead.
// Keyword lists are a floor, not a classifier: in production add a moderation model and human review.

const CRISIS = /\b(kill (myself|me)|end (it all|my life)|suicid|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself|don'?t want to (live|be alive|wake up)|no reason to live|overdose)\b/i;

export function isCrisis(text = '') {
  return CRISIS.test(String(text));
}

export const CRISIS_REPLY =
  "I'm really glad you told me. This is bigger than a coaching chat, and you deserve real support right now. " +
  'In the US you can call or text 988 (Suicide & Crisis Lifeline). In the UK and Ireland call Samaritans on 116 123. ' +
  'Elsewhere, findahelpline.com lists free local lines. If you are in danger, call your local emergency number.';

// Output check for model replies: anything that fails falls back to the script.
const BANNED = /\b(diagnos|disorder|adhd|depress|anxiety disorder|medication|dosage|therap(y|ist) instead|you have [a-z]+ (disorder|syndrome))\b/i;

export function isSafeReply(text = '') {
  const t = String(text).trim();
  if (t.length < 20 || t.length > 320) return false;
  if (/https?:\/\/|www\./i.test(t)) return false;
  if (BANNED.test(t)) return false;
  return true;
}
