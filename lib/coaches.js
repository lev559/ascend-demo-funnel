// Coach characters and the scripted mini-chat used in the funnel (screen 5).
// The script always works without any API key. In "llm" mode the model only rewrites
// turn 2 (repeat-back + one thing tonight); every other line stays scripted.

export const COACHES = {
  nora: {
    name: 'Nora', initial: 'N', color: '#B9A8FF', tags: 'Calm · encouraging',
    voice: 'warm, slow, one question at a time, never pushes, names feelings before tasks',
    sample: "Let's breathe first. What's the heaviest thing on your mind?",
  },
  ines: {
    name: 'Ines', initial: 'I', color: '#7CC6B8', tags: 'Calm · practical',
    voice: 'quiet planner, turns chaos into a short ordered list, asks which item unlocks the others',
    sample: 'Three things this week. Which one unlocks the others?',
  },
  max: {
    name: 'Max', initial: 'M', color: '#FFD166', tags: 'Direct · encouraging',
    voice: 'energetic accountability buddy, short sentences, celebrates starting, uses the user\'s own deadline',
    sample: "You said Tuesday. It's Tuesday. Ten minutes, I'll wait.",
  },
  theo: {
    name: 'Theo', initial: 'T', color: '#FFB36B', tags: 'Direct · practical',
    voice: 'straight talk, no fluff, picks one concrete action and a time for it',
    sample: "You don't need a new system. You need to send that email.",
  },
};

// Quiz answers that decide the coach. style: 'calm' | 'direct', need: 'encourage' | 'practical'
export function matchCoach({ style = 'direct', need = 'practical' } = {}) {
  if (style === 'calm') return need === 'practical' ? 'ines' : 'nora';
  return need === 'practical' ? 'theo' : 'max';
}

// What is piling up (quiz step 3) -> wording used in fallbacks
const PILE = {
  work: { thing: 'the work deadline', wait: 'the inbox' },
  home: { thing: 'the one home task that blocks the rest', wait: 'the rest of the chores' },
  health: { thing: 'getting to bed on time tonight', wait: 'the perfect workout plan' },
  money: { thing: 'the one bill or form with a due date', wait: 'the rest of the admin' },
  people: { thing: 'one honest message to the person who needs you most', wait: 'the group chat' },
};

// Turn 1: opener (always scripted)
const OPENERS = {
  nora: "Hi, I'm Nora. No rush. What's the heaviest thing on your plate this week?",
  ines: "Hi, I'm Ines. Let's make a short list. What's the heaviest thing on your plate this week?",
  max: "Hey, I'm Max. One message, go: what's the heaviest thing on your plate this week?",
  theo: "Hi, I'm Theo. In one message: what's the heaviest thing on your plate this week?",
};

// Turn 2 fallback: repeat-back + one thing tonight. {user} = short quote of the user's words.
// With a quote, the first thing the user named becomes tonight's one thing.
const REPEAT = {
  nora: (q, p) => `That's a lot to carry. Tonight, let's only hold ${q ? `"${q}"` : p.thing}. ${cap(p.wait)} can wait.`,
  ines: (q, p) => `First on the list: ${q ? `"${q}"` : p.thing}. ${cap(p.wait)} goes to later this week.`,
  max: (q, p) => `Tonight you do ${q ? `"${q}"` : p.thing}. Just that. ${cap(p.wait)} can wait.`,
  theo: (q, p) => (q ? `You said "${q}". That's the one thing tonight.` : `The one thing tonight: ${p.thing}.`) + ` ${cap(p.wait)} can wait.`,
};

// Turn 3: time question with quick replies (always scripted)
const TIME_Q = {
  nora: 'How much time feels kind to give it tonight?',
  ines: 'How long can you give it tonight?',
  max: 'How many minutes are you giving it? Pick one.',
  theo: 'How long can you give it tonight?',
};
export const TIME_REPLIES = ['20 minutes', 'An hour', 'Not tonight'];

export function opener(coachId) { return OPENERS[coachId] || OPENERS.theo; }
export function timeQuestion(coachId) { return TIME_Q[coachId] || TIME_Q.theo; }

// People and health are never "the thing that can wait": a neutral line protects that time instead.
const PEOPLE = /\b(mom|mum|mother|dad|father|parent|kid|child|son|daughter|baby|partner|husband|wife|sister|brother|friend|sick|ill|hospital|funeral|pregnan)/i;

export function scriptedRepeat(coachId, pile = 'work', userText = '') {
  const p = PILE[pile] || PILE.work;
  const q = shortQuote(userText);
  if (PEOPLE.test(userText)) {
    return `You said "${q}". That comes first tonight, and the rest of the list can wait until tomorrow.`;
  }
  return (REPEAT[coachId] || REPEAT.theo)(q.split(' ').length >= 2 ? q : '', p);
}

// Keep the quote short and harmless: first clause, max 60 chars, no URLs or emails.
export function shortQuote(text = '') {
  const t = String(text).replace(/https?:\/\/\S+|\S+@\S+/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const first = t.split(/[.,!?;\n]| and /)[0].trim();
  return first.length > 60 ? first.slice(0, 57).trimEnd() + '…' : first;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
