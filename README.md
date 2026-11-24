# Duskwise — demo web2app funnel for an AI coach, with an A/B testing stack

A portfolio project: quiz → coach match → mini-chat with the coach → plan → paywall → upsell, for a made-up AI-coach
subscription ("the coach that remembers your week and tells you what can wait"), wired to the tools a growth team uses.
**Not a real product. Payments run in Stripe test mode only. The experiment data in `data/` is simulated.**

| Layer | Tool | Where in the code |
| --- | --- | --- |
| Funnel | Next.js 15 on Vercel | `app/page.jsx` (all screens), content in `lib/funnel.js`, brand tokens in `app/globals.css` |
| Coach chat | Scripted by default, LLM optional (Cloudflare Workers AI) | `lib/coaches.js`, `lib/safety.js`, `app/api/coach/route.js` |
| Experiments | GrowthBook | features `quiz-length`, `paywall-model`, `chat-mode`, `upsell-offer` (`lib/funnel.js` has offline defaults) |
| Product analytics | Mixpanel (EU) | `lib/analytics.js` (one `track()` for everything) |
| Ad tracking | GTM → Meta Pixel / GA4 | `app/layout.jsx` (every event is also pushed to `dataLayer`) |
| Payments | Stripe Checkout, test mode | `app/api/checkout/route.js` (weekly plans or annual with 7-day trial) |
| Creative angles | `?angle=overload|sunday|start|lost|private|voice` | `ANGLES` in `lib/funnel.js` |
| Public IDs | Mixpanel token, GrowthBook client key, GTM ID, LLM endpoint | `lib/config.js` (env vars override) |

Secrets live only in Vercel environment variables: `LLM_API_KEY` (Cloudflare token) and `STRIPE_SECRET_KEY` (`sk_test_…`).
Without any keys the funnel still works: experiments are assigned locally, events go to the browser console,
the chat is scripted and checkout shows a "simulate payment" screen.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in what you have, everything is optional
npm run dev                  # http://localhost:3000/?angle=procrastination
```

## Set up the stack (about 1 hour, all free tiers)

### 1. GitHub + Vercel (hosting)
1. Create a GitHub repo and push this folder.
2. vercel.com → Add New Project → import the repo → Deploy.
3. Project → Settings → Environment Variables: add the keys from the steps below, then Redeploy.

### 2. Mixpanel (analytics)
1. Create **two** projects: `ascend-live` (real clicks on the deployed funnel) and `ascend-simulated` (generated data). Never mix them.
2. Live project → Settings → copy the **Project token** → `NEXT_PUBLIC_MIXPANEL_TOKEN` in Vercel.
3. Simulated project → Settings → Service accounts → create one with Admin role. Then:
   ```bash
   python3 scripts/simulate_traffic.py
   export MIXPANEL_PROJECT_ID=... MIXPANEL_SA_USERNAME=... MIXPANEL_SA_SECRET=...
   python3 scripts/mixpanel_import.py --send
   ```
4. Build a board: Funnels report `landing_viewed → quiz_started → email_submitted → paywall_viewed → checkout_started → purchase_completed`,
   broken down by `layout`; Insights: sum of `revenue` by `angle`; Funnels `upsell_viewed → upsell_purchased` by `variant`.

### 3. GrowthBook (experiments)
1. app.growthbook.io → SDK Connections → new connection (JavaScript/React) → copy the client key → `NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY`.
2. Features → add `paywall-layout` (string, default `control`) → Add rule → Experiment, key `paywall-layout`,
   variations `control` / `plan_preview`, 50/50, assign by `id`.
3. Same for `upsell-offer` (default `single`, variations `single` / `bundle`).
4. Analysis → Data sources → Mixpanel (service account + project ID). Exposure event: `$experiment_started`,
   properties `Experiment name` and `Variant name` — exactly what `app/providers.jsx` sends.
5. Metrics: `Purchase` (binomial, event `purchase_completed`), `Revenue` (sum of `revenue` on `purchase_completed`),
   `Upsell take` (binomial, `upsell_purchased`), `Upsell revenue` (sum of `revenue` on `upsell_purchased`).

### 4. Google Tag Manager + Meta Pixel
1. tagmanager.google.com → new web container → copy `GTM-XXXX` → `NEXT_PUBLIC_GTM_ID`.
2. Add the Meta Pixel template; fire `PageView` on all pages, `Lead` on the custom event `email_submitted`,
   `Purchase` on `purchase_completed` with value `{{revenue}}` (Data Layer Variable).
3. Check it with GTM Preview and Meta Events Manager → Test events.

### 5. Stripe (test mode)
1. dashboard.stripe.com → switch on **Test mode** → Developers → API keys → secret key (`sk_test_...`) → `STRIPE_SECRET_KEY`.
2. Pay with the test card `4242 4242 4242 4242`, any future date, any CVC. The code refuses live keys.
3. In production the purchase event would come from a Stripe webhook, not from the browser redirect.

## Experiment read-out

```bash
python3 scripts/simulate_traffic.py   # 3 weeks of simulated traffic, assumptions in data/assumptions.json
python3 scripts/analyse.py            # funnel, angles, both tests with confidence intervals, charts in charts/
```

## Coach chat: scripted by default, LLM optional

Screen 5 of the funnel is a 3-message chat with the matched coach (`lib/coaches.js`, `app/api/coach/route.js`).

| Turn | What the coach says | Source |
| --- | --- | --- |
| 1 | Opener: "what's the heaviest thing on your plate this week?" | script, per coach |
| 2 | Repeats back what the user wrote + names one thing for tonight + what can wait | LLM if configured, else script |
| 3 | "How long can you give it tonight?" + quick replies | script |

Safety: every user message goes through `lib/safety.js` first. Crisis language stops coaching and shows help lines (988 in the US, Samaritans 116 123 in the UK/IE, findahelpline.com). Model replies that are too long, contain links or mention diagnoses/medication are replaced by the scripted line. A 2.5 s timeout or any provider error also falls back to the script, so the funnel never waits on the model.

Turn on LLM mode with three environment variables (any OpenAI-compatible endpoint): `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Track `chat_mode` (`scripted | llm | fallback | safety`) in Mixpanel to A/B test scripted vs LLM.
