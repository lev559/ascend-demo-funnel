export const metadata = {
  title: "Case study: an adaptive AI-coach funnel · Lev Ryazanov",
  description: "How I built a web2app relaunch funnel for an AI coach: research, positioning, an adaptive AI quiz, conversion mechanics with guardrails, and five experiments.",
  openGraph: { images: [{ url: "/og.png", width: 1200, height: 630 }] },
};

const LINKS = [
  ["Try the funnel", "/"],
  ["Code on GitHub", "https://github.com/lev559/ascend-demo-funnel"],
  ["Experiment read-out", "https://github.com/lev559/ascend-demo-funnel/blob/main/data/report.md"],
];

const EXPERIMENTS = [
  { key: "entry-mode", a: "write", b: "tap", hyp: "Tapping a typical situation first beats an empty text box on mobile paid traffic.",
    metric: "Revenue per visitor", res: "$0.401 → $0.487 (+22%), p = 0.13", side: "Situation submitted 74% → 86% (p < 0.001)",
    call: "Ship tap. The mechanism is strong and significant; revenue is directionally positive. Keep a holdout.", truth: "+7%" },
  { key: "quiz-length", a: "short", b: "long", hyp: "A longer quiz loses people before the paywall but converts better on it.",
    metric: "Revenue per visitor", res: "$0.381 → $0.506 (+33%), p = 0.03", side: "Paywall reach −8%, checkout on paywall +25%",
    call: "Don't ship yet. The lift is far above the assumed +7%: classic winner's curse at this sample. Re-run.", truth: "+7%" },
  { key: "chat-length", a: "2 turns", b: "4 turns", hyp: "A longer chat gives more value and lifts email and paywall conversion.",
    metric: "Revenue per visitor", res: "$0.528 → $0.359 (−32%), p = 0.003", side: "Chat finished 80% → 60%; email +3pp among those who reach it",
    call: "Keep 2 turns. Value in the chat doesn't pay for the people who drop out of it.", truth: "−13%" },
  { key: "paywall-model", a: "weekly", b: "annual + 7-day trial", hyp: "An annual plan with a trial earns more per paywall viewer than weekly plans.",
    metric: "Subscription revenue per viewer (matured trials)", res: "$2.75 → $4.98 (+81%), p < 0.001", side: "Revenue at purchase −68% (trials pay $0 up front)",
    call: "Ship annual trial, but judge on 90-day LTV and refunds: weekly renewals aren't in this window.", truth: "+" },
  { key: "upsell-offer", a: "single $9.99", b: "bundle $14.99", hyp: "A bigger bundle earns more per buyer than a single add-on.",
    metric: "Upsell revenue per viewer", res: "$2.44 → $1.93 (−21%), p = 0.22", side: "Take rate 24% → 13%",
    call: "Underpowered (≈250 buyers per arm). Keep running; don't call it.", truth: "+7%" },
];

const PROMPT = [
  ["“You will…” (bossy tone)", "9 of 15", "0"],
  ["One concrete step for tonight", "0", "14 of 14"],
  ["Step has a time box (10–30 min)", "0", "14 of 14"],
  ["People never “can wait” (sick parent, partner…)", "0 of 4", "4 of 4"],
];

function Shot({ src, cap }) {
  return <figure className="c-shot"><img src={`/case/${src}.webp`} alt={cap} loading="lazy" /><figcaption>{cap}</figcaption></figure>;
}

