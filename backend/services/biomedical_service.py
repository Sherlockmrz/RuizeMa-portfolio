from __future__ import annotations

import csv
import importlib.util
import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BIOMED_ROOT = PROJECT_ROOT / "original_projects" / "Agentic--Biomedical-Reasoning"
PIPELINE_PATH = BIOMED_ROOT / "src" / "pipeline_implementation.py"
SUBMISSION_PATH = BIOMED_ROOT / "outputs:submission_m.csv"


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _parse_options_from_prompt(prompt: str) -> list[dict[str, str]]:
    options = []
    for letter, value in re.findall(r"\n([A-D]):\s*(.+)", prompt):
        options.append({"label": letter, "text": value.strip()})
    return options


def _parse_question_from_prompt(prompt: str) -> str:
    match = re.search(r"Question:\s*(.*?)(?:\n[A-D]:)", prompt, re.S)
    return match.group(1).strip() if match else ""


def _parse_tool_facts(prompt: str) -> list[str]:
    match = re.search(r"TOOL FACTS\n(.*?)\n\nQuestion:", prompt, re.S)
    if not match:
        return []
    return [line.strip()[2:].strip() for line in match.group(1).splitlines() if line.strip().startswith("-")]


def _parse_model_output(prompt: str) -> str:
    match = re.search(r"MODEL OUTPUT:\s*(.*)", prompt, re.S)
    return match.group(1).strip() if match else ""


@lru_cache(maxsize=1)
def _recorded_row() -> dict[str, Any]:
    with SUBMISSION_PATH.open(newline="") as handle:
        for row in csv.DictReader(handle):
            prediction = row.get("prediction") or ""
            if prediction.startswith("PASS-2 INPUT") and row.get("choice") in list("ABCD"):
                reasoning = json.loads(row.get("reasoning") or "[]")
                plan = {}
                if len(reasoning) > 1:
                    try:
                        plan = json.loads(reasoning[1].get("content") or "{}")
                    except Exception:
                        plan = {}
                return {
                    "id": row.get("id"),
                    "prediction": prediction,
                    "choice": row.get("choice"),
                    "reasoning": reasoning,
                    "plan": plan,
                    "question": _parse_question_from_prompt(prediction),
                    "options": _parse_options_from_prompt(prediction),
                    "tool_facts": _parse_tool_facts(prediction),
                    "model_output": _parse_model_output(prediction),
                }
    raise RuntimeError(f"No usable recorded biomedical row found in {SUBMISSION_PATH}")


def default_biomedical_input() -> dict[str, Any]:
    row = _recorded_row()
    return {
        "question": row["question"],
        "choices": [option["text"] for option in row["options"]],
    }


def _trace_from_recorded(row: dict[str, Any], input_matches: bool) -> list[dict[str, str]]:
    plan = row["plan"]
    tool_trace = [item for item in row["reasoning"] if item.get("role") == "tool"]
    summary = next(
        (
            item.get("content", "")
            for item in row["reasoning"]
            if item.get("role") == "system" and "TOOL RUN SUMMARY" in item.get("content", "")
        ),
        "",
    )
    return [
        {
            "id": "bio-plan",
            "title": "Plan",
            "status": "complete",
            "tool": "GPT5Model.plan",
            "input": "Question stem and multiple-choice options",
            "output": ", ".join(plan.get("facts_needed", [])[:6]) or "facts_needed plan",
            "explanation": "The original pipeline asks the model to identify keywords, fact needs, and biomedical tool families before answering.",
        },
        {
            "id": "bio-act",
            "title": "Act / tool retrieval",
            "status": "complete",
            "tool": "ToolAgent.collect",
            "input": ", ".join(plan.get("keywords", [])[:6]) or "planned keywords",
            "output": summary or f"{len(tool_trace)} tool calls recorded",
            "explanation": "The ToolAgent selects high-success biomedical tools such as FDA, DailyMed, RxNav, OpenTargets, PubChem, and MedlinePlus.",
        },
        {
            "id": "bio-facts",
            "title": "Tool Facts",
            "status": "complete" if row["tool_facts"] else "warning",
            "tool": "select_success_facts_for_model",
            "input": "Raw tool responses",
            "output": f"{len(row['tool_facts'])} curated facts",
            "explanation": "The original pipeline filters, deduplicates, clips, and sends curated tool facts to the final answer pass.",
        },
        {
            "id": "bio-verify",
            "title": "Verify",
            "status": "review",
            "tool": "GPT5Model.build_pass2_prompt",
            "input": "Prior analysis + tool facts + full question/options",
            "output": row["model_output"] or f"Final answer: {row['choice']}",
            "explanation": "Pass 2 uses the plan and retrieved facts to constrain the final answer to a single multiple-choice letter.",
        },
        {
            "id": "bio-input-match",
            "title": "Input match check",
            "status": "complete" if input_matches else "warning",
            "tool": "recorded artifact guard",
            "input": "Submitted question",
            "output": "Matches recorded sample" if input_matches else "Recorded sample returned; live execution not enabled",
            "explanation": "Recorded mode is provenance-backed but cannot compute arbitrary new biomedical answers.",
        },
    ]


