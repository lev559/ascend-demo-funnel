# Ascend — demo web2app funnel with A/B testing stack

A portfolio project: a quiz → paywall → upsell funnel for a made-up AI-coach subscription, wired to the
tools a growth / product marketing team uses every day. **Not a real product. Payments run in Stripe test mode only.
The experiment data in `data/` is simulated** (see `scripts/simulate_traffic.py`).

| Layer | Tool | Where in the code |
| --- | --- | --- |
| Funnel (quiz, paywall, upsell) | Next.js 15 on Vercel | `app/page.jsx`, `app/upsell/page.jsx`, content in `lib/funnel.js` |
| Experiments | GrowthBook (feature flags + experiment rules) | `app/providers.jsx`, features `paywall-layout`, `upsell-offer` |
| Product analytics | Mixpanel | `lib/analytics.js` (one `track()` for everything) |
| Ad tracking | Google Tag Manager → Meta Pixel / GA4 | `app/layout.jsx` (every event is also pushed to `dataLayer`) |
| Payments | Stripe Checkout, test mode | `app/api/checkout/route.js` |
| Creative angles | `?angle=procrastination|career|confidence` swaps the first screen | `ANGLES` in `lib/funnel.js` |
| Simulated traffic + read-out | Python, DuckDB | `scripts/` |

Without any keys the funnel still works: experiments are assigned locally, events are printed to the browser console,
and checkout shows a "simulate payment" screen.

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
