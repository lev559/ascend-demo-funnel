// Duskwise demo funnel: content, quiz, plans and experiment definitions.
// A made-up product for a portfolio case. Prices and copy are illustrative.

// First screen follows the ad angle the visitor came from (?angle= or utm_content=)
export const ANGLES = {
  default: { title: "Your week is full. Let's find what can wait.", sub: "Tell a coach what's piling up. Get the one thing that matters tonight, and a list of what can wait.", cta: "Find what can wait" },
  overload: { title: "It's Wednesday. Your week is already gone.", sub: "Tell a coach what's piling up. Get the one thing that matters tonight, and a list of what can wait.", cta: "Find what can wait" },
  sunday: { title: "Sunday scaries? Text it out in 2 minutes.", sub: "A coach sorts next week with you: one thing first, the rest in its place.", cta: "Sort my week" },
  start: { title: "You don't need motivation. You need the first 10 minutes.", sub: "A direct coach who picks one task with you and checks in when you start.", cta: "Get my first 10 minutes" },
  lost: { title: "Feeling lost is a moment, not a personality.", sub: "A calm coach helps you see what matters this week, one small step at a time.", cta: "Start with one step" },
  private: { title: "Someone to think out loud with. Privately.", sub: "Not therapy. Not a friend who gets tired of the topic. A coach that remembers your week.", cta: "Start talking" },
  voice: { title: "Pick your coach: calm or direct, practical or encouraging.", sub: "Four voices. Answer a few questions and we'll match you with the one you'd actually listen to.", cta: "Find my coach" },
};

const S = ["Yes, that's me", "Sometimes", "Not really"]; // statement answers

// Questions in three sections. `long: true` ones appear only in the long variant of the quiz-length test.
export const QUESTIONS = [
  { id: "pile", section: "Your week", type: "multi", q: "What's piling up right now?", hint: "Pick all that apply.",
    options: [["work", "Work deadlines", "Reviews, reports, the inbox"], ["home", "Home and family", "Chores, kids, the broken dishwasher"], ["health", "Health and routine", "Sleep, workouts, meals"], ["money", "Money and admin", "Bills, forms, appointments"], ["people", "People who need me", "Friends, parents, the group chat"]] },
  { id: "falls_apart", section: "Your week", type: "single", q: "When does your week usually fall apart?", options: ["Monday morning", "Midweek", "Sunday evening", "Honestly, every day"] },
  { id: "undone", section: "Your week", type: "statement", q: "“I end most days with the things I meant to do still undone.”", options: S },
  { id: "household", section: "Your week", type: "single", q: "Who else is in your week?", options: ["Just me", "A partner", "Kids", "Parents I look after"], long: true },
  { id: "work_hours", section: "Your week", type: "single", q: "How long is a normal workday for you?", options: ["Under 8 hours", "8–10 hours", "More than 10", "It changes every day"], long: true },
  { id: "tried", section: "Your week", type: "multi", q: "What have you tried to keep it under control?", hint: "Pick all that apply.",
    options: [["todo", "To-do apps", ""], ["planner", "Planners or Notion templates", ""], ["selfhelp", "Self-help apps", ""], ["chatgpt", "Typing it into ChatGPT", ""], ["nothing", "Nothing yet", ""]] },
  { id: "dropped", section: "Your week", type: "single", q: "Why did it stop working?", options: ["Too much setup", "I forgot to open it", "It felt like homework", "It didn't know my life"] },
  { id: "info_full", type: "info", q: "You're not lazy. Your week is just full.", body: "Duskwise keeps one list and remembers what you told it, so you never explain your life twice. Your coach picks one thing for tonight and moves the rest." },
  { id: "start", section: "How you work", type: "statement", q: "“I know what to do. I just can't make myself start.”", options: S },
  { id: "freeze", section: "How you work", type: "statement", q: "“When too much is going on, I freeze instead of picking one thing.”", options: S },
  { id: "energy", section: "How you work", type: "single", q: "When do you have the most energy?", options: ["Early morning", "Middle of the day", "Late evening", "It's all low lately"], long: true },
  { id: "sleep", section: "How you work", type: "single", q: "How are your evenings ending lately?", options: ["On time, mostly", "Scrolling in bed", "Working late", "Falling asleep on the couch"], long: true },
  { id: "putoff", section: "How you work", type: "single", q: "What do you put off the longest?", options: ["Emails and messages", "Admin and forms", "Big work tasks", "Things for myself"], long: true },
  { id: "time", section: "How you work", type: "single", q: "How much time can you give it on a busy evening?", options: ["5 minutes", "15 minutes", "30 minutes"] },
  { id: "nudge", section: "How you work", type: "single", q: "When should your coach check in?", options: ["Morning", "After work", "Sunday evening", "Only when I open the app"] },
  { id: "weekend", section: "How you work", type: "statement", q: "“I plan the week on Sunday, and by Tuesday the plan is wrong.”", options: S, long: true },
  { id: "advice", section: "Your coach", type: "single", q: "Advice that actually works on you sounds like…", options: ["“Send it today. It's 80% good.”", "“Take a breath. Then one small step.”"] },
  { id: "need", section: "Your coach", type: "single", q: "What do you need more of right now?", options: ["A clear, short list", "Someone in my corner"] },
  { id: "tuneout", section: "Your coach", type: "statement", q: "“Too much positivity makes me tune out.”", options: S },
  { id: "coached", section: "Your coach", type: "single", q: "Have you ever worked with a coach or mentor?", options: ["Yes, a person", "Yes, an app", "No, never"], long: true },
  { id: "motivation", section: "Your coach", type: "single", q: "What keeps you going when you'd rather quit?", options: ["Someone expecting me", "Seeing progress", "A deadline", "I'm still figuring that out"], long: true },
  { id: "notifications", section: "Your coach", type: "single", q: "How many reminders a day is too many?", options: ["More than one", "More than three", "I like lots of nudges"], long: true },
  { id: "matters", section: "Your coach", type: "single", q: "What matters most in an app like this?", options: ["My chats stay private", "Short daily check-ins", "Reminders that adapt to my week", "Nothing fancy, it just works"] },
  { id: "age", section: "Your coach", type: "single", q: "Your age range", hint: "Helps your coach pick examples. Optional.", options: ["18–24", "25–34", "35–44", "45–54", "55+"], skippable: true },
  { id: "goal", section: "Your coach", type: "single", q: "In a month, what would make you say it worked?", options: ["Evenings feel calmer", "I finish what matters", "I stop restarting every Monday", "I know what can wait"] },
];