def _recorded_response(question: str, choices: list[str] | dict[str, str]) -> dict[str, Any]:
    row = _recorded_row()
    submitted_question = question.strip() or row["question"]
    submitted_choices = choices or [option["text"] for option in row["options"]]
    input_matches = _normalize(submitted_question) == _normalize(row["question"])
    result = {
        "record_id": row["id"],
        "question": row["question"],
        "choices": row["options"],
        "plan": row["plan"],
        "tool_facts": row["tool_facts"][:10],
        "tool_trace_sample": [
            {
                "name": item.get("name"),
                "content": (item.get("content") or "")[:900],
            }
            for item in row["reasoning"]
            if item.get("role") == "tool"
        ][:8],
        "final_answer": row["model_output"] or f"Final answer: {row['choice']}",
        "choice": row["choice"],
        "input_matches_recorded_sample": input_matches,
    }
    return {
        "ok": input_matches,
        "mode": "recorded_submission",
        "project": "Plan-Act-Verify Biomedical Reasoning",
        "input": {"question": submitted_question, "choices": submitted_choices},
        "trace": _trace_from_recorded(row, input_matches),
        "result": result,
        "limitations": [
            "Recorded mode returns an original submission trace, not a newly generated answer.",
            "Live biomedical execution requires OpenRouter credentials and ToolUniverse dependencies.",
            "The original pipeline is benchmark-oriented and is not medical advice.",
        ],
        "provenance": {
            "source": "original_projects/Agentic--Biomedical-Reasoning/outputs:submission_m.csv",
            "wrapped_files": [
                "original_projects/Agentic--Biomedical-Reasoning/src/pipeline_implementation.py"
            ],
            "live_mode": "Set BIOMEDICAL_LIVE=1, install ToolUniverse/jsonlines, configure OPENROUTER_API_KEY, and send allow_live=true.",
        },
    }


def _load_original_pipeline_module():
    spec = importlib.util.spec_from_file_location("original_biomedical_pipeline", PIPELINE_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load {PIPELINE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _live_response(question: str, choices: list[str] | dict[str, str]) -> dict[str, Any]:
    module = _load_original_pipeline_module()
    model = module.GPT5Model(module.OR_MODEL_ID)
    agent = module.ToolAgent()
    result = module.predict_one(
        model,
        agent,
        {
            "id": "portfolio-live",
            "question": question,
            "options": choices,
        },
    )
    reasoning = json.loads(result.get("reasoning") or "[]")
    plan = {}
    if len(reasoning) > 1:
        try:
            plan = json.loads(reasoning[1].get("content") or "{}")
        except Exception:
            plan = {}
    normalized = {
        "record_id": "portfolio-live",
        "question": question,
        "choices": choices,
        "plan": plan,
        "tool_facts": _parse_tool_facts(result.get("prediction", "")),
        "tool_trace_sample": [
            {"name": item.get("name"), "content": (item.get("content") or "")[:900]}
            for item in reasoning
            if item.get("role") == "tool"
        ][:8],
        "final_answer": _parse_model_output(result.get("prediction", "")),
        "choice": result.get("choice"),
        "input_matches_recorded_sample": False,
    }
    trace = _trace_from_recorded(
        {
            "plan": plan,
            "reasoning": reasoning,
            "tool_facts": normalized["tool_facts"],
            "model_output": normalized["final_answer"],
            "choice": result.get("choice"),
        },
        True,
    )
    return {
        "ok": True,
        "mode": "live_original_wrapper",
        "project": "Plan-Act-Verify Biomedical Reasoning",
        "input": {"question": question, "choices": choices},
        "trace": trace,
        "result": normalized,
        "limitations": [
            "Live mode calls the original OpenRouter + ToolUniverse pipeline.",
            "Outputs depend on external biomedical tools and model availability.",
            "This is not medical advice.",
        ],
        "provenance": {
            "source": str(PIPELINE_PATH),
            "wrapped_functions": [
                "GPT5Model.plan",
                "ToolAgent.collect",
                "select_success_facts_for_model",
                "GPT5Model.build_pass2_prompt",
                "predict_one",
            ],
        },
    }


def run_biomedical(
    question: str,
    choices: list[str] | dict[str, str],
    allow_live: bool = False,
) -> dict[str, Any]:
    use_live = allow_live and os.environ.get("BIOMEDICAL_LIVE") == "1"
    if use_live and question and choices:
        try:
            return _live_response(question, choices)
        except Exception as exc:
            response = _recorded_response(question, choices)
            response["ok"] = False
            response["limitations"].insert(0, f"Live biomedical run failed: {exc}")
            return response
    return _recorded_response(question, choices)
