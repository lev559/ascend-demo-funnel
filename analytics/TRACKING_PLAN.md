# Tracking plan v3.0

Generated from `analytics/tracking_plan.json` by `scripts/tracking_plan.py render`. Do not edit by hand.

**Convention:** snake_case object_action in past tense; properties snake_case; money in USD as number; no free text, names or emails in event properties.

**Sources:** `web` = browser funnel, `server` = Stripe webhook and API routes (source of truth for money and safety), `app` = mobile app after purchase.

**Status:** `live` = implemented in this build (server events need the Stripe webhook configured), `spec` = specified for the mobile app, present only in simulated data, `deprecated` = still firing for one release, then hidden in Lexicon.


## AI

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `coach_questions_generated` | web | live | Model (or fallback) returned the situation questions | `mode` enum (llm, fallback, error)<br>`ms` number<br>`n` number?<br>`crisis` boolean? |
| `plan_generated` | web | live | Personal plan returned | `mode` enum (llm, fallback, error)<br>`ms` number |
| `questions_wait_shown` | web | live | 'Reading what you wrote' spinner shown because questions were not ready | `ms` number |

## Acquisition

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `landing_viewed` | web | live | Landing screen rendered for a new or reset session | — |

## Activation

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `app_download_clicked` | web | live | Store badge tapped | `store` enum (ios, android) |
| `app_login` | app | spec | Signed in with the web email (magic link); calls identify(user_id) so web and app join<br><i>Specified for the app; present in simulated data only</i> | — |
| `app_opened` | app | spec | App launched; first launch carries first_open=true<br><i>Specified for the app; present in simulated data only</i> | `first_open` boolean |
| `onboarding_reached` | web | live | Done screen with app download links shown | — |

## Coach

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `chat_completed` | web | live | Last coach turn shown | `coach` enum (nora, ines, max, theo)<br>`chat_length` enum (2, 4) |
| `coach_matched` | web | live | Coach match screen shown after the voice question | `coach` enum (nora, ines, max, theo) |
| `coach_message_shown` | web | live | A coach message rendered in the funnel chat | `coach` enum (nora, ines, max, theo)<br>`turn` number<br>`mode` enum (llm, fallback, error)<br>`ms` number<br>`chat_length` enum (2, 4) |
| `coach_reply_sent` | web | live | Person sent a reply in the funnel chat | `coach` enum (nora, ines, max, theo)<br>`turn` number<br>`quick` boolean<br>`chat_length` enum (2, 4) |
| `coach_switched` | web | live | Person picked another coach on the match screen | `coach` enum (nora, ines, max, theo) |

## Engagement

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `checkin_answered` | app | spec | Reply to a scheduled check-in<br><i>Specified for the app; present in simulated data only</i> | `slot` enum (morning, evening, sunday) |
| `coach_session_started` | app | spec | Chat with the coach opened and first message sent<br><i>Specified for the app; present in simulated data only</i> | `coach` enum (nora, ines, max, theo) |
| `plan_step_completed` | app | spec | A day in the 7-day plan marked done<br><i>Specified for the app; present in simulated data only</i> | `day` number<br>`plan_week` number |
| `weekly_review_completed` | app | spec | Sunday review finished<br><i>Specified for the app; present in simulated data only</i> | `week` number |

## Experiments

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `$experiment_started` | web | live | GrowthBook assigned the user to an experiment (once per experiment per user)<br><i>Name and props fixed by GrowthBook's Mixpanel integration</i> | `Experiment name` string<br>`Variant name` string<br>`variation_value` string?<br>`assignment` enum? (test, holdout) |

## Lead

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `email_submitted` | web | live | Valid email submitted; fires identify(user_id) right after | `marketing_opt_in` boolean |
| `email_viewed` | web | live | Email screen shown | — |

## Monetisation

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `checkout_abandoned` | web | live | Returned from Stripe via cancel_url | `plan` enum (1w, 4w, 12w, year, month, 4w_back) |
| `checkout_started` | web | live | Redirect to Stripe Checkout | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`price` number<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`intro` boolean |
| `downsell_viewed` | web | live | Paywall shown to a returning visitor (downsell) | `paywall_model` enum (weekly, annual_trial, downsell) |
| `paywall_timer_expired` | web | live | Intro-price timer reached zero on screen | — |
| `paywall_viewed` | web | live | Paywall shown to a first-time visitor | `paywall_model` enum (weekly, annual_trial, downsell) |
| `plan_selected` | web | live | Plan card tapped | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`paywall_model` enum (weekly, annual_trial, downsell) |
| `upsell_checkout_started` | web | live | Upsell checkout opened | `offer` string<br>`price` number<br>`variant` enum (single, bundle) |
| `upsell_declined` | web | live | Upsell skipped | `offer` string<br>`variant` enum (single, bundle) |
| `upsell_viewed` | web | live | Upsell screen shown after purchase | `offer` string<br>`variant` enum (single, bundle) |

