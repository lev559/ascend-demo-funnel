// Quietly funnel: content, general questions, plans and experiment definitions.
// Situation-specific questions, the coach chat and the plan are written by the model (app/api/coach/*).

// Reasons on the first screen (one per persona). Ads can preselect one with ?angle=
export const REASONS = {
  overload: { label: "Too much at once", art: "notes", hint: "My week is a mess and everything feels urgent",
    examples: ["Work deadlines and family stuff all landed on the same week", "I'm behind on everything and evenings just disappear", "Too many people need something from me right now"] },
  start: { label: "I know what to do, but don't start", art: "phone", hint: "I keep putting off the one thing that matters",
    examples: ["I've been putting off a work project for weeks", "I want to start exercising but never actually begin", "I plan everything on Sunday and do nothing by Tuesday"] },
  lost: { label: "Not sure where my life is going", art: "fork", hint: "I'm at a crossroads and can't decide",
    examples: ["I'm bored at my job and don't know whether to quit", "I moved recently and feel a bit lost", "Everyone seems to have a plan except me"] },
  talk: { label: "I just need to talk it out", art: "bubbles", hint: "Something happened and I can't stop thinking about it",
    examples: ["I had a fight with someone close and keep replaying it", "Something at work is bothering me and I can't let it go", "I feel off lately and don't really know why"] },
};

// Ad angles change the headline only; the reason picker stays.
// `reason` preselects the matching card on the first screen.
export const ANGLES = {
  default: { title: "A coach you'd text", accent: "on a bad day." },
  overload: { title: "It's Wednesday.", accent: "Your week is already gone.", reason: "overload" },
  sunday: { title: "Sunday scaries?", accent: "Text it out in 2 minutes.", reason: "overload" },
  start: { title: "You don't need motivation.", accent: "You need the first 10 minutes.", reason: "start" },
  lost: { title: "Feeling lost is a moment,", accent: "not a personality.", reason: "lost" },
  private: { title: "Someone to think out loud with.", accent: "Privately.", reason: "talk" },
  voice: { title: "Calm or direct, practical or warm.", accent: "Pick the coach you'd listen to." },
};

const SCALE = ["1", "2", "3", "4", "5"];

// General questions, asked of everyone. `long: true` ones only in the long arm of the quiz-length test.
// The model adds 3 (short) or 5 (long) questions about the person's own situation after the free-text step.
export const QUESTIONS = [
  { id: "age", type: "single", layout: "numbers", q: "How old are you?", hint: "Your coach picks examples that fit your life stage.", options: ["18–24", "25–34", "35–44", "45–54", "55+"] },
  { id: "since", type: "single", layout: "list", q: "How long has this been on your mind?", options: ["A few days", "A few weeks", "Months", "Longer than I'd like to admit"],
    art: ["moon1", "moon2", "moon3", "moon4"], subs: ["It's still fresh", "It keeps coming back", "It's part of the background now", "It's been a while"],
    aside: "There's no wrong answer. It helps your coach pace the plan." },
  { id: "tried", type: "multi", layout: "grid", q: "What have you tried so far?", hint: "Pick all that apply.", options: ["Talking to friends", "Self-help books or podcasts", "Apps or planners", "Asking ChatGPT", "Nothing yet"],
    art: ["friends", "book", "planner", "spark", "blank"], aside: "Got it. Your coach won't suggest what you've already tried and dropped." },
  { id: "stuck", type: "statement", art: "checklist", q: "“I know roughly what I should do. I just don't do it.”", options: SCALE },
  { id: "overthink", type: "statement", art: "loop", q: "“I think about this more than I act on it.”", options: SCALE, long: true },
  { id: "energy", type: "single", layout: "grid", q: "When do you have the most energy?", hint: "Your first steps go where your energy is.", options: ["Early morning", "Middle of the day", "Evening", "It's low lately"],
    art: ["sunrise", "noon", "evening", "battery"], long: true },
  { id: "support", type: "single", layout: "list", q: "Who do you usually talk to about things like this?", options: ["A partner", "Friends or family", "A therapist or coach", "Nobody, really"],
    art: ["partner", "family", "pro", "alone"], aside: "Your coach works alongside the people you have, not instead of them.", long: true },
  // One answer = one coach (2×2: calm/direct × encouraging/practical). The quotes are in each coach's voice.
  { id: "voice", type: "voice", q: "Which of these would actually get you moving?", hint: "Pick the voice you'd listen to on a hard day.",
    options: [
      { coach: "nora", label: "“Let's slow down. What's the heaviest part?”", sub: "Calm and warm, feelings first" },
      { coach: "ines", label: "“Three things. Which one unlocks the others?”", sub: "Calm and structured, a clear plan" },
      { coach: "max", label: "“Ten minutes. Start now, I'll wait.”", sub: "Upbeat push, celebrates every start" },
      { coach: "theo", label: "“Skip the new system. Make one decision.”", sub: "Straight talk, no fluff" },
    ] },
  { id: "time", type: "single", layout: "row", q: "How much time can you give this on a normal day?", hint: "Small and daily beats big and rare. Your plan fits this.", options: ["5 minutes", "15 minutes", "30 minutes or more"],
    art: ["pie5", "pie15", "pie30"], subs: ["One tiny step", "A real session", "Room to go deep"] },
  { id: "checkin", type: "single", layout: "grid", preview: true, q: "When should your coach check in?", options: ["Morning", "Evening", "Sunday", "Only when I open the app"],
    art: ["sun", "moon", "sunday", "phone"], long: true },
  { id: "goal_when", type: "single", layout: "timeline", q: "By when would you like this to feel different?", options: ["This week", "In a month", "In 3 months", "No rush"],
    subs: ["A first small win", "A new habit", "A real change", "At my own pace"], aside: "Realistic beats fast. Your plan paces itself to this." },
];

