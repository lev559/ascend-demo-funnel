// Used when the model is slow, over its daily limit or returns something unusable.
// Written per reason so the funnel still reads naturally.
import { COACHES } from './coaches';

const Q = {
  overload: [
    { q: 'What makes this week heavier than usual?', label: 'Why this week', options: [['A deadline', 'Something with a date on it'], ['Too many small things', 'None big, all urgent'], ['Other people need me', 'Family, team, friends'], ['I\'m running on empty', 'Low energy, poor sleep']] },
    { q: 'If one thing got done, what would ease the most?', label: 'Would ease most', options: [['A work task', 'The one that hangs over me'], ['Something at home', 'The chore everyone notices'], ['A message or call', 'I keep putting it off'], ['Rest', 'An evening that\'s mine']] },
    { q: 'What usually happens when it piles up?', label: 'When it piles up', options: [['I work later', 'And sleep less'], ['I freeze', 'And scroll instead'], ['I do easy things', 'Not the important ones'], ['I snap at people', 'Then feel bad']] },
    { q: 'How much can you realistically drop this week?', label: 'Can drop', options: [['Almost nothing', 'Everything is fixed'], ['A few things', 'If someone helps'], ['Quite a lot', 'I just need permission'], ['Not sure', 'Help me see it']] },
    { q: 'What would a good evening look like?', label: 'Good evening', options: [['One thing done', 'And I stop there'], ['Time with people', 'Without the laptop'], ['Early night', 'Actually rested'], ['A clear plan', 'For tomorrow']] },
  ],
  start: [
    { q: 'What happens right before you put it off?', label: 'What stops you', options: [['It feels too big', 'No obvious first step'], ['I want it perfect', 'So I wait'], ['Something easier appears', 'Phone, chores, email'], ['I feel tired', 'No energy left']] },
    { q: 'How long has it been waiting?', label: 'Waiting for', options: [['Days', 'Still fresh'], ['Weeks', 'It\'s starting to weigh'], ['Months', 'It\'s become a thing'], ['I\'ve lost count', 'It keeps coming back']] },
    { q: 'What would starting look like in 10 minutes?', label: 'First 10 minutes', options: [['Open the file', 'Just look at it'], ['Write a first line', 'Badly is fine'], ['Send one message', 'To get it moving'], ['I don\'t know yet', 'Help me find it']] },
    { q: 'What helps you keep going once started?', label: 'Keeps you going', options: [['A deadline', 'Real or set by someone'], ['Seeing progress', 'Ticking things off'], ['Someone checking in', 'A little pressure'], ['Momentum', 'Once I start, I\'m fine']] },
    { q: 'What\'s the cost of not doing it?', label: 'Cost of waiting', options: [['Stress', 'It\'s always in my head'], ['Money', 'Or a missed chance'], ['Other people', 'They\'re waiting on me'], ['Self-respect', 'I keep breaking promises to me']] },
  ],
  lost: [
    { q: 'What changed recently?', label: 'Recent change', options: [['Work', 'Job, role or boredom'], ['A relationship', 'Started, ended or shifted'], ['Where I live', 'A move or wanting one'], ['Nothing changed', 'That\'s the problem']] },
    { q: 'When you picture the next year, what do you feel?', label: 'Next year feels', options: [['Restless', 'I want something different'], ['Afraid', 'Of picking wrong'], ['Flat', 'Nothing pulls me'], ['Hopeful', 'I just need direction']] },
    { q: 'What matters most in what comes next?', label: 'Matters most', options: [['Meaning', 'Work that feels mine'], ['Security', 'Money and stability'], ['Freedom', 'Time and choice'], ['People', 'Being close to the right ones']] },
    { q: 'What\'s holding the decision back?', label: 'Holding you back', options: [['Too many options', 'All look half-right'], ['No clear option', 'Nothing stands out'], ['Money', 'I can\'t risk much'], ['Other people\'s opinions', 'Family, partner, friends']] },
    { q: 'How much can you test before deciding?', label: 'Room to test', options: [['A little', 'Evenings only'], ['Quite a bit', 'I have some time'], ['Almost nothing', 'Life is full'], ['Not sure', 'Help me see']] },
  ],
  talk: [
    { q: 'Who is this mostly about?', label: 'About', options: [['Someone close', 'Partner, family, friend'], ['Work', 'A boss or colleague'], ['Myself', 'Something I did or feel'], ['A situation', 'Not one person']] },
    { q: 'What do you feel most right now?', label: 'Feeling', options: [['Hurt', 'It stung'], ['Angry', 'At them or me'], ['Guilty', 'I said or did something'], ['Confused', 'I can\'t make sense of it']] },
    { q: 'What would help most tonight?', label: 'Would help', options: [['Being heard', 'Just say it out loud'], ['Perspective', 'Am I overreacting?'], ['Words', 'What to say to them'], ['Calm', 'To sleep on it']] },
    { q: 'Have you talked to anyone about it?', label: 'Talked to anyone', options: [['Not yet', 'You\'re the first'], ['A little', 'But not really'], ['Yes', 'It didn\'t help much'], ['I can\'t', 'It\'s complicated']] },
    { q: 'What would a good outcome look like?', label: 'Good outcome', options: [['We talk it through', 'Calmly'], ['I let it go', 'And move on'], ['I understand myself', 'Why it hit so hard'], ['A clear decision', 'About what to do']] },
  ],
};

