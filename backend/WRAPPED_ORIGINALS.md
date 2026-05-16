# Wrapped Original Project Logic

This backend is intentionally a wrapper layer. It does not invent portfolio demo
outputs.

## NBA Roster Upgrade Agent

- Source of truth: `original_projects/NBA-Roster-Upgrade-Agent-Webapp`, branch
  `v2-webapp-agent` from `Sherlockmrz/NBA-Roster-Upgrade-Agent-Webapp`.
- Reused directly: `nba_agent.agent.run_roster_agent`,
  `nba_agent.agentic.tool_selector.select_tools_for_query`,
  `nba_agent.agentic.tool_registry.FULL_TOOL_PIPELINE`,
  `nba_agent.agentic.tool_registry.TOOL_REGISTRY`,
  `nba_agent.agentic.summary.summary_for_selected_tools`,
  `nba_agent.evaluation.metrics.*`,
  `nba_agent.evaluation.agent_benchmark.run_agent_tool_selection_benchmark`,
  `nba_agent.llm.client.get_llm_status`,
  `nba_agent.llm.qa.answer_grounded_question`,
  `nba_agent.llm.zero_shot.run_zero_shot_baseline`, and
  `nba_agent.visuals.radar.player_radar_svg`.
- Streamlit is not imported by the FastAPI backend. The wrapper imports only the
  original computation, evaluation, LLM status, Q&A, and visualization modules.
- Backend behavior: `/api/nba/run` mirrors the WebApp flow: parse query, merge
  sidebar controls when manual override is enabled, run the original agent, run
  validated tool selection, return full pipeline cards, Tool A/B/C traces,
  need reasoning, sensitivity, scouting summary, grounded Q&A, optional
  zero-shot evaluation, optional tool-selection benchmark, and radar SVGs.
- Data contract: live recomputation requires `teams.csv`, `games.csv`, and
  `games_details.csv` via `NBA_DATA_PATH` or the bundled WebApp `data/raw`
  folder. If those files are missing, the backend returns a clear error and does
  not silently fall back to recorded Warriors output.

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
