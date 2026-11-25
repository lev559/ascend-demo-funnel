# Mixpanel setup (v3)

## Projects and environments

| Project | Gets | Token in |
|---|---|---|
| **Quietly (prod)** | Live site + the simulated 6-month history (`simulated = true`) | Vercel env `NEXT_PUBLIC_MIXPANEL_TOKEN` (Production) and `MIXPANEL_TOKEN` (server) |
| **Quietly (dev)** | Local and preview builds, a ~3% sample of the simulation for testing reports | Vercel env (Preview, Development) and `.env.local` |
| duskwise-simulated (old) | Funnel-only dataset v2. Kept read-only because the old public board links to it | — |

Both new projects: EU data residency, Simplified ID Merge (the default for new projects), timezone UTC.

## Load order

1. `python3 scripts/mixpanel_v3.py lexicon --send`: descriptions, categories and owners for 48 events and the profile properties. The deprecated `purchase_completed` is hidden.
2. `python3 scripts/mixpanel_v3.py events --send` (prod) or `events --sample 20000 --send` (dev). About 714K events.
3. `python3 scripts/mixpanel_v3.py profiles --send`: 9K profiles with plan, status, LTV and acquisition channel.

Budget: the Free plan allows 1M events per month across the organisation, counted at ingestion. November already has ~447K from v2, so the prod import runs on **December 1**, and dev gets only the sample.

## Boards

Every report on a board is built from the definitions in [METRICS.md](METRICS.md). On the Free plan formulas can't be saved for reuse, so each formula lives inside its report.

**1. Executive weekly (public)**
- North Star: weekly engaged subscribers, line, 7-day rolling.
- Net revenue by week, stacked: new, trial conversion, renewal, upsell, refunds (refunds as a negative series).
- New subscribers by week and paywall CVR.
- Blended CAC and D30 LTV by signup month (spend imported as events from `ad_spend.csv`, or kept in the analysis memo).
- Guardrails table: refund rate, cancel within 24 h, AI fallback rate, chat p75 latency.

**2. Funnel**
- Main funnel `landing_viewed → quiz_started → situation_written → coach_matched → chat_completed → email_submitted → paywall_viewed → subscription_started`, 1-day window, broken down by channel.
- Quiz drop-off by `step_id`.
- Time to convert.
- Funnel by OS (watch for tracking breaks).

**3. Experiments**
- One funnel per test, filtered to its window and split by `exp_*`.
- Mixpanel Experiments report on `$experiment_started` (Free plan: 1K exposed users a month, so used on the current test only).
- A holdout comparison for each shipped test.

**4. Acquisition and unit economics**
- Visitors, CVR and subscribers by channel and angle.
- `ltv_usd` by `acquisition_channel` (profiles).
- Payback table from memo 2.

**5. Retention and engagement**
- Retention `subscription_started → subscription_renewed`, by plan.
- Activation funnel `subscription_started → app_login (24 h) → coach_session_started (72 h)`.
- Cancellation reasons.
- Weekly active app users by `coach`.

## Alerts

Mixpanel alerts aren't on the Free plan. `scripts/alerts.py` runs the same rule on the export (see memo 4); on a paid plan the same six metrics become Mixpanel alerts with the thresholds from [METRICS.md](METRICS.md).
