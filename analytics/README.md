# Analytics

What an analytics function would ship for Quietly. Everything here runs on a simulated six months of data (June–November 2026, 56K visitors, 714K events), built so that the questions are realistic and the "true" effects are known.

| | |
|---|---|
| [Tracking plan](TRACKING_PLAN.md) | 48 events, web / server / app, owners, typed properties. Source of truth: `tracking_plan.json`, checked by `scripts/tracking_plan.py validate` |
| [Metrics dictionary](METRICS.md) | North Star, metric tree, definitions, guardrails |
| [Experiment playbook](EXPERIMENT_PLAYBOOK.md) | Design doc, power, SRM, holdouts, decision rules |
| [Mixpanel setup](MIXPANEL_SETUP.md) | Prod/dev projects, Lexicon, boards, load order, event budget |
| [Memo 1: experiments](reports/01_experiments.md) | Five sequential tests and the decisions |
| [Memo 2: unit economics](reports/02_unit_economics.md) | LTV, CAC, payback by channel |
| [Memo 3: retention](reports/03_retention.md) | Churn reasons, activation, the 1-week plan |
| [Memo 4: data quality](reports/04_data_quality.md) | Validator, a real SDK bug, client vs server revenue, monitoring |
| [Alerts log](reports/alerts.md) | Output of the anomaly rule over six months |

Reproduce:

```
python3 scripts/simulate_v3.py     # data/v3 (seeded, deterministic)
python3 scripts/tracking_plan.py validate data/v3/events.ndjson
python3 scripts/analyse_v3.py      # reports/results.json
python3 scripts/alerts.py          # reports/alerts.md
python3 scripts/charts_v3.py       # reports/img
```
