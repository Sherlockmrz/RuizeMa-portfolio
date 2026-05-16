from __future__ import annotations

import math
import os
import sys
from dataclasses import fields, is_dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
NBA_WEBAPP_ROOT = PROJECT_ROOT / "original_projects" / "NBA-Roster-Upgrade-Agent-Webapp"
DEFAULT_DATA_DIR = NBA_WEBAPP_ROOT / "data" / "raw"
EXPECTED_RAW_FILES = ("teams.csv", "games.csv", "games_details.csv")

DEFAULT_NBA_QUERY = (
    "Recommend top 5 players for the Warriors to improve interior defense using "
    "the last 10 games. Only include players with at least 20 games and 18 "
    "average minutes."
)

SIDEBAR_FILTER_FIELDS = (
    "team",
    "goal",
    "top_k",
    "recent_games",
    "min_games",
    "min_avg_minutes",
    "exclude_current_team",
    "ranking_mode",
)

LIMITATIONS = [
    "Salary, contract, injury, current-news, and trade-rumor fields are unavailable in the original dataset.",
    "Recommendations are statistical fits from the original Tool A/B/C workflow, not trade-feasibility advice.",
    "The zero-shot baseline requires OpenRouter access and is marked unavailable when LLM access is disabled or missing.",
]

_LATEST_AGENT_RESULT: Any | None = None
_LATEST_RESPONSE: dict[str, Any] | None = None
_LATEST_USE_LLM = False


def run_nba(request: str | dict[str, Any] | None = None) -> dict[str, Any]:
    """Run the original WebApp roster agent through a FastAPI-safe wrapper."""

    normalized = _normalize_run_request(request)
    query = str(normalized["query"]).strip() or DEFAULT_NBA_QUERY
    requested_use_llm = bool(normalized.get("use_llm"))
    filters = _normalize_filters(normalized.get("filters"))
    use_sidebar_override = bool(normalized.get("use_sidebar_as_manual_override"))
    run_evaluation = bool(normalized.get("run_evaluation"))
    run_tool_benchmark = bool(normalized.get("run_tool_benchmark"))
    grounded_question = str(normalized.get("grounded_question") or "").strip()

    data_dir = _resolve_data_dir()
    llm_status = _safe_llm_status()
    missing_files = _missing_raw_files(data_dir)
    if missing_files:
        message = (
            f"Live NBA recomputation cannot run because {data_dir} is missing: "
            f"{', '.join(missing_files)}. Set NBA_DATA_PATH to a folder containing "
            "teams.csv, games.csv, and games_details.csv."
        )
        return _failure_response(
            query=query,
            mode="missing_data",
            llm_status=llm_status,
            data_dir=data_dir,
            warnings=[message],
            input_payload={
                "query": query,
                "use_llm": requested_use_llm,
                "filters": filters,
                "run_evaluation": run_evaluation,
                "grounded_question": grounded_question or None,
            },
        )

    try:
        modules = _original_modules()
        use_llm = bool(requested_use_llm and llm_status.get("available"))
        warnings: list[str] = []
        if requested_use_llm and not use_llm:
            warnings.append(
                "Use LLM was enabled, but no OpenRouter key was available; deterministic fallbacks were used."
            )

        sidebar_values = {field: filters.get(field) for field in SIDEBAR_FILTER_FIELDS}
        teams_df = pd.read_csv(data_dir / "teams.csv", low_memory=False)
        parsed_fields = modules["parse_user_query"](
            user_query=query,
            defaults=sidebar_values,
            teams_df=teams_df,
            use_llm=use_llm,
        )
        final_filters = _merge_parsed_with_sidebar(
            parsed_fields,
            sidebar_values,
            use_sidebar_override,
        )
        final_filters = _strip_none_values(final_filters)

        result = modules["run_roster_agent"](
            user_query=query,
            filters={**final_filters, "_parsed_fields": final_filters},
            data_dir=str(data_dir),
            use_llm=use_llm,
        )
        selection = modules["select_tools_for_query"](
            user_query=query,
            parsed_query=result.parsed_query,
            use_llm=use_llm,
        )
        selected_summary = modules["summary_for_selected_tools"](
            result,
            selection.selected_tool_ids,
        )

        payload = _agent_payload(
            result=result,
            selection=selection,
            selected_summary=selected_summary,
            llm_status=_safe_llm_status(),
            input_payload={
                "query": query,
                "use_llm": requested_use_llm,
                "effective_use_llm": use_llm,
                "filters": filters,
                "parsed_fields": parsed_fields,
                "final_filters": final_filters,
                "use_sidebar_as_manual_override": use_sidebar_override,
                "run_evaluation": run_evaluation,
                "grounded_question": grounded_question or None,
            },
            mode="original_webapp_live",
            data_dir=data_dir,
            warnings=warnings,
        )

        if grounded_question:
            payload["grounded_qa"] = _grounded_answer(
                result,
                grounded_question,
                use_llm=use_llm,
            )
        if run_evaluation:
            payload["evaluation"] = _build_evaluation(result, use_llm=use_llm)
        if run_tool_benchmark:
            payload["tool_selection_benchmark"] = _run_tool_benchmark(use_llm=use_llm)

        global _LATEST_AGENT_RESULT, _LATEST_RESPONSE, _LATEST_USE_LLM
        _LATEST_AGENT_RESULT = result
        _LATEST_RESPONSE = payload
        _LATEST_USE_LLM = use_llm
        return payload
    except Exception as exc:
        return _failure_response(
            query=query,
            mode="nba_webapp_error",
            llm_status=_safe_llm_status(),
            data_dir=data_dir,
            warnings=[f"{type(exc).__name__}: {exc}"],
            input_payload={
                "query": query,
                "use_llm": requested_use_llm,
                "filters": filters,
                "run_evaluation": run_evaluation,
                "grounded_question": grounded_question or None,
            },
        )


