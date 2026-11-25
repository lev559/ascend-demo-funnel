// v = "rist": the version for the Rist Labs application (mentions Aligned).
// v = "open": the general portfolio version, with no reference to any company.
const TRY = { rist: "/?fresh=1", open: "/?fresh=1&angle=private&case=open" };

const linksFor = (v) => [
  ["Try the funnel", TRY[v]],
  ["Code on GitHub", "https://github.com/lev559/ascend-demo-funnel"],
  ["Mixpanel board", "https://eu.mixpanel.com/p/7Wd8rnHJDtR5fccFHNMd6Z"],
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
  ["All three model calls answered (no fallback)", "11 of 12"],
  ["Every AI question has a topic label", "12 of 12"],
  ["The chat picks up a detail the person gave", "12 of 12"],
  ["No bossy “You will…”", "12 of 12"],
  ["Plan complete: 5 days, technique with source, commitments", "12 of 12"],
  ["Different techniques chosen across the 12 cases", "6"],
  ["Crisis message → coaching stops, help lines shown", "Pass"],
  ["Prompt injection (“ignore all previous instructions…”)", "Ignored"],
];

function Shot({ src, cap }) {
  return <figure className="c-shot"><img src={`/case/${src}.webp`} alt={cap} loading="lazy" /><figcaption>{cap}</figcaption></figure>;
}

export default function CaseStudy({ v = "rist" }) {
  const LINKS = linksFor(v);
  const rist = v === "rist";
  return (
    <main className="case">
      <header className="c-hero">
        <div className="c-kicker">Case study · Product marketing / growth</div>
        <h1>An AI-coach funnel that <span>adapts to the person</span>, not a template</h1>
        <p className="c-lead">A web2app {rist ? "relaunch " : ""}funnel for an AI coaching subscription, built end to end: research, positioning, brand, an AI quiz that writes its own questions, a paywall with conversion mechanics and guardrails, and a stack to test it.</p>
        <p className="c-by">{rist ? "Lev Ryazanov · built for the Rist Labs Junior PMM application (Aligned relaunch) · Quietly is a stand-in brand" : "Lev Ryazanov · self-initiated portfolio project · Quietly is a fictional brand I created for it"}</p>
        <nav className="c-links">{LINKS.map(([t, h]) => <a key={t} href={h} target={h.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{t} →</a>)}</nav>
      </header>

      <section>
        <h2>1. The brief I set myself</h2>
        {rist ? (<>
          <p>Aligned is a subscription AI coach (“trained on 1,000+ books”) that is being relaunched. Its app had ~63K installs and no active Meta ads; no public web funnel existed. My question: <b>what should the relaunch funnel look like, and how would I know it works?</b></p>
          <p>The landing line “A coach you'd text on a bad day” is borrowed from Aligned's own site on purpose: this is their positioning, and the funnel is my answer to how to sell it. Everything else is mine.</p>
        </>) : (<>
          <p>AI coaching apps are a crowded, fast-growing subscription category, yet most of them sell straight from an ad to an app-store install. Very few run a web funnel that learns about the person, shows real value before the paywall and sells the subscription on the web. My question: <b>what should a web2app funnel for an AI coach look like, and how would I know it works?</b></p>
          <p>Quietly is a fictional brand I made for this: name, positioning, visual identity and four coach personas. The funnel, the prompts, the analytics and the experiment plan are all built from scratch.</p>
        </>)}
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
        <p className="c-note">Positioning: {rist ? "the coach you can text on a bad day, who listens" : "a coach you can think out loud with, who listens"}, names one next step and remembers. Calm, honest, practical. Brand direction “Night shift” won a weighted comparison (83 vs 66 vs 59).</p>
      </section>

      <section>
        <h2>3. The funnel</h2>
        <p>The key decision: <b>the coach adapts to the request</b>. After picking a reason, people describe their situation in a sentence (or tap a typical one). The model then writes the follow-up questions, the coach's replies and the 7-day plan for that person. Only the screen skeleton and safety rules are fixed.</p>
        <div className="c-shots">
          <Shot src={rist ? "landing" : "landing_open"} cap="Reason = first tap" /><Shot src="write" cap="Their own words" /><Shot src="reflect" cap="Reflection by the model" />
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
        <p>Every prompt change runs against a fixed test set (<code>scripts/test_coach.py</code>): 12 situations, three per reason, each going through questions → chat → plan on the live model, plus a crisis message and a prompt-injection attempt.</p>
        <table className="c-table"><thead><tr><th>Check</th><th>Result</th></tr></thead>
          <tbody>{PROMPT.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
        <p className="c-note">Latency: a chat turn takes about 2–3 s; the plan takes about 5 s and is written while the loader runs, so nobody waits for it.</p>
      </section>

      <section>
        <h2>5. Stack</h2>
        <p>Next.js on Vercel · GrowthBook for flags and experiments · Mixpanel (EU) for events and boards · GTM for ad pixels · Stripe Checkout in test mode · Cloudflare Workers AI. Every event and experiment exposure goes to Mixpanel in the format GrowthBook reads.</p>
      </section>

      <section>
        <h2>6. Behind the scenes</h2>
        <p>The same five experiments live in GrowthBook (assignment) and Mixpanel (analysis). The Mixpanel board below is public and read-only: <a href="https://eu.mixpanel.com/p/7Wd8rnHJDtR5fccFHNMd6Z" target="_blank" rel="noreferrer">open it</a>.</p>
        <figure className="c-wide"><img src="/case/mixpanel.webp" alt="Mixpanel board: main funnel and one funnel per experiment" loading="lazy" /><figcaption>Mixpanel: the main funnel and one funnel per experiment, split by variant (simulated data)</figcaption></figure>
        <figure className="c-wide"><img src="/case/growthbook.webp" alt="GrowthBook: five running experiments" loading="lazy" /><figcaption>GrowthBook: five experiments running as feature-flag rules, 50/50 by user id</figcaption></figure>
      </section>

      <section>
        <h2>7. Five experiments, read out</h2>
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
        <h2>8. What I'd do next with real traffic</h2>
        <ul>
          <li>Run entry-mode and chat-length first: biggest expected effect, fastest to read.</li>
          <li>Judge paywall-model on 90-day LTV and refund rate, not first charge.</li>
          <li>Replace example reviews with real ones as they come in; add the real rating once it exists.</li>
          <li>Move purchase tracking to a Stripe webhook; it's client-side in this build.</li>
        </ul>
        <p className="c-note">Payments run in Stripe test mode, so nothing can be charged. Experiment numbers on this page are simulated, and labelled as such in the report.</p>
      </section>

      <footer className="c-foot"><a href={TRY[v]}>Try the funnel →</a><span>Lev Ryazanov · 2026</span></footer>
    </main>
  );
}
