# Experiment playbook

How a test goes from idea to decision at Quietly. Short on purpose: if a step takes more than a paragraph, it's a meeting.

## 1. Before launch: the design doc (one page)

* **Hypothesis**, written as "Because [evidence], we believe [change] will move [metric] for [who]".
* **Primary metric**, chosen by traffic, not by taste:
  * Funnel tests at today's volume (~300 visitors a day): a leading indicator on the step the change touches, e.g. situation submitted or paywall reached. Revenue per visitor D30 is the guardrail.
  * Paywall and pricing: net revenue per paywall viewer at D30 or later. Refund rate and cancel-within-24 h are guardrails.
  * In-app: weekly engaged subscribers or renewal into period 2.
* **Power.** MDE at 80% power, α = 0.05, from last month's baseline and variance. If the MDE is bigger than any effect you'd believe, change the metric or the test, not the significance level.
* **Duration.** Fixed in advance, in whole weeks (weekday mix), never shorter than 2 weeks.
* **Decision rule**, written before the data: ship / don't ship / keep running, and what each guardrail must not do.

## 2. Assignment

* GrowthBook feature-flag rule, 50/50 hash on the anonymous id.
* Exposure is sent to Mixpanel as `$experiment_started`, and the variant as the super property `exp_<key>`, so every downstream event, including server revenue through Stripe metadata, carries it.
* One test per funnel stage at a time. Tests on different stages may overlap only if neither changes who reaches the other's stage.

## 3. While it runs

* **Day 1:** check exposures arrive in both arms and that the SRM check passes.
* **Daily:** guardrail alerts (`scripts/alerts.py`). A broken guardrail stops the test; a promising primary metric does not end it early.

## 4. Read-out

1. **SRM:** χ² on assignment counts. p < 0.001 means stop and debug, don't read.
2. **Primary metric:** effect with a 95% CI. Regression adjustment on pre-assignment covariates is reported alongside, not instead.
3. **Guardrails** and the segment cuts named in the design doc only (channel, OS). No fishing.
4. **Decision** in the memo, with the evidence level stated honestly: "significant", "directional", or "business call". Memo 1 has all three.

## 5. After shipping

* A 5% holdout stays on control for 60 days. Its read-out is the check that the win was real and not a winner's-curse overestimate.
* Effect sizes go into a running log, so next quarter's MDE assumptions come from our own history rather than hope.