export function questionsFor(length) {
  return QUESTIONS.filter((q) => length === "long" || !q.long);
}
export const countQuestions = (length) => questionsFor(length).filter((q) => q.type !== "info").length;

// Coach match from two quiz answers (see lib/coaches.js)
export function coachInputs(answers) {
  const style = (answers.advice || "").startsWith("“Take a breath") ? "calm" : "direct";
  const need = answers.need === "Someone in my corner" ? "encourage" : "practical";
  return { style, need };
}

// What the coach moves to later in the week (result screen)
const WAIT = {
  work: ["Clear the inbox", "Thursday"], home: ["Fix the dishwasher", "Saturday"], health: ["Plan next week's meals", "Sunday"],
  money: ["Sort the bills folder", "Friday"], people: ["Reply to the group chat", "Thursday"],
};
export function canWait(answers) {
  const picked = answers.pile && answers.pile.length ? answers.pile : ["work", "home"];
  const rest = picked.slice(1).concat(Object.keys(WAIT).filter((k) => !picked.includes(k))).slice(0, 3);
  return rest.map((k) => ({ what: WAIT[k][0], when: WAIT[k][1] }));
}

// Paywall-model experiment: weekly plans vs annual plan with a free trial. Prices are illustrative.
export const PAYWALLS = {
  weekly: {
    default: "4w",
    plans: [
      { id: "1w", name: "1 week", price: 6.99, perDay: 1.0, renew: "then $6.99 every week", interval: "week", count: 1, days: 7 },
      { id: "4w", name: "4 weeks", price: 19.99, perDay: 0.71, renew: "then $19.99 every 4 weeks", interval: "week", count: 4, days: 28, popular: true },
      { id: "12w", name: "12 weeks", price: 39.99, perDay: 0.48, renew: "then $39.99 every 12 weeks", interval: "week", count: 12, days: 84 },
    ],
  },
  annual_trial: {
    default: "year",
    plans: [
      { id: "year", name: "Yearly, 7 days free", price: 79.99, perDay: 0.22, renew: "$0 today, then $79.99 per year", interval: "year", count: 1, days: 365, trialDays: 7, popular: true },
      { id: "month", name: "Monthly", price: 19.99, perDay: 0.66, renew: "then $19.99 every month", interval: "month", count: 1, days: 30 },
    ],
  },
};
export const ALL_PLANS = [...PAYWALLS.weekly.plans, ...PAYWALLS.annual_trial.plans];

export const UPSELLS = {
  single: { id: "sunday_review", title: "Add Sunday reviews", price: 9.99,
    items: ["Every Sunday your coach walks you through the week ahead", "One page: what's first, what can wait"] },
  bundle: { id: "voice_review", title: "Add voice check-ins + Sunday reviews", price: 14.99, was: 24.98,
    items: ["Talk to your coach by voice on busy days", "Sunday review of the week ahead", "Weekly summary by email"] },
};

// Used when no GrowthBook client key is set: the same experiments, assigned locally by user id.
const exp = (key, variations) => ({ defaultValue: variations[0], rules: [{ key, variations, weights: variations.map(() => 1 / variations.length), hashAttribute: "id" }] });
export const OFFLINE_FEATURES = {
  "quiz-length": exp("quiz-length", ["short", "long"]),
  "paywall-model": exp("paywall-model", ["weekly", "annual_trial"]),
  "chat-mode": exp("chat-mode", ["scripted", "llm"]),
  "upsell-offer": exp("upsell-offer", ["single", "bundle"]),
};

export function renewalDate(days) {
  const d = new Date(Date.now() + days * 864e5);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
