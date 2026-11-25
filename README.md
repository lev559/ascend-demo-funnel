# Quietly: an adaptive AI-coach web2app funnel, with an A/B testing stack

Case study: **[/case](https://ascend-demo-funnel.vercel.app/case)** · Live funnel: **[ascend-demo-funnel.vercel.app](https://ascend-demo-funnel.vercel.app)**

Reason → situation in their own words → AI-written questions → name → pick a voice (= coach) → chat with the coach →
plan written for them → email → plan → commitment → paywall → upsell. Built as a portfolio case for an AI-coach relaunch.
Payments run in Stripe test mode only; the experiment data in `data/` is simulated (`scripts/simulate_traffic.py`).

| Layer | Tool | Where in the code |
| --- | --- | --- |
| Funnel | Next.js 15 on Vercel | `app/page.jsx` (all screens), content in `lib/funnel.js`, styles in `app/globals.css` |
| AI coach | Cloudflare Workers AI (Llama 3.3 70B), OpenAI-compatible | `app/api/coach/{questions,route,plan}`, prompts in `lib/coachPrompt.js`, fallbacks in `lib/fallbacks.js`, safety in `lib/safety.js` |
| Experiments | GrowthBook | `quiz-length`, `entry-mode`, `chat-length`, `paywall-model`, `upsell-offer` (offline defaults in `lib/funnel.js`) |
| Product analytics | Mixpanel (EU) | `lib/analytics.js` (one `track()` for everything) |
| Ad tracking | GTM → Meta Pixel / GA4 | `app/layout.jsx` (every event is also pushed to `dataLayer`) |
| Payments | Stripe Checkout, test mode | `app/api/checkout/route.js` (intro price via one-time coupon, annual plan with 7-day trial) |
| Simulation + read-out | Python | `scripts/simulate_traffic.py`, `scripts/analyse.py` → `data/report.md`, `scripts/mixpanel_import.py` |
| Prompt tests | Python | `scripts/test_coach.py` (fixed set of messages, run against the live API) |

Secrets live only in Vercel environment variables: `LLM_API_KEY` (Cloudflare token) and `STRIPE_SECRET_KEY` (`sk_test_…`).

## Production notes (what this build does not do yet)
- **Purchases are tracked from the browser** after Stripe redirects back. In production `purchase_completed`, renewals,
  refunds and `trial_converted` come from a Stripe webhook (`checkout.session.completed`, `invoice.paid`, `charge.refunded`).
- **Free LLM tier** covers roughly 15–20 full runs a day; after that the written fallbacks take over.
- **Reviews on the paywall are labelled examples** until real ones exist.

## Run locally

```bash
npm install
cp .env.example .env.local   # everything is optional
npm run dev                  # http://localhost:3000/?angle=lost
```
Without keys the funnel still works end to end: experiments are assigned locally, events go to the console,
the coach uses its written fallbacks and checkout is unavailable.

## How the AI coach works

Three server routes call the model; the key never reaches the browser.

| Route | When | Returns |
| --- | --- | --- |
| `POST /api/coach/questions` | while the person answers the general questions | reflection + 3 or 5 questions written for their situation, each with a short label |
| `POST /api/coach` | each chat turn (2 or 4, `chat-length` test) | the coach's message + 2 quick replies |
| `POST /api/coach/plan` | during the loader | profile, insight, next step, technique + source, 5 days, 4 commitments, now/soon/goal for the paywall |

Guardrails: user text is wrapped as data (`<user_data>`) so instructions inside it are ignored; crisis language is
checked in 6 languages (`lib/safety.js`) and the model also returns a `risk` flag, after which coaching stops and help
lines are shown; replies with links, diagnoses or medication are rejected; any timeout or error uses the written
fallback for the person's reason (`lib/fallbacks.js`). `scripts/test_coach.py` runs a fixed test set against the live API.

## Experiments (GrowthBook)

| Key | Variants | Exposed on |
| --- | --- | --- |
| `entry-mode` | `write` / `tap` | landing |
| `quiz-length` | `short` / `long` | landing |
| `chat-length` | `2` / `4` | landing |
| `paywall-model` | `weekly` / `annual_trial` | paywall |
| `upsell-offer` | `single` / `bundle` | upsell |

Every exposure is sent to Mixpanel as `$experiment_started` with `Experiment name` and `Variant name`, the format
GrowthBook's Mixpanel data source reads. If a feature is missing in GrowthBook, the same split runs locally (`OFFLINE_FEATURES`).

## Simulated read-out

```bash
python3 scripts/simulate_traffic.py   # 3 weeks of paid-social traffic; assumed effects in RATES, saved to data/assumptions.json
python3 scripts/analyse.py            # per-experiment read-out with CIs and p-values -> data/report.md
export MIXPANEL_PROJECT_ID=... MIXPANEL_SA_USERNAME=... MIXPANEL_SA_SECRET=... MIXPANEL_REGION=api-eu
python3 scripts/mixpanel_import.py --send [--from N --to M]   # streamed, resumable upload
```

## Stack setup (free tiers)
- **Vercel:** import the repo; env vars `LLM_API_KEY`, `STRIPE_SECRET_KEY`.
- **Mixpanel (EU):** one project for live events (token in `lib/config.js`), one for simulated data (service account for the import).
- **GrowthBook:** React SDK connection (client key in `lib/config.js`), the five features above as experiment rules, assigned by `id`.
- **GTM:** container ID in `lib/config.js`; Data Layer Variables for `revenue`, `plan`, `paywall_model`, `Experiment name`, `Variant name`.
- **Stripe:** test mode only (`sk_test_…`); the code refuses live keys. Test card `4242 4242 4242 4242`.