export default function Case() {
  return (
    <main className="case">
      <header className="c-hero">
        <div className="c-kicker">Case study · Product marketing / growth</div>
        <h1>An AI-coach funnel that <span>adapts to the person</span>, not a template</h1>
        <p className="c-lead">A web2app relaunch funnel for an AI coaching subscription, built end to end: research, positioning, brand, an AI quiz that writes its own questions, a paywall with conversion mechanics and guardrails, and a stack to test it.</p>
        <p className="c-by">Lev Ryazanov · built for the Rist Labs Junior PMM application (Aligned relaunch) · Duskwise is a stand-in brand</p>
        <nav className="c-links">{LINKS.map(([t, h]) => <a key={t} href={h} target={h.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{t} →</a>)}</nav>
      </header>

      <section>
        <h2>1. The brief I set myself</h2>
        <p>Aligned is a subscription AI coach (“trained on 1,000+ books”) that is being relaunched. Its app had ~63K installs and no active Meta ads; no public web funnel existed. My question: <b>what should the relaunch funnel look like, and how would I know it works?</b></p>
        <p>The landing line “A coach you'd text on a bad day” is borrowed from Aligned's own site on purpose: this is their positioning, and the funnel is my answer to how to sell it. Everything else is mine.</p>
      </section>

      <section>
        <h2>2. Research</h2>
        <div className="c-stats">
          <div><b>10</b>direct AI-coach competitors mapped</div>
          <div><b>11</b>self-help funnels walked to the paywall</div>
          <div><b>27</b>median questions before the paywall (39 screens)</div>
          <div><b>3,495</b>app reviews coded: billing = 76% of 1–2★</div>
        </div>
        <ul>
          <li>Only 2 AI-coach players run a real web quiz funnel (Purpose, Apt): a well-built one is a gap, not a copy.</li>
          <li>Competitors lean on quasi-diagnoses (“executive dysfunction” after a 3-minute quiz) and countdown timers. Reviews punish surprise billing hardest.</li>
          <li>Four personas as hypotheses: <i>too much at once</i>, <i>knows but doesn't start</i>, <i>at a crossroads</i>, <i>needs to talk it out</i>. Each gets its own ad angle and first-screen card.</li>
        </ul>
        <p className="c-note">Positioning: the coach you can text on a bad day, who listens, names one next step and remembers. Calm, honest, practical. Brand direction “Night shift” won a weighted comparison (83 vs 66 vs 59).</p>
      </section>

      <section>
        <h2>3. The funnel</h2>
        <p>The key decision: <b>the coach adapts to the request</b>. After picking a reason, people describe their situation in a sentence (or tap a typical one). The model then writes the follow-up questions, the coach's replies and the 7-day plan for that person. Only the screen skeleton and safety rules are fixed.</p>
        <div className="c-shots">
          <Shot src="landing" cap="Reason = first tap" /><Shot src="write" cap="Their own words" /><Shot src="reflect" cap="Reflection by the model" />
          <Shot src="voice" cap="Pick a voice = pick a coach" /><Shot src="match" cap="Why this coach" /><Shot src="chat" cap="Chat, each turn by the model" />
          <Shot src="plan" cap="Plan: insight, step, technique" /><Shot src="deal" cap="Commitment ritual" /><Shot src="paywall" cap="Paywall" />
        </div>
        <h3>Conversion mechanics, with guardrails</h3>
        <table className="c-table"><thead><tr><th>Mechanic</th><th>Guardrail</th></tr></thead><tbody>
          <tr><td>Intro-price timer in a sticky header</td><td>It doesn't reset and really expires; prices go back to full</td></tr>
          <tr><td>Promo code in the person's name</td><td>Intro price is shown next to the renewal price, with the renewal date</td></tr>
          <tr><td>Now → with coach, plan preview, their own chat quote</td><td>Goals framed as goals, not promised results</td></tr>
          <tr><td>Reviews block</td><td>Labelled as examples; the real proof is live replies from the coach</td></tr>
          <tr><td>Downsell for returning visitors</td><td>No timer; 30-day refund; cancel in two taps, reminder 3 days before renewal</td></tr>
        </tbody></table>
      </section>

      <section>
        <h2>4. Making the AI useful and safe</h2>
        <p>Three model calls (questions, chat, plan) on Cloudflare Workers AI, each with a written fallback so the funnel never breaks. User text is passed as data, never as instructions (prompt-injection guard). Crisis language is checked in 6 languages and flagged by the model itself; then coaching stops and help lines are shown.</p>
        <p>I tuned the coach prompt on a fixed set of 15 messages and compared versions:</p>
        <table className="c-table"><thead><tr><th>Check (15 test messages)</th><th>Prompt v1</th><th>Prompt v2</th></tr></thead>
          <tbody>{PROMPT.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody></table>
      </section>

      <section>
        <h2>5. Stack</h2>
        <p>Next.js on Vercel · GrowthBook for flags and experiments · Mixpanel (EU) for events and boards · GTM for ad pixels · Stripe Checkout in test mode · Cloudflare Workers AI. Every event and experiment exposure goes to Mixpanel in the format GrowthBook reads.</p>
      </section>

      <section>
        <h2>6. Five experiments, read out</h2>
        <p className="c-note">The site has almost no real traffic, so I simulated 3 weeks of paid social (28K visitors, 447K events) with assumed “true” effects, loaded it into Mixpanel and analysed it like real data. The point is the method: because I know the truth, I can see where the read-out misleads.</p>
        <div className="c-exps">{EXPERIMENTS.map((x) => (
          <div className="c-exp" key={x.key}>
            <div className="c-exp-h"><code>{x.key}</code><span>{x.a} vs {x.b}</span></div>
            <p><i>{x.hyp}</i></p>
            <p><b>{x.metric}:</b> {x.res}</p>
            <p className="c-side">{x.side}</p>
            <p className="c-call">{x.call}</p>
          </div>))}</div>
        <p><b>What the simulation taught me:</b> quiz-length came out at +33% (p = 0.03) while the assumed true effect was about +7%. A “significant” result at this sample size overstates the effect, so I'd re-run before shipping. And chat-length shows that a feature users like can still lose money when it costs completion.</p>
      </section>

      <section>
        <h2>7. What I'd do next with real traffic</h2>
        <ul>
          <li>Run entry-mode and chat-length first: biggest expected effect, fastest to read.</li>
          <li>Judge paywall-model on 90-day LTV and refund rate, not first charge.</li>
          <li>Replace example reviews with real ones as they come in; add the real rating once it exists.</li>
          <li>Move purchase tracking to a Stripe webhook; it's client-side in this build.</li>
        </ul>
        <p className="c-note">Payments run in Stripe test mode, so nothing can be charged. Experiment numbers on this page are simulated, and labelled as such in the report.</p>
      </section>

      <footer className="c-foot"><a href="/">Try the funnel →</a><span>Lev Ryazanov · 2026</span></footer>
    </main>
  );
}