def run_nba_qa(request: dict[str, Any] | None = None) -> dict[str, Any]:
    """Answer grounded Q&A from the latest or supplied AgentResult payload."""

    request = request or {}
    question = str(
        request.get("question") or request.get("grounded_question") or ""
    ).strip()
    use_llm = bool(request.get("use_llm", _LATEST_USE_LLM))
    agent_result = _agent_result_from_supplied_payload(request.get("agent_result"))
    source = "supplied_agent_result"
    if agent_result is None:
        agent_result = _LATEST_AGENT_RESULT
        source = "latest_agent_result"

    if agent_result is None:
        return _standalone_failure(
            mode="no_agent_result",
            warnings=[
                "No AgentResult is available. Run /api/nba/run first or supply an AgentResult-compatible payload."
            ],
            input_payload={"question": question, "source": source},
        )

    qa = _grounded_answer(agent_result, question, use_llm=use_llm)
    return {
        "ok": True,
        "mode": "original_webapp_grounded_qa",
        "project": "NBA Roster Upgrade Agent",
        "input": {"question": question, "source": source, "use_llm": use_llm},
        "llm_status": _safe_llm_status(),
        "grounded_qa": qa,
        "trace": [
            _pipeline_step(
                "nba-grounded-qa",
                "Grounded Q&A",
                "complete",
                "answer_grounded_question",
                question,
                qa["answer"],
                "Original WebApp Q&A answers from the current AgentResult and refuses unavailable salary, injury, contract, news, and trade-rumor fields.",
            )
        ],
        "result": {"grounded_qa": qa},
        "limitations": LIMITATIONS,
        "provenance": _provenance(_resolve_data_dir()),
    }