export function questionsFor(length) {
  return QUESTIONS.filter((q) => length === "long" || !q.long);
}
export const dynamicCount = (length) => (length === "long" ? 5 : 3);

// Coach match: the `voice` answer picks the coach directly (see lib/coaches.js)
export const coachFromAnswers = (answers) => (["nora", "ines", "max", "theo"].includes(answers.voice) ? answers.voice : "theo");

// Paywall-model experiment. Intro price for the first period, then the full price (shown on every plan).
export const PAYWALLS = {
  weekly: {
    default: "4w",
    plans: [
      { id: "1w", name: "1-week plan", price: 6.93, full: 13.86, interval: "week", count: 1, days: 7 },
      { id: "4w", name: "4-week plan", price: 19.99, full: 39.99, interval: "week", count: 4, days: 28, popular: true },
      { id: "12w", name: "12-week plan", price: 39.99, full: 79.99, interval: "week", count: 12, days: 84 },
    ],
  },
  annual_trial: {
    default: "year",
    plans: [
      { id: "year", name: "Yearly, 7 days free", price: 0, full: 79.99, interval: "year", count: 1, days: 365, trialDays: 7, popular: true },
      { id: "month", name: "Monthly", price: 19.99, full: 19.99, interval: "month", count: 1, days: 30 },
    ],
  },
};
// Returning visitors who left the paywall: lower intro price, no timer.
export const DOWNSELL = { id: "4w_back", name: "4-week plan", price: 14.99, full: 39.99, interval: "week", count: 4, days: 28 };
export const ALL_PLANS = [...PAYWALLS.weekly.plans, ...PAYWALLS.annual_trial.plans, DOWNSELL];
export const perDay = (p) => (p.trialDays ? p.full / p.days : p.price / p.days);
export const OFFER_MINUTES = 10;

export const UPSELLS = {
  single: { id: "sunday_review", title: "Add Sunday reviews", price: 9.99,
    items: ["Every Sunday your coach walks through the week ahead with you", "One page: what's first, what can wait"] },
  bundle: { id: "voice_review", title: "Add voice check-ins + Sunday reviews", price: 14.99, was: 24.98,
    items: ["Talk to your coach by voice on busy days", "Sunday review of the week ahead", "Weekly summary by email"] },
};

// Used when GrowthBook has no rule for a feature (or no key): the same experiments, assigned locally by user id.
const exp = (key, variations) => ({ defaultValue: variations[0], rules: [{ key, variations, weights: variations.map(() => 1 / variations.length), hashAttribute: "id" }] });
export const OFFLINE_FEATURES = {
  "quiz-length": exp("quiz-length", ["short", "long"]),
  "paywall-model": exp("paywall-model", ["weekly", "annual_trial"]),
  "chat-length": exp("chat-length", ["2", "4"]),
  "entry-mode": exp("entry-mode", ["write", "tap"]),
  "upsell-offer": exp("upsell-offer", ["single", "bundle"]),
};

export function renewalDate(days) {
  const d = new Date(Date.now() + days * 864e5);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export const money = (n) => `$${n.toFixed(2)}`;
