# Wrapped Original Project Logic

This backend is intentionally a wrapper layer. It does not invent portfolio demo
outputs.

## NBA Roster Upgrade Agent

- Source inspected: `original_projects/NBA-Roster-Upgrade-Agent/src/main.py`
- Reused/refactored logic: query parsing fallback, team lookup, Tool A team need
  diagnosis, goal boost, Tool B player strength vectors, Tool C fit ranking, and
  fallback scouting summary.
- Constraint: the original repo does not include `teams.csv`, `games.csv`, or
  `games_details.csv`; the source script expects them at `/content`.
- Backend behavior: if `NBA_DATA_PATH` points to a directory containing those
  three CSVs, the endpoint recomputes with the refactored original logic. Without
  those CSVs, it only returns the original captured notebook result for the
  notebook demo query.

## Agentic Biomedical Reasoning

- Source inspected: `original_projects/Agentic--Biomedical-Reasoning/src/pipeline_implementation.py`
- Reused/wrapped logic: `GPT5Model.plan`, `ToolAgent.collect`,
  `select_success_facts_for_model`, `build_pass2_prompt`, and final-answer
  extraction when live execution is explicitly enabled.
- Constraint: live execution requires OpenRouter credentials plus ToolUniverse
  dependencies. The current local environment does not include ToolUniverse.
- Backend behavior: by default, the endpoint returns a recorded row from the
  original submission CSV and exposes its plan, tool facts, trace, and final
  answer. Set `BIOMEDICAL_LIVE=1` and send `allow_live: true` to attempt a live
  run.

## Insurance Cost Predictor

- Source inspected: `original_projects/Insurance-Cost-Predictor/app/shared.py`
- Reused directly: `make_prediction`, `block2_summary_text`, and
  `load_comparison_metrics`.
- Model artifacts reused: subgroup Random Forest regressors, smoker classifier,
  quantile regression training routine, saved metric JSON files, and original
  preprocessing functions.
- Backend behavior: endpoint imports the original Streamlit shared module and
  calls its inference function. Streamlit UI rendering is not used.
