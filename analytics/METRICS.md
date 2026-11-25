# Metrics dictionary

One definition per metric, used the same way in Mixpanel, in `scripts/analyse.py` and in the case study.
Events and properties refer to [the tracking plan](TRACKING_PLAN.md). Money is USD, net of refunds unless a metric says "gross".

## North Star

**Weekly engaged subscribers (WES):** people with an active or trialing subscription who did at least one coaching action in the last 7 days
(`coach_session_started`, `plan_step_completed`, `checkin_answered` or `weekly_review_completed`).

Why this one: revenue in a subscription coach follows from people actually using the coach. Paid but idle users cancel at the next
renewal and ask for refunds; engaged users renew. WES moves before revenue does, so it is the earliest honest signal.

## Metric tree

```
Net revenue (period)
├── New-subscriber revenue
│   ├── Visitors                         landing_viewed, unique users
│   ├── × Quiz start rate                quiz_started / landing_viewed
│   ├── × Paywall reach                  paywall_viewed / quiz_started
│   ├── × Paywall conversion             subscription_started / paywall_viewed
│   └── × First charge                   revenue on subscription_started (0 for trials)
├── + Trial conversion revenue           trial_converted.revenue
├── + Renewal revenue                    subscription_renewed.revenue
│   ├── Active base × Renewal rate       1 − churn per period
│   └── driven by WES / subscribers      (engagement → renewal)
├── + Upsell revenue                     upsell_purchased.revenue
└── − Refunds                            refund_issued.amount
```

## Definitions

| Metric | Definition | Mixpanel | Owner |
|---|---|---|---|
| Visitors | Unique users with `landing_viewed` | Insights, unique | Growth |
| Quiz start rate | `quiz_started` ÷ `landing_viewed`, same user, within session | Funnel, 2 steps, 30 min window | Growth |
| Paywall reach | `paywall_viewed` ÷ `quiz_started` | Funnel, 1 day window | Product |
| Paywall CVR | `subscription_started` ÷ `paywall_viewed` (first-time paywall only) | Funnel, 1 day window | Monetisation |
| Trial-to-paid | `trial_converted` ÷ `subscription_started` where `trial = true`, trials matured ≥ 8 days | Funnel, 10 day window, cohort by start date | Monetisation |
| RPV (D0) | Revenue on the day of the first visit ÷ visitors. Used for funnel experiments | Insights formula: sum(revenue) ÷ unique `landing_viewed` | Growth |
| ARPPU | Net revenue ÷ paying users in the period | Insights formula | Monetisation |
| Renewal rate (period n) | Subscribers renewed into period n ÷ subscribers who reached the end of period n−1 | Retention, custom: `subscription_started` → `subscription_renewed` | Monetisation |
| Churn (monthly) | 1 − renewal rate, normalised to 30 days | Retention | Monetisation |
| LTV D90 / D180 | Net revenue per acquired subscriber within 90 / 180 days of `subscription_started`, by acquisition cohort | Insights, cohort by `signup_date`, profile `ltv_usd` | Data |
| CAC | Ad spend ÷ new subscribers, by channel and angle (spend from the ad platform, joined on `utm_campaign`) | Imported cost data | Growth |
| Payback (days) | First day when cumulative net revenue per subscriber ≥ CAC | Calculated in `scripts/analyse.py` | Data |
| ROAS D7 / D30 | Net revenue within 7 / 30 days ÷ spend | Calculated | Growth |
| Activation | `app_login` within 24 h of `subscription_started` **and** one coaching action within 72 h | Funnel, 3 steps | Product |
| WES | See North Star | Insights, unique users, 7-day rolling, filter `subscription_status in (active, trialing)` | Product |

## Guardrails

A test or launch that improves its target metric but breaks a guardrail does not ship.

| Guardrail | Threshold | Why |
|---|---|---|
| Refund rate | ≤ 5% of charges, D30 | Aggressive paywall tactics show up here first |
| Cancel within 24 h of first charge | ≤ 8% | Surprise billing, the #1 complaint in competitor reviews |
| Chargebacks | ≤ 0.5% | Payment provider limits |
| AI fallback rate | ≤ 10% of model calls | The product promise is a coach that adapts; fallbacks are templates |
| Model latency, chat turn p75 | ≤ 4 s | Drop-off in the funnel chat |
| Crisis flags | Watched, never optimised | Safety signal, not a conversion lever |

## Experiment rules

* Primary metric is decided before launch; for funnel tests it is RPV (D0), for paywall and pricing it is net revenue per paywall viewer at D30 or later.
* Sample size from a power calculation (80% power, α = 0.05) on the primary metric; the test runs to that size, no peeking decisions.
* Every read-out starts with an SRM check (χ² on assignment counts, p < 0.001 = stop and debug).
* Variance reduction: new visitors have no pre-period metric, so classic CUPED doesn't apply; use regression adjustment on pre-assignment covariates (angle, channel, country, device). For in-app tests on subscribers, CUPED on the previous 4 weeks of activity.
* A 5% long-term holdout stays on the old experience for 90 days after a winning test ships.