## Onboarding quiz

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `interstitial_viewed` | web | live | Reflection or summary screen shown<br><i>Renamed from breather_viewed (v2); Lexicon keeps the old name as an alias</i> | `which` enum (reflection, summary) |
| `loader_question_answered` | web | live | Yes/no pop-up on the loader answered<br><i>Renamed from loader_answer (v2)</i> | `q` string<br>`a` enum (yes, no) |
| `name_submitted` | web | live | First name entered<br><i>Name itself is never sent</i> | — |
| `quiz_started` | web | live | Reason card tapped on the landing | `reason` enum (overload, start, lost, talk)<br>`preselected` boolean<br>`quiz_length` enum (short, long)<br>`entry_mode` enum (write, tap) |
| `quiz_step_completed` | web | live | Any quiz question answered | `step` number<br>`step_id` string<br>`quiz_length` enum (short, long) |
| `situation_written` | web | live | Situation submitted (typed or tapped example) | `text_length` number<br>`reason` enum (overload, start, lost, talk)<br>`how` enum (typed, example, tap)<br>`entry_mode` enum (write, tap) |

## Plan

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `commitment_signed` | web | live | Press-and-hold on the deal screen completed<br><i>Renamed from deal_signed (v2)</i> | — |
| `result_viewed` | web | live | Plan screen shown | `mode` enum (llm, fallback, error) |

## Revenue

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `payment_failed` | server | live | invoice.payment_failed | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`subscription_id` string<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`attempt` number |
| `purchase_completed` | web | deprecated | Success page after Stripe (client)<br><i>Kept one release for comparison with subscription_started, then hidden in Lexicon</i> | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`revenue` number<br>`currency` string<br>`trial` boolean<br>`intro` boolean |
| `refund_issued` | server | live | charge.refunded | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`amount` number<br>`reason` enum (requested, duplicate, fraud, guarantee) |
| `subscription_cancelled` | server | live | customer.subscription.updated with cancel_at_period_end=true<br><i>Cancel intent; access continues to period end</i> | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`subscription_id` string<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`period` number<br>`reason` enum? (too_expensive, not_using, not_helpful, other, none) |
| `subscription_ended` | server | live | customer.subscription.deleted | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`subscription_id` string<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`periods_paid` number? |
| `subscription_renewed` | server | live | invoice.paid for a later period | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`subscription_id` string<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`revenue` number<br>`period` number |
| `subscription_started` | server | live | Stripe checkout.session.completed (mode=subscription)<br><i>Replaces client-side purchase_completed as the revenue event</i> | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`subscription_id` string<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`revenue` number<br>`intro` boolean<br>`trial` boolean |
| `trial_converted` | server | live | First paid invoice after a trial (invoice.paid, billing_reason=subscription_cycle, period 1) | `plan` enum (1w, 4w, 12w, year, month, 4w_back)<br>`subscription_id` string<br>`paywall_model` enum (weekly, annual_trial, downsell)<br>`revenue` number |
| `upsell_purchased` | server | live | checkout.session.completed (mode=payment) for an upsell<br><i>Moves from the client to the webhook</i> | `offer` string<br>`revenue` number<br>`variant` enum (single, bundle) |

## Safety

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `crisis_flagged` | server | live | Crisis regex or model RISK flag fired (no text stored) | `source` enum (regex, model)<br>`surface` enum (questions, chat, plan, app) |

## UX

| Event | Source | Status | Trigger | Properties |
|---|---|---|---|---|
| `nav_back_clicked` | web | live | Browser back inside the funnel<br><i>Renamed from browser_back (v2)</i> | `from` string |

## Super properties (on every event)

| Property | Type | Required | Description |
|---|---|---|---|
| `platform` | enum (web, ios, android, server) | yes | Where the event fired |
| `funnel_version` | string | yes | e.g. v3; bump on any change to screens or events |
| `angle` | string | yes | Ad angle from ?angle= / utm_content |
| `utm_source` | string | yes |  |
| `utm_medium` | string | no |  |
| `utm_campaign` | string | yes |  |
| `utm_content` | string | no |  |
| `channel` | enum (meta, tiktok, google, organic, referral) | yes | Derived from utm_source |
| `exp_quiz_length` | string | no |  |
| `exp_entry_mode` | string | no |  |
| `exp_chat_length` | string | no |  |
| `exp_paywall_model` | string | no |  |
| `exp_upsell_offer` | string | no |  |

## User profile properties

| Property | Type | Required | Description |
|---|---|---|---|
| `$email` | string | no | Not sent in this build (no messaging tool needs it). Would be set after email_submitted with consent |
| `first_seen` | date | yes |  |
| `signup_date` | date | no |  |
| `acquisition_channel` | string | yes |  |
| `first_angle` | string | yes |  |
| `reason` | enum (overload, start, lost, talk) | yes |  |
| `age_band` | string | no |  |
| `coach` | enum (nora, ines, max, theo) | yes |  |
| `marketing_opt_in` | boolean | no |  |
| `plan` | enum (1w, 4w, 12w, year, month, 4w_back) | no |  |
| `subscription_status` | enum (none, trialing, active, cancelled, past_due, ended) | no |  |
| `ltv_usd` | number | no | Net revenue to date (renewals + upsells − refunds), set by the webhook |
| `periods_paid` | number | no |  |