def evaluate_nba(request: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run the original zero-shot comparison and optional tool-selection benchmark."""

    request = request or {}
    use_llm = bool(request.get("use_llm", _LATEST_USE_LLM))
    run_benchmark = bool(request.get("run_tool_benchmark", True))
    agent_result = _agent_result_from_supplied_payload(request.get("agent_result"))
    source = "supplied_agent_result"

    if agent_result is None:
        agent_result = _LATEST_AGENT_RESULT
        source = "latest_agent_result"

    if agent_result is None and request.get("query"):
        run_response = run_nba(
            {
                "query": request.get("query"),
                "use_llm": use_llm,
                "filters": request.get("filters") or {},
                "run_evaluation": True,
                "run_tool_benchmark": run_benchmark,
                "use_sidebar_as_manual_override": request.get(
                    "use_sidebar_as_manual_override", False
                ),
            }
        )
        evaluation = run_response.get("evaluation")
        if evaluation:
            return {
                **run_response,
                "mode": "original_webapp_evaluation",
                "result": {
                    "evaluation": evaluation,
                    "tool_selection_benchmark": run_response.get(
                        "tool_selection_benchmark"
                    ),
                },
            }
        return run_response

    if agent_result is None:
        return _standalone_failure(
            mode="no_agent_result",
            warnings=[
                "No AgentResult is available. Run /api/nba/run first, supply a compatible payload, or send a query to evaluate."
            ],
            input_payload={"source": source, "use_llm": use_llm},
        )

    evaluation = _build_evaluation(agent_result, use_llm=use_llm)
    benchmark = _run_tool_benchmark(use_llm=use_llm) if run_benchmark else None
    return {
        "ok": True,
        "mode": "original_webapp_evaluation",
        "project": "NBA Roster Upgrade Agent",
        "input": {"source": source, "use_llm": use_llm, "run_tool_benchmark": run_benchmark},
        "llm_status": _safe_llm_status(),
        "evaluation": evaluation,
        "tool_selection_benchmark": benchmark,
        "trace": [
            _pipeline_step(
                "nba-zero-shot-evaluation",
                "Zero-shot Baseline Comparison / Evaluation",
                "complete",
                "run_zero_shot_baseline + evaluation.metrics",
                agent_result.user_query,
                "Evaluation metrics returned",
                "Original WebApp comparison metrics are computed from the current AgentResult and zero-shot baseline output.",
            )
        ],
        "result": {
            "evaluation": evaluation,
            "tool_selection_benchmark": benchmark,
        },
        "limitations": LIMITATIONS,
        "provenance": _provenance(_resolve_data_dir()),
    }


def _normalize_run_request(request: str | dict[str, Any] | None) -> dict[str, Any]:
    if isinstance(request, str):
        return {"query": request}
    request = dict(request or {})
    request.setdefault("query", DEFAULT_NBA_QUERY)
    request.setdefault("use_llm", False)
    request.setdefault("filters", {})
    request.setdefault("run_evaluation", False)
    request.setdefault("run_tool_benchmark", False)
    request.setdefault("grounded_question", None)
    request.setdefault("use_sidebar_as_manual_override", False)
    return request


def _normalize_filters(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    filters = dict(value)
    if "team_name" in filters and "team" not in filters:
        filters["team"] = filters["team_name"]
    return {field: filters.get(field) for field in SIDEBAR_FILTER_FIELDS}


def _strip_none_values(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if item is not None}


def _merge_parsed_with_sidebar(
    parsed: dict[str, Any],
    sidebar_values: dict[str, Any],
    use_sidebar_override: bool = False,
) -> dict[str, Any]:
    final = dict(parsed)
    if use_sidebar_override:
        for field, value in sidebar_values.items():
            if value is not None:
                final[field] = value
    return final


def _resolve_data_dir() -> Path:
    configured = os.environ.get("NBA_DATA_PATH")
    if configured:
        return Path(configured).expanduser().resolve()
    return DEFAULT_DATA_DIR


def _missing_raw_files(data_dir: Path) -> list[str]:
    return [filename for filename in EXPECTED_RAW_FILES if not (data_dir / filename).exists()]


def _ensure_webapp_path() -> None:
    if not NBA_WEBAPP_ROOT.exists():
        raise FileNotFoundError(
            f"Original WebApp project is missing: {NBA_WEBAPP_ROOT}"
        )
    webapp_path = str(NBA_WEBAPP_ROOT)
    if webapp_path not in sys.path:
        sys.path.insert(0, webapp_path)


@lru_cache(maxsize=1)
def _original_modules() -> dict[str, Any]:
    _ensure_webapp_path()
    from nba_agent.agent import run_roster_agent
    from nba_agent.agentic.summary import summary_for_selected_tools
    from nba_agent.agentic.tool_registry import (
        ALWAYS_VISIBLE_TOOLS,
        FULL_TOOL_PIPELINE,
        TOOL_REGISTRY,
    )
    from nba_agent.agentic.tool_selector import select_tools_for_query
    from nba_agent.evaluation.agent_benchmark import (
        aggregate_metrics_to_dataframe,
        run_agent_tool_selection_benchmark,
    )
    from nba_agent.evaluation.metrics import (
        build_comparison_table,
        build_player_comparison_table,
        build_scored_candidate_table,
        evaluate_recommendations,
        tool_pipeline_explainability_checklist,
        tool_recommendations_from_ranked_df,
        zero_shot_explainability_checklist,
    )
    from nba_agent.llm.client import get_llm_status
    from nba_agent.llm.parser import parse_user_query
    from nba_agent.llm.qa import answer_grounded_question
    from nba_agent.llm.zero_shot import run_zero_shot_baseline
    from nba_agent.schemas import (
        AgentResult,
        AnalysisRequest,
        NeedReasoningResult,
        ScoutingSummaryResult,
        SensitivityResult,
        TraceStep,
    )
    from nba_agent.visuals.radar import RADAR_DIMENSIONS, player_radar_svg

    return {
        "run_roster_agent": run_roster_agent,
        "summary_for_selected_tools": summary_for_selected_tools,
        "ALWAYS_VISIBLE_TOOLS": ALWAYS_VISIBLE_TOOLS,
        "FULL_TOOL_PIPELINE": FULL_TOOL_PIPELINE,
        "TOOL_REGISTRY": TOOL_REGISTRY,
        "select_tools_for_query": select_tools_for_query,
        "aggregate_metrics_to_dataframe": aggregate_metrics_to_dataframe,
        "run_agent_tool_selection_benchmark": run_agent_tool_selection_benchmark,
        "build_comparison_table": build_comparison_table,
        "build_player_comparison_table": build_player_comparison_table,
        "build_scored_candidate_table": build_scored_candidate_table,
        "evaluate_recommendations": evaluate_recommendations,
        "tool_pipeline_explainability_checklist": tool_pipeline_explainability_checklist,
        "tool_recommendations_from_ranked_df": tool_recommendations_from_ranked_df,
        "zero_shot_explainability_checklist": zero_shot_explainability_checklist,
        "get_llm_status": get_llm_status,
        "parse_user_query": parse_user_query,
        "answer_grounded_question": answer_grounded_question,
        "run_zero_shot_baseline": run_zero_shot_baseline,
        "AgentResult": AgentResult,
        "AnalysisRequest": AnalysisRequest,
        "NeedReasoningResult": NeedReasoningResult,
        "ScoutingSummaryResult": ScoutingSummaryResult,
        "SensitivityResult": SensitivityResult,
        "TraceStep": TraceStep,
        "RADAR_DIMENSIONS": RADAR_DIMENSIONS,
        "player_radar_svg": player_radar_svg,
    }


def _safe_llm_status() -> dict[str, Any]:
    try:
        modules = _original_modules()
        return _jsonable(modules["get_llm_status"]())
    except Exception as exc:
        return {
            "available": False,
            "model": os.environ.get("OPENROUTER_MODEL", "openrouter/free"),
            "key_preview": "",
            "site_url": os.environ.get("OPENROUTER_SITE_URL", ""),
            "app_name": os.environ.get("OPENROUTER_APP_NAME", ""),
            "warnings": [f"Could not read original LLM status: {exc}"],
        }


def _agent_payload(
    *,
    result: Any,
    selection: Any,
    selected_summary: Any,
    llm_status: dict[str, Any],
    input_payload: dict[str, Any],
    mode: str,
    data_dir: Path,
    warnings: list[str],
) -> dict[str, Any]:
    modules = _original_modules()
    full_tool_pipeline = _full_tool_pipeline(selection)
    visible_tools = sorted(
        set(modules["ALWAYS_VISIBLE_TOOLS"]) | set(selection.selected_tool_ids)
    )
    trace_steps = [_trace_step_payload(step) for step in result.trace_steps]
    team_need_diagnosis = _records(result.need_df)
    adjusted_need_df = _records(result.need_reasoning.adjusted_need_df)
    player_strength_df = _records(result.player_strength_df)
    ranked_df = _records(result.ranked_df)
    recommendations, radar_svg_by_player = _recommendation_cards(result)
    sensitivity = _sensitivity_payload(result.sensitivity)
    final_summary = _summary_payload(result.scouting_summary, result.final_summary)
    all_warnings = _dedupe(
        [
            *warnings,
            *_listify(getattr(result, "warnings", [])),
            *_listify(getattr(result.need_reasoning, "warnings", [])),
            *_listify(getattr(result.scouting_summary, "warnings", [])),
            *_listify(getattr(selection, "warnings", [])),
            *_listify(llm_status.get("warnings")),
        ]
    )

    result_payload = {
        "llm_status": llm_status,
        "parsed_query": _jsonable(result.parsed_query),
        "tool_selection": _tool_selection_payload(selection),
        "tool_selection_summary": _summary_payload(selected_summary, selected_summary.executive_summary),
        "full_tool_pipeline": full_tool_pipeline,
        "visible_tools": visible_tools,
        "trace_steps": trace_steps,
        "team_need_diagnosis": {
            "need_df": team_need_diagnosis,
            "top_needs": team_need_diagnosis[:3],
        },
        "need_reasoning": {
            "tactical_interpretation": result.need_reasoning.tactical_interpretation,
            "metric_multipliers": _jsonable(result.need_reasoning.metric_multipliers),
            "explanations": _jsonable(result.need_reasoning.explanations),
            "adjusted_need_df": adjusted_need_df,
            "used_fallback": bool(result.need_reasoning.used_fallback),
            "warnings": _jsonable(result.need_reasoning.warnings),
        },
        "player_strength_summary": {
            "candidate_count": int(len(result.player_strength_df)),
            "columns": list(result.player_strength_df.columns),
            "player_strength_df": player_strength_df,
            "preview": player_strength_df[:25],
        },
        "recommendations": recommendations,
        "radar_svg_by_player": radar_svg_by_player,
        "sensitivity": sensitivity,
        "final_summary": final_summary,
        "tool_traces": {
            "parsed_query": _jsonable(result.parsed_query),
            "need_df": team_need_diagnosis,
            "adjusted_need_df": adjusted_need_df,
            "player_strength_df": player_strength_df,
            "ranked_df": ranked_df,
            "sensitivity_output": sensitivity,
            "final_summary": final_summary,
        },
        "warnings": all_warnings,
        "limitations": LIMITATIONS,
        "provenance": _provenance(data_dir),
    }

    trace = _service_trace(result_payload, input_payload)
    return {
        "ok": True,
        "mode": mode,
        "project": "NBA Roster Upgrade Agent",
        "input": input_payload,
        "llm_status": llm_status,
        "parsed_query": result_payload["parsed_query"],
        "tool_selection": result_payload["tool_selection"],
        "full_tool_pipeline": full_tool_pipeline,
        "visible_tools": visible_tools,
        "trace_steps": trace_steps,
        "team_need_diagnosis": result_payload["team_need_diagnosis"],
        "need_reasoning": result_payload["need_reasoning"],
        "player_strength_summary": result_payload["player_strength_summary"],
        "recommendations": recommendations,
        "radar_svg_by_player": radar_svg_by_player,
        "sensitivity": sensitivity,
        "final_summary": final_summary,
        "warnings": all_warnings,
        "limitations": LIMITATIONS,
        "provenance": _provenance(data_dir),
        "trace": trace,
        "result": result_payload,
    }


def _tool_selection_payload(selection: Any) -> dict[str, Any]:
    return {
        "selected_tools": list(selection.selected_tool_ids),
        "selected_tool_ids": list(selection.selected_tool_ids),
        "model_selected_tool_ids": list(selection.model_selected_tool_ids),
        "required_dependency_ids": list(selection.required_dependency_ids),
        "skipped_tools": list(selection.skipped_tool_ids),
        "skipped_tool_ids": list(selection.skipped_tool_ids),
        "rationales": _jsonable(selection.rationales),
        "skipped_rationales": _jsonable(selection.skipped_rationales),
        "warnings": _jsonable(selection.warnings),
        "validation_note": selection.validation_note,
        "used_fallback": bool(selection.used_fallback),
        "source": selection.source,
        "model": selection.model,
    }


def _full_tool_pipeline(selection: Any) -> list[dict[str, Any]]:
    modules = _original_modules()
    always_visible = set(modules["ALWAYS_VISIBLE_TOOLS"])
    selected = set(selection.selected_tool_ids)
    dependencies = set(selection.required_dependency_ids)
    skipped = set(selection.skipped_tool_ids)
    rows = []
    for definition in modules["FULL_TOOL_PIPELINE"]:
        tool_id = definition.tool_id
        if tool_id in always_visible:
            status = "required_dependency"
        elif tool_id in selected:
            status = (
                "selected_by_llm"
                if selection.source == "llm" and not selection.used_fallback
                else "selected_by_fallback"
            )
        elif tool_id in dependencies:
            status = "required_dependency"
        elif tool_id in skipped:
            status = "skipped"
        else:
            status = "available"
        rows.append(
            {
                "tool_id": tool_id,
                "name": definition.name,
                "description": definition.description,
                "dependencies": list(definition.dependencies),
                "status": status,
                "rationale": selection.rationales.get(tool_id)
                or selection.skipped_rationales.get(tool_id)
                or "",
            }
        )
    return rows


def _trace_step_payload(step: Any) -> dict[str, Any]:
    return {
        "step_number": int(getattr(step, "step_number", 0)),
        "title": str(getattr(step, "title", "")),
        "short_description": str(getattr(step, "short_description", "")),
        "status": str(getattr(step, "status", "")),
        "key_outputs": _jsonable(getattr(step, "key_outputs", {})),
    }


def _service_trace(result_payload: dict[str, Any], input_payload: dict[str, Any]) -> list[dict[str, str]]:
    recommendations = result_payload.get("recommendations") or []
    selection = result_payload.get("tool_selection") or {}
    sensitivity = result_payload.get("sensitivity") or {}
    final_summary = result_payload.get("final_summary") or {}
    parsed_query = result_payload.get("parsed_query") or {}
    return [
        _pipeline_step(
            "nba-user-query",
            "User Query",
            "complete",
            "user_query",
            str(input_payload.get("query", "")),
            "Natural-language roster request captured",
            "The workflow starts from the same free-text query used in the original WebApp.",
        ),
        _pipeline_step(
            "nba-parsed-query",
            "Parsed Query",
            "complete",
            "parse_user_query",
            str(input_payload.get("query", "")),
            _short_json(parsed_query),
            "The original parser resolves team, goal, top-k, recent-game window, and eligibility filters.",
        ),
        _pipeline_step(
            "nba-agentic-tool-selection",
            "Agentic Tool Selection",
            "complete",
            "select_tools_for_query",
            str(input_payload.get("query", "")),
            f"{len(selection.get('selected_tools') or [])} selected, {len(selection.get('skipped_tools') or [])} skipped",
            str(selection.get("validation_note") or ""),
        ),
        _pipeline_step(
            "nba-tool-a",
            "Tool A – Team Need Diagnosis",
            "complete",
            "diagnose_team_needs",
            _short_json(parsed_query),
            f"{len(result_payload.get('team_need_diagnosis', {}).get('need_df', []))} need rows",
            "Recent team performance is converted into need weights against league context.",
        ),
        _pipeline_step(
            "nba-need-reasoning",
            "LLM Need Reasoning",
            "complete",
            "reason_need_weights",
            "Tool A need weights",
            "Adjusted need weights returned",
            "Bounded multipliers interpret the basketball goal while staying dependency-safe.",
        ),
        _pipeline_step(
            "nba-tool-b",
            "Tool B – Player Strength Representation",
            "complete",
            "build_player_strengths",
            _short_json(parsed_query),
            f"{result_payload.get('player_strength_summary', {}).get('candidate_count', 0)} candidates",
            "Eligible player strength vectors are built from the original dataset.",
        ),
        _pipeline_step(
            "nba-tool-c",
            "Tool C – Fit Ranking",
            "complete" if recommendations else "warning",
            "rank_players_by_fit",
            "Adjusted needs x player strengths",
            f"{len(recommendations)} recommendation cards",
            "Tool C ranks candidates by matching team needs to player strengths.",
        ),
        _pipeline_step(
            "nba-sensitivity",
            "Sensitivity Check",
            "complete",
            "run_sensitivity_check",
            "Tool C ranking",
            str(sensitivity.get("stability_label") or ""),
            "The WebApp robustness check tests ranking stability after need-weight perturbation.",
        ),
        _pipeline_step(
            "nba-final-summary",
            "Final Scouting Summary",
            "complete",
            "summarize_scouting_report",
            "Computed pipeline outputs",
            str(final_summary.get("executive_summary") or "")[:220],
            "The original summary layer writes a grounded scouting-style conclusion.",
        ),
    ]


def _pipeline_step(
    step_id: str,
    title: str,
    status: str,
    tool: str,
    input_text: str,
    output_text: str,
    explanation: str,
) -> dict[str, str]:
    return {
        "id": step_id,
        "title": title,
        "status": status,
        "tool": tool,
        "input": input_text,
        "output": output_text,
        "explanation": explanation,
    }


def _recommendation_cards(result: Any) -> tuple[list[dict[str, Any]], dict[str, str]]:
    modules = _original_modules()
    cards: list[dict[str, Any]] = []
    radar_by_player: dict[str, str] = {}
    strength_df = result.player_strength_df
    top_k = int(getattr(result.parsed_query, "top_k", 5))

    for rank, (_, ranked_row) in enumerate(result.ranked_df.head(top_k).iterrows(), start=1):
        combined = ranked_row.to_dict()
        if not strength_df.empty and "PLAYER_NAME" in strength_df.columns:
            player_name = str(ranked_row.get("PLAYER_NAME", ""))
            match = strength_df[strength_df["PLAYER_NAME"].astype(str) == player_name]
            if "CURRENT_TEAM" in strength_df.columns and "CURRENT_TEAM" in ranked_row:
                current_team = str(ranked_row.get("CURRENT_TEAM", ""))
                team_match = match[match["CURRENT_TEAM"].astype(str) == current_team]
                if not team_match.empty:
                    match = team_match
            if not match.empty:
                combined = {**match.iloc[0].to_dict(), **combined}

        player_name = str(combined.get("PLAYER_NAME") or "")
        radar_svg = modules["player_radar_svg"](pd.Series(combined))
        radar_by_player[player_name] = radar_svg
        cards.append(
            {
                "rank": rank,
                "player_name": player_name,
                "current_team": combined.get("CURRENT_TEAM"),
                "fit_score": _jsonable(combined.get("fit_score")),
                "best_match": combined.get("best_match"),
                "gp": _jsonable(combined.get("GP")),
                "avg_min": _jsonable(combined.get("AVG_MIN")),
                "profile_explanation": _player_profile_text(combined),
                "ability_radar": _ability_radar_values(combined),
                "radar_svg": radar_svg,
                "raw": _jsonable(combined),
            }
        )
    return cards, radar_by_player


def _player_profile_text(row: dict[str, Any]) -> str:
    player_name = row.get("PLAYER_NAME", "This player")
    best_match = row.get("best_match", "the current adjusted needs")
    strongest = _strongest_available_abilities(row)
    if strongest:
        return (
            f"{player_name} is recommended because his strongest available metrics "
            f"align with the team's adjusted needs, especially {best_match}. The "
            f"preview highlights {', '.join(strongest)} from the current dataset and Tool C fit scoring."
        )
    return (
        f"{player_name} is recommended because his strongest available metrics "
        f"align with the team's adjusted needs, especially {best_match}. This profile "
        "is based only on the current dataset and Tool C fit scoring."
    )


def _strongest_available_abilities(row: dict[str, Any], limit: int = 2) -> list[str]:
    modules = _original_modules()
    ability_values = []
    for label, radar_column, strength_column in modules["RADAR_DIMENSIONS"]:
        value = row.get(radar_column, row.get(strength_column, 0.0))
        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            numeric_value = 0.0
        ability_values.append((label, numeric_value))
    return [
        label
        for label, value in sorted(ability_values, key=lambda item: item[1], reverse=True)[
            :limit
        ]
        if value > 0
    ]


def _ability_radar_values(row: dict[str, Any]) -> list[dict[str, Any]]:
    modules = _original_modules()
    values = []
    for label, radar_column, strength_column in modules["RADAR_DIMENSIONS"]:
        value = row.get(radar_column, row.get(strength_column, 0.0))
        values.append({"label": label, "value": _jsonable(value)})
    return values


def _sensitivity_payload(sensitivity: Any) -> dict[str, Any]:
    return {
        "stability_label": sensitivity.stability_label,
        "top_k_overlap": _jsonable(sensitivity.top_k_overlap),
        "original_top_players": _jsonable(sensitivity.original_top_players),
        "perturbed_top_players": _jsonable(sensitivity.perturbed_top_players),
        "explanation": sensitivity.explanation,
        "rank_comparison_df": _records(sensitivity.rank_comparison_df),
    }


def _summary_payload(summary: Any, final_summary: str) -> dict[str, Any]:
    return {
        "executive_summary": getattr(summary, "executive_summary", final_summary),
        "key_takeaways": _jsonable(getattr(summary, "key_takeaways", [])),
        "limitations_note": getattr(summary, "limitations_note", ""),
        "used_fallback": bool(getattr(summary, "used_fallback", False)),
        "warnings": _jsonable(getattr(summary, "warnings", [])),
    }


def _grounded_answer(agent_result: Any, question: str, use_llm: bool) -> dict[str, Any]:
    modules = _original_modules()
    answer = modules["answer_grounded_question"](
        agent_result,
        question,
        use_llm=use_llm,
    )
    return {
        "question": question,
        "answer": answer,
        "source": "current AgentResult only",
        "unsupported_fields": [
            "salary",
            "contracts",
            "injuries",
            "trade rumors",
            "current NBA news",
        ],
    }


def _build_evaluation(agent_result: Any, use_llm: bool) -> dict[str, Any]:
    modules = _original_modules()
    top_k = int(agent_result.parsed_query.top_k)
    zero_result = modules["run_zero_shot_baseline"](
        agent_result.user_query,
        top_k,
        use_llm=use_llm,
    )
    need_df = (
        agent_result.need_reasoning.adjusted_need_df
        if not agent_result.need_reasoning.adjusted_need_df.empty
        else agent_result.need_df
    )
    candidate_table = modules["build_scored_candidate_table"](
        need_df,
        agent_result.player_strength_df,
    )
    tool_recommendations = modules["tool_recommendations_from_ranked_df"](
        agent_result.ranked_df,
        top_k,
    )
    zero_metrics, zero_matches = modules["evaluate_recommendations"](
        zero_result.players,
        candidate_table,
        agent_result.parsed_query,
        need_df,
        top_k,
        modules["zero_shot_explainability_checklist"](),
    )
    tool_metrics, tool_matches = modules["evaluate_recommendations"](
        tool_recommendations,
        candidate_table,
        agent_result.parsed_query,
        need_df,
        top_k,
        modules["tool_pipeline_explainability_checklist"](agent_result),
    )
    comparison_table = modules["build_comparison_table"](
        zero_metrics,
        tool_metrics,
        agent_result.sensitivity,
    )
    player_table = modules["build_player_comparison_table"](
        zero_matches,
        tool_matches,
        agent_result.parsed_query,
        top_k,
    )
    return {
        "zero_shot": _jsonable(zero_result),
        "metrics": {
            "zero_shot": _jsonable(zero_metrics),
            "tool_pipeline": _jsonable(tool_metrics),
        },
        "comparison_table": _records(comparison_table),
        "player_table": _records(player_table),
        "candidate_table_preview": _records(candidate_table.head(25)),
        "fairness_note": (
            "Tool C fit score and need alignment are internal objective metrics. "
            "They are useful for auditing the explicit scoring objective, not an independent ground-truth claim."
        ),
    }


def _run_tool_benchmark(use_llm: bool) -> dict[str, Any]:
    modules = _original_modules()
    benchmark = modules["run_agent_tool_selection_benchmark"](use_llm=use_llm)
    return {
        "aggregate_metrics": _jsonable(benchmark.aggregate_metrics),
        "aggregate_table": _records(
            modules["aggregate_metrics_to_dataframe"](benchmark.aggregate_metrics)
        ),
        "rows": _records(benchmark.to_dataframe()),
    }


def _records(df: pd.DataFrame, rows: int | None = None) -> list[dict[str, Any]]:
    if df is None or not isinstance(df, pd.DataFrame) or df.empty:
        return []
    frame = df.head(rows) if rows else df
    frame = frame.replace([np.inf, -np.inf], np.nan).where(pd.notnull(frame), None)
    return [_jsonable(row) for row in frame.to_dict(orient="records")]


def _jsonable(value: Any) -> Any:
    if isinstance(value, pd.DataFrame):
        return _records(value)
    if isinstance(value, pd.Series):
        return _jsonable(value.to_dict())
    if is_dataclass(value) and not isinstance(value, type):
        return {field.name: _jsonable(getattr(value, field.name)) for field in fields(value)}
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)
    if isinstance(value, np.ndarray):
        return [_jsonable(item) for item in value.tolist()]
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    if pd.isna(value):
        return None
    return value


def _listify(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (list, tuple, set)):
        return [str(item) for item in value if item]
    return [str(value)]


def _dedupe(values: list[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value).strip()
        if text and text not in seen:
            output.append(text)
            seen.add(text)
    return output


def _short_json(value: Any) -> str:
    text = str(_jsonable(value))
    return text if len(text) <= 600 else f"{text[:600]}..."


def _failure_response(
    *,
    query: str,
    mode: str,
    llm_status: dict[str, Any],
    data_dir: Path,
    warnings: list[str],
    input_payload: dict[str, Any],
) -> dict[str, Any]:
    result_payload = {
        "llm_status": llm_status,
        "parsed_query": {},
        "tool_selection": {},
        "full_tool_pipeline": _safe_full_tool_pipeline(),
        "visible_tools": [],
        "trace_steps": [],
        "team_need_diagnosis": {"need_df": [], "top_needs": []},
        "need_reasoning": {},
        "player_strength_summary": {"candidate_count": 0, "player_strength_df": []},
        "recommendations": [],
        "radar_svg_by_player": {},
        "sensitivity": {},
        "final_summary": {},
        "grounded_qa": None,
        "evaluation": None,
        "warnings": warnings,
        "limitations": LIMITATIONS,
        "provenance": _provenance(data_dir),
    }
    trace = [
        _pipeline_step(
            "nba-data-check",
            "NBA data check",
            "error",
            "load_raw_data",
            str(data_dir),
            "; ".join(warnings),
            "The WebApp wrapper requires the original raw NBA CSV files and does not fall back to recorded Warriors output for other teams.",
        )
    ]
    return {
        "ok": False,
        "mode": mode,
        "project": "NBA Roster Upgrade Agent",
        "input": input_payload,
        "llm_status": llm_status,
        "parsed_query": {},
        "tool_selection": {},
        "full_tool_pipeline": result_payload["full_tool_pipeline"],
        "visible_tools": [],
        "trace_steps": [],
        "team_need_diagnosis": result_payload["team_need_diagnosis"],
        "need_reasoning": {},
        "player_strength_summary": result_payload["player_strength_summary"],
        "recommendations": [],
        "radar_svg_by_player": {},
        "sensitivity": {},
        "final_summary": {},
        "warnings": warnings,
        "limitations": LIMITATIONS,
        "provenance": _provenance(data_dir),
        "trace": trace,
        "result": result_payload,
    }


def _standalone_failure(
    *,
    mode: str,
    warnings: list[str],
    input_payload: dict[str, Any],
) -> dict[str, Any]:
    return {
        "ok": False,
        "mode": mode,
        "project": "NBA Roster Upgrade Agent",
        "input": input_payload,
        "llm_status": _safe_llm_status(),
        "warnings": warnings,
        "trace": [
            _pipeline_step(
                "nba-agent-result-check",
                "AgentResult check",
                "error",
                "AgentResult",
                "",
                "; ".join(warnings),
                "This endpoint is grounded in a current or supplied AgentResult.",
            )
        ],
        "result": {"warnings": warnings},
        "limitations": LIMITATIONS,
        "provenance": _provenance(_resolve_data_dir()),
    }


def _safe_full_tool_pipeline() -> list[dict[str, Any]]:
    try:
        modules = _original_modules()
        return [
            {
                "tool_id": definition.tool_id,
                "name": definition.name,
                "description": definition.description,
                "dependencies": list(definition.dependencies),
                "status": "unavailable",
                "rationale": "",
            }
            for definition in modules["FULL_TOOL_PIPELINE"]
        ]
    except Exception:
        return []


def _provenance(data_dir: Path) -> dict[str, Any]:
    return {
        "source": "original_projects/NBA-Roster-Upgrade-Agent-Webapp",
        "source_repository": "https://github.com/Sherlockmrz/NBA-Roster-Upgrade-Agent-Webapp",
        "branch": "v2-webapp-agent",
        "wrapped_modules": [
            "nba_agent.agent.run_roster_agent",
            "nba_agent.agentic.tool_selector.select_tools_for_query",
            "nba_agent.agentic.tool_registry.FULL_TOOL_PIPELINE",
            "nba_agent.agentic.summary.summary_for_selected_tools",
            "nba_agent.evaluation.metrics",
            "nba_agent.evaluation.agent_benchmark.run_agent_tool_selection_benchmark",
            "nba_agent.llm.client.get_llm_status",
            "nba_agent.llm.qa.answer_grounded_question",
            "nba_agent.llm.zero_shot.run_zero_shot_baseline",
            "nba_agent.visuals.radar.player_radar_svg",
        ],
        "data_dir": str(data_dir),
        "required_raw_files": list(EXPECTED_RAW_FILES),
        "render_env": [
            "OPENROUTER_API_KEY",
            "OPENROUTER_MODEL",
            "OPENROUTER_SITE_URL",
            "OPENROUTER_APP_NAME",
            "NBA_DATA_PATH",
        ],
    }


def _agent_result_from_supplied_payload(payload: Any) -> Any | None:
    if not isinstance(payload, dict):
        return None
    try:
        modules = _original_modules()
        parsed = payload.get("parsed_query") or {}
        need_reasoning = payload.get("need_reasoning") or {}
        sensitivity = payload.get("sensitivity") or {}
        final_summary = payload.get("final_summary") or {}
        trace_steps = payload.get("trace_steps") or []
        tool_traces = payload.get("tool_traces") or {}
        strength_summary = payload.get("player_strength_summary") or {}

        return modules["AgentResult"](
            user_query=str(payload.get("user_query") or payload.get("query") or DEFAULT_NBA_QUERY),
            parsed_query=modules["AnalysisRequest"](**_analysis_request_fields(parsed)),
            agent_plan=_jsonable(payload.get("agent_plan") or []),
            need_df=pd.DataFrame(
                tool_traces.get("need_df")
                or payload.get("need_df")
                or (payload.get("team_need_diagnosis") or {}).get("need_df")
                or []
            ),
            need_reasoning=modules["NeedReasoningResult"](
                tactical_interpretation=str(
                    need_reasoning.get("tactical_interpretation") or ""
                ),
                metric_multipliers=dict(need_reasoning.get("metric_multipliers") or {}),
                explanations=dict(need_reasoning.get("explanations") or {}),
                adjusted_need_df=pd.DataFrame(
                    need_reasoning.get("adjusted_need_df")
                    or tool_traces.get("adjusted_need_df")
                    or []
                ),
                warnings=list(need_reasoning.get("warnings") or []),
                used_fallback=bool(need_reasoning.get("used_fallback", True)),
            ),
            player_strength_df=pd.DataFrame(
                strength_summary.get("player_strength_df")
                or tool_traces.get("player_strength_df")
                or []
            ),
            ranked_df=pd.DataFrame(tool_traces.get("ranked_df") or payload.get("ranked_df") or []),
            sensitivity=modules["SensitivityResult"](
                stability_label=str(sensitivity.get("stability_label") or "Unavailable"),
                top_k_overlap=float(sensitivity.get("top_k_overlap") or 0.0),
                original_top_players=list(sensitivity.get("original_top_players") or []),
                perturbed_top_players=list(sensitivity.get("perturbed_top_players") or []),
                explanation=str(sensitivity.get("explanation") or ""),
                rank_comparison_df=pd.DataFrame(
                    sensitivity.get("rank_comparison_df") or []
                ),
            ),
            scouting_summary=modules["ScoutingSummaryResult"](
                executive_summary=str(final_summary.get("executive_summary") or ""),
                key_takeaways=list(final_summary.get("key_takeaways") or []),
                limitations_note=str(final_summary.get("limitations_note") or ""),
                used_fallback=bool(final_summary.get("used_fallback", True)),
                warnings=list(final_summary.get("warnings") or []),
            ),
            final_summary=str(final_summary.get("executive_summary") or ""),
            warnings=list(payload.get("warnings") or []),
            trace_steps=[
                modules["TraceStep"](
                    step_number=int(step.get("step_number") or index + 1),
                    title=str(step.get("title") or ""),
                    short_description=str(step.get("short_description") or ""),
                    status=str(step.get("status") or ""),
                    key_outputs=dict(step.get("key_outputs") or {}),
                )
                for index, step in enumerate(trace_steps)
                if isinstance(step, dict)
            ],
        )
    except Exception:
        return None


def _analysis_request_fields(parsed: dict[str, Any]) -> dict[str, Any]:
    return {
        "team_name": parsed.get("team_name") or parsed.get("team") or "Warriors",
        "goal": parsed.get("goal") or "",
        "top_k": int(parsed.get("top_k") or 5),
        "recent_games": int(parsed.get("recent_games") or 10),
        "min_games": int(parsed.get("min_games") or 15),
        "min_avg_minutes": float(parsed.get("min_avg_minutes") or 15.0),
        "exclude_current_team": bool(parsed.get("exclude_current_team", True)),
        "ranking_mode": parsed.get("ranking_mode") or "Best Talent",
        "season": parsed.get("season"),
        "unavailable_constraints": tuple(parsed.get("unavailable_constraints") or ()),
    }
