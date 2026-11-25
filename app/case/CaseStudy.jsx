// v = "rist": the version for the Rist Labs application (mentions Aligned).
// v = "open": the general portfolio version, with no reference to any company.
const TRY = { rist: "/?fresh=1", open: "/?fresh=1&angle=private&case=open" };

const linksFor = (v) => [
  ["Try the funnel", TRY[v]],
  ["Code on GitHub", "https://github.com/lev559/ascend-demo-funnel"],
  ["Analytics memos", "https://github.com/lev559/ascend-demo-funnel/tree/main/analytics"],
];

const EXPERIMENTS = [
  { key: "entry-mode", a: "write", b: "tap", when: "Jun", hyp: "Tapping a typical situation beats an empty text box on mobile.",
    lead: "Situation submitted 45.8% → 51.8% (+13%, p < 0.001)", rev: "Revenue/visitor −7% [−54%, +41%]: unreadable, MDE 71%",
    call: "Ship tap with a 5% holdout. The holdout is the revenue check." },
  { key: "quiz-length", a: "short", b: "long", when: "Jul", hyp: "More context before the paywall converts better on it.",
    lead: "Paywall reached 15.2% → 13.0% (−14%, p = 0.008)", rev: "Revenue/visitor −5%, not significant",
    call: "Keep short. The cost is certain, the benefit isn't visible." },
  { key: "chat-length", a: "2 turns", b: "4 turns", when: "Aug", hyp: "A longer chat gives more value and lifts email and paywall.",
    lead: "Email given 16.3% → 12.8% (−21%, p < 0.001)", rev: "Revenue/visitor −35% [−69%, −1%], p = 0.04",
    call: "Keep 2 turns. Value that costs completion loses money." },
  { key: "paywall-model", a: "weekly", b: "annual + 7-day trial", when: "Sep–Oct", hyp: "An annual trial earns more per paywall viewer than weekly plans.",
    lead: "Subscribed 10.6% → 12.3% (+16%, p = 0.20)", rev: "Revenue/viewer D30 +7%, not significant",
    call: "Ship as a business call: blended CAC fell from $53 to $43. Holdout until Dec 12." },
  { key: "upsell-offer", a: "single $9.99", b: "bundle $14.99", when: "Oct–Nov", hyp: "A bigger bundle earns more per buyer.",
    lead: "Bought 20.1% → 16.2% (p = 0.38)", rev: "Revenue/viewer +21% [−33%, +75%]",
    call: "Not called: 300 viewers, ~3,000 needed. Test a bigger change instead." },
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
        <ul>
          <li><b>GrowthBook</b> assigns each test as a feature-flag rule (50/50 by anonymous id) and sends the exposure to Mixpanel as <code>$experiment_started</code>; the variant also rides on every later event as <code>exp_*</code>.</li>
          <li><b>Mixpanel</b> has separate prod and dev projects (EU), Simplified ID Merge, and a Lexicon generated from the tracking plan.</li>
          <li><b>Stripe</b> carries the user id and variants in metadata, so webhook revenue lands on the same person and the same test arm.</li>
          <li><b>Checks</b>: the tracking-plan validator and the daily anomaly rule run on the export.</li>
        </ul>
      </section>

      <section>
        <h2>7. Six months of experiments, one at a time</h2>
        <p className="c-note">The site has almost no real traffic, so I simulated six months of it (Jun–Nov 2026: 56K visitors, 714K events, 1,000 subscribers with renewals, refunds and app usage) with known “true” effects, and analysed it like real data. Simulated numbers are labelled everywhere.</p>
        <p>At ~300 visitors a day, a 4-week test can't detect less than a 50–70% change in revenue per visitor. So each test was decided on a pre-registered leading indicator, with revenue as a guardrail and a 5% holdout after shipping.</p>
        <figure className="c-wide"><img src="/case/a_experiments.webp" alt="Five tests: lift with 95% confidence intervals for revenue and for the leading indicator" loading="lazy" /></figure>
        <div className="c-exps">{EXPERIMENTS.map((x) => (
          <div className="c-exp" key={x.key}>
            <div className="c-exp-h"><code>{x.key}</code><span>{x.a} vs {x.b} · {x.when}</span></div>
            <p><i>{x.hyp}</i></p>
            <p><b>Leading indicator:</b> {x.lead}</p>
            <p className="c-side">{x.rev}</p>
            <p className="c-call">{x.call}</p>
          </div>))}</div>
      </section>

      <section>
        <h2>8. Analytics the way a data team runs it</h2>
        <ul>
          <li><b>Tracking plan as code.</b> 48 events with owners and typed properties in one JSON file; a validator checks any export against it. Running it on the live funnel found a real bug: an event property named <code>length</code> makes the Mixpanel SDK drop <i>every</i> property of that event.</li>
          <li><b>Revenue from the server.</b> A Stripe webhook sends purchases, trial conversions, renewals, failed payments, cancellations and refunds. In the migration window the old browser event missed 7.5% of purchases and under-counted revenue by 3.5%.</li>
          <li><b>One person across web, payments and app.</b> Anonymous device id until the email, then <code>identify</code>; the same id travels in Stripe metadata and signs into the app.</li>
          <li><b>Monitoring.</b> A daily anomaly rule (robust z against the same weekday) caught both incidents in six months and nothing else: an Android release that stopped sending paywall views, and a model outage that pushed AI fallbacks from 4% to 28%.</li>
        </ul>
        <figure className="c-wide"><img src="/case/a_ltv_payback.webp" alt="Cumulative LTV by channel against CAC" loading="lazy" /><figcaption>TikTok converts worst and pays back first (~61 days); Google converts best and doesn't pay back within 120 days at today's bids</figcaption></figure>
        <figure className="c-wide"><img src="/case/a_retention.webp" alt="Renewal of 4-week subscribers, activated vs not" loading="lazy" /><figcaption>53% of cancellations say “not using it”. Subscribers who start in the app within 72 h renew at 73% vs 55%, and only 41% do</figcaption></figure>
        <figure className="c-wide"><img src="/case/a_alerts.webp" alt="AI fallback rate with alert days" loading="lazy" /><figcaption>The monitoring rule fired on the outage day</figcaption></figure>
        <p>Four memos with the decisions, a metrics dictionary with a North Star (weekly engaged subscribers), an experiment playbook and the Mixpanel setup (prod and dev projects, Lexicon, five boards) are <a href="https://github.com/lev559/ascend-demo-funnel/tree/main/analytics" target="_blank" rel="noreferrer">in the repo</a>.</p>
      </section>

      <section>
        <h2>9. What I'd do next with real traffic</h2>
        <ul>
          <li>Fix activation first: a magic-link sign-in on the success page and the first coach message waiting in the app. It moves renewal and, through LTV, every channel's payback.</li>
          <li>Test the paywall without the 1-week plan: it sells the cheapest first charge and almost nobody is still paying at day 35.</li>
          <li>Shift 15–20% of the Google budget to TikTok angles that convert, then confirm with a 4-week geo holdout.</li>
          <li>Replace example reviews with real ones as they come in; add the real rating once it exists.</li>
        </ul>
        <p className="c-note">Payments run in Stripe test mode, so nothing can be charged. Experiment and revenue numbers on this page are simulated, and labelled as such in the memos.</p>
      </section>

      <footer className="c-foot"><a href={TRY[v]}>Try the funnel →</a><span>Lev Ryazanov · 2026</span></footer>
    </main>
  );
}