const REFLECT = {
  overload: { headline: 'A full week, not a lazy one.', body: "When everything feels urgent, nothing gets your best. We'll find the one thing that eases the most and give the rest a day." },
  start: { headline: 'Knowing and doing are different muscles.', body: "Putting it off usually means the first step is too big or too vague. We'll shrink it until starting is easy." },
  lost: { headline: 'Feeling lost is a moment, not a verdict.', body: "You don't need the whole answer now, just better evidence about what you want. We'll find a small way to test it." },
  talk: { headline: 'That sounds like a lot to carry alone.', body: "Saying it out loud is already a step. We'll make sense of it together and see what, if anything, needs doing." },
};

export function fallbackQuestions(reason, text, n) {
  const set = Q[reason] || Q.overload;
  const quote = String(text || '').split(/[.,!?;\n]/)[0].trim().split(' ').slice(0, 8).join(' ');
  return {
    reflection: { quote, ...(REFLECT[reason] || REFLECT.overload) },
    questions: set.slice(0, n).map((x) => ({ q: x.q, label: x.label, options: x.options.map(([label, sub]) => ({ label, sub })) })),
  };
}

const OPEN = {
  nora: (n) => `Hi ${n}, I'm Nora. I read what you wrote, thank you for sharing it. What feels heaviest about it right now?`,
  ines: (n) => `Hi ${n}, I'm Ines. I read what you wrote. Let's make it smaller: which part, if it moved, would make the rest easier?`,
  max: (n) => `Hey ${n}, I'm Max. Got it. Quick one: what's the smallest piece of this you could do in the next 24 hours?`,
  theo: (n) => `Hi ${n}, I'm Theo. I read it. Straight question: what's the real decision or task hiding in all of this?`,
};
export function fallbackChat(coachId, turn, max, name = 'there') {
  if (turn === 1) return { text: (OPEN[coachId] || OPEN.theo)(name), replies: ['Let me think', 'The first part'] };
  const MID = [
    { text: "That helps. Let's keep it small: one step you could take this week, so you see how it feels before deciding anything bigger. What would that step be?", replies: ['Not sure', 'I have an idea'] },
    { text: "Good. Now make it even smaller: what's a version of that step you could finish in 20 minutes?", replies: ['Make it smaller', 'That works'] },
    { text: "And what usually gets in the way when you try? Naming it now makes it easier to plan around.", replies: ['Time', 'Energy'] },
  ];
  if (turn < max) return MID[(turn - 2) % MID.length];
  return { text: `Thanks, ${name}. The key is to start small and learn from it. I'm putting your plan together now.`, replies: [] };
}

const PLAN = {
  overload: { profile: 'The full-week stretch', insight: "You're not behind because you're lazy; too many things are urgent at once, so none get your best.", next: ['Do the one task that eases the most', '20 minutes tonight, then stop. You will know it worked if tomorrow feels lighter.'], tech: ['Eisenhower matrix', 'Popularised by Stephen Covey, The 7 Habits of Highly Effective People', 'Sort your list into urgent and important; do one important thing first and give the urgent-only ones a later day.'], goal: 'calmer evenings', now: 'Everything feels urgent and evenings disappear', soon: 'One thing done most evenings, the rest on a day that has room' },
  start: { profile: 'The stuck start', insight: "The task isn't too hard; the first step is too big and too vague, so putting it off feels safer.", next: ['Do a 10-minute start', 'Set a timer for 10 minutes and stop when it rings. Starting is the win.'], tech: ['Two-minute rule', 'James Clear, Atomic Habits', 'Make the first version of the habit take two minutes, so starting is easier than avoiding.'], goal: 'start and keep going', now: 'Putting off the thing that matters most', soon: 'Short daily starts that add up to visible progress' },
  lost: { profile: 'The crossroads', insight: "You don't lack an answer; you lack evidence about what you'd actually enjoy, so every option feels like a gamble.", next: ['Run one small test of an option', 'One evening this week, try a small piece of it and notice your energy.'], tech: ['Odyssey plans', 'Bill Burnett and Dave Evans, Designing Your Life', 'Sketch three different versions of the next five years and rate each for energy and fear.'], goal: "figure out what's next", now: 'Stuck between options, none feels clearly right', soon: 'A couple of small tests done and a clearer yes or no' },
  talk: { profile: 'The heavy conversation', insight: 'What happened matters to you because the relationship does; the hurt is a sign of care, not weakness.', next: ['Write what you wish you had said', 'Tonight, five minutes, no sending. Read it tomorrow and see how it feels.'], tech: ['Expressive writing', 'James Pennebaker, research on writing about difficult experiences', 'Write freely for a few minutes about what happened and how it felt, just for you.'], goal: 'feel lighter and know what to say', now: "Replaying what happened and what I said", soon: 'Calmer, with words you are ready to say' },
};
export function fallbackPlan(reason, days, coachId) {
  const p = PLAN[reason] || PLAN.overload;
  const c = COACHES[coachId] || COACHES.theo;
  const tasks = [p.next[0], 'Notice what helped and what got in the way', 'Repeat the step, a little bigger', 'Tell one person what you are working on', `Check-in with ${c.name}: what worked, what's next`];
  return {
    profile: p.profile, insight: p.insight,
    next_step: { title: p.next[0], detail: p.next[1], when: 'This week' },
    technique: { name: p.tech[0], source: p.tech[1], how: p.tech[2] },
    days: [0, 1, 3, 4, 6].map((d, i) => ({ day: days[d], task: tasks[i] })),
    deal: ['One small step a day, not ten', 'I stop when the timer rings', 'I tell my coach when it slips', 'I review the week on Sunday'],
    now: p.now, soon: p.soon, goal: p.goal,
  };
}
