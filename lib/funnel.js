// Funnel content and experiment definitions for the Ascend demo (a made-up product for a portfolio case).

// First screen is adapted to the creative angle the visitor came from (?angle= or utm_content=)
export const ANGLES = {
  default: {
    title: "Reach your goals with a coach in your pocket",
    sub: "Answer 8 quick questions and get a 4-week plan built around your goal, your schedule and the way you like to be coached.",
  },
  career: {
    title: "Get the promotion plan you keep putting off",
    sub: "A daily 10-minute coaching check-in that turns \"someday\" into weekly steps at work.",
  },
  procrastination: {
    title: "Stop starting over every Monday",
    sub: "Small daily steps, reminders and an AI coach that notices when you drift and helps you restart the same day.",
  },
  confidence: {
    title: "Speak up in meetings without overthinking it",
    sub: "Practice the conversations that matter with a coach that is available whenever you need it.",
  },
};

export const STEPS = [
  { id: "goal", type: "single", q: "What do you want to improve most?",
    options: ["Career growth", "Productivity and focus", "Confidence", "Habits and health", "Relationships"] },
  { id: "blocker", type: "single", q: "What gets in the way most often?",
    options: ["I procrastinate", "Too many priorities", "Self-doubt", "No clear plan", "I'm tired and burned out"] },
  { id: "style", type: "single", q: "How do you like to be coached?",
    options: ["Direct, push me", "Supportive and calm", "Structured, with checklists"] },
  { id: "time", type: "single", q: "How much time can you give it per day?",
    options: ["5 minutes", "10 minutes", "20 minutes or more"] },
  { id: "how", type: "info", q: "How Ascend works",
    bullets: ["A 4-week plan built from your answers", "A short daily check-in with your AI coach", "Reminders at the time you choose", "Weekly review: what worked, what to change"] },
  { id: "horizon", type: "single", q: "When would you like to see the first results?",
    options: ["In 2 weeks", "In a month", "In 3 months"] },
  { id: "momentum", type: "single", q: "\"I start strong but lose momentum after a week.\"",
    options: ["That's me", "Sometimes", "Not really"] },
  { id: "email", type: "email", q: "Where should we send your plan?" },
];

export const PLANS = [
  { id: "1w", name: "1-week trial", price: 6.99, perDay: 1.0, note: "then $19.99 every 4 weeks" },
  { id: "4w", name: "4-week plan", price: 19.99, perDay: 0.71, note: "renews every 4 weeks", popular: true },
  { id: "12w", name: "12-week plan", price: 39.99, perDay: 0.48, note: "renews every 12 weeks" },
];

export const UPSELLS = {
  single: { id: "workbook", title: "Add the Goal Workbook", price: 9.99,
    items: ["Printable 4-week workbook that matches your plan", "Weekly review templates"] },
  bundle: { id: "workbook_accountability", title: "Add the Momentum Pack", price: 14.99, was: 24.98,
    items: ["Goal Workbook", "30-day accountability program: your coach checks in if you miss a day", "Weekly progress report by email"] },
};

// Used when no GrowthBook client key is set: same experiments, assigned locally by user id.
export const OFFLINE_FEATURES = {
  "paywall-layout": {
    defaultValue: "control",
    rules: [{ key: "paywall-layout", variations: ["control", "plan_preview"], weights: [0.5, 0.5], hashAttribute: "id" }],
  },
  "upsell-offer": {
    defaultValue: "single",
    rules: [{ key: "upsell-offer", variations: ["single", "bundle"], weights: [0.5, 0.5], hashAttribute: "id" }],
  },
};

export function roadmap(answers) {
  const goal = (answers.goal || "your goal").toLowerCase();
  const t = answers.time || "10 minutes";
  return [
    { w: "Week 1", t: `Pick one concrete outcome for ${goal} and a ${t.replace(" or more", "")} daily slot` },
    { w: "Week 2", t: answers.blocker === "I procrastinate" ? "Two-minute starts: lower the bar until starting is easy" : "Clear the biggest blocker you named" },
    { w: "Week 3", t: "Build the routine: same time, same trigger, coach check-in" },
    { w: "Week 4", t: "Review what worked and set the next 4 weeks" },
  ];
}
