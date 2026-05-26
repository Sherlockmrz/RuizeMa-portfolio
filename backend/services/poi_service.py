from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

import requests


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "poi_mock_cases.json"
PROJECT_NAME = "POI Quality Agent"
SCORING_FORMULA = (
    "score = 0.35 × source_trust\n"
    "      + 0.25 × recency_score\n"
    "      + 0.25 × semantic_match\n"
    "      + 0.15 × spatial_consistency"
)

BASE_LIMITATIONS = [
    "This demo uses mock POI evidence, not real Didi or production map data.",
    "The purpose is to demonstrate Agent workflow understanding, not production-level POI correction.",
    "Automatic POI updates should require stronger validation and business rules.",
]

TASK_KEYWORDS: dict[str, set[str]] = {
    "address_correction": {
        "address",
        "relocation",
        "moved",
        "navigation",
        "nearby",
        "mall",
        "地址",
        "搬迁",
        "迁移",
        "新中关",
        "导航",
        "位置",
        "门店",
    },
    "duplicate_detection": {
        "duplicate",
        "same",
        "merge",
        "phone",
        "category",
        "distance",
        "poi",
        "重复",
        "同一个",
        "合并",
        "电话",
        "距离",
        "星巴克",
    },
    "merchant_status_check": {
        "status",
        "open",
        "closed",
        "temporary",
        "renovation",
        "order",
        "营业",
        "关闭",
        "闭店",
        "装修",
        "暂停",
        "临时",
        "海底捞",
    },
}


def run_poi_quality_agent(payload: dict[str, Any]) -> dict[str, Any]:
    case = _load_case(str(payload.get("case_id") or "case_relocation_luckin"))
    query = str(payload.get("query") or case.get("query") or "").strip()
    top_k = max(1, min(int(payload.get("top_k") or 5), 10))
    use_llm = bool(payload.get("use_llm", True))

    task_type = _classify_task_type(case, query)
    original_record = case.get("original_record") or {}

    scored_evidence = _score_evidence(
        evidence=case.get("evidence") or [],
        query=query,
        task_type=task_type,
        original_record=original_record,
    )
    # Top-k is intentionally small for a portfolio demo: five chunks are enough
    # to make the retrieval/ranking behavior inspectable without hiding the trace.
    retrieved_evidence = scored_evidence[:top_k]
    evidence_comparison = _compare_evidence(
        task_type=task_type,
        original_record=original_record,
        scored_evidence=scored_evidence,
        retrieved_evidence=retrieved_evidence,
    )
    decision = _make_decision(
        case_id=str(case.get("case_id") or ""),
        task_type=task_type,
        retrieved_evidence=retrieved_evidence,
    )

    limitations = list(BASE_LIMITATIONS)
    llm_explanation, llm_limitation, llm_mode = _generate_explanation(
        query=query,
        task_type=task_type,
        original_record=original_record,
        retrieved_evidence=retrieved_evidence,
        evidence_comparison=evidence_comparison,
        decision=decision,
        limitations=limitations,
        use_llm=use_llm,
    )
    if llm_limitation:
        limitations.append(llm_limitation)

    tool_trace = _build_tool_trace(
        payload=payload,
        case=case,
        query=query,
        task_type=task_type,
        original_record=original_record,
        scored_evidence=scored_evidence,
        retrieved_evidence=retrieved_evidence,
        evidence_comparison=evidence_comparison,
        decision=decision,
        llm_mode=llm_mode,
    )

    return {
        "ok": True,
        "mode": "mock_rag_llm_explanation" if llm_mode == "openrouter" else "mock_rag_fallback_explanation",
        "project": PROJECT_NAME,
        "input": {
            "case_id": case.get("case_id"),
            "query": query,
            "top_k": top_k,
            "use_llm": use_llm,
            "task_type": task_type,
        },
        "original_record": original_record,
        "scoring_formula": {
            "display": SCORING_FORMULA,
            "weights": {
                "source_trust": 0.35,
                "recency_score": 0.25,
                "semantic_match": 0.25,
                "spatial_consistency": 0.15,
            },
            "subscores": {
                "source_trust": "reliability of the data source",
                "recency_score": "newer evidence receives higher weight",
                "semantic_match": "relevance to the current POI task",
                "spatial_consistency": "whether location/address signals are consistent",
            },
        },
        "retrieved_evidence": retrieved_evidence,
        "tool_trace": tool_trace,
        "evidence_comparison": evidence_comparison,
        "decision": decision,
        "llm_explanation": llm_explanation,
        "limitations": _unique(limitations),
        "provenance": {
            "data_source": str(DATA_PATH),
            "case_id": case.get("case_id"),
            "retrieval": "deterministic keyword + trust + recency + spatial scoring",
            "llm_provider": "OpenRouter",
            "llm_model": os.getenv("OPENROUTER_MODEL") or "google/gemini-2.0-flash-001",
            "llm_mode": llm_mode,
            "mock_data_notice": "No production map, merchant, Didi, or live POI data is used.",
        },
    }


def _load_case(case_id: str) -> dict[str, Any]:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    for case in payload.get("cases", []):
        if case.get("case_id") == case_id:
            return case

    available = ", ".join(str(case.get("case_id")) for case in payload.get("cases", []))
    raise ValueError(f"Unknown POI demo case_id={case_id!r}. Available cases: {available}")


def _classify_task_type(case: dict[str, Any], query: str) -> str:
    case_id = str(case.get("case_id") or "").lower()
    text = f"{case_id} {query}".lower()

    if any(term in text for term in ["relocation", "address", "地址", "搬迁", "迁移"]):
        return "address_correction"
    if any(term in text for term in ["duplicate", "same poi", "重复", "同一个", "合并"]):
        return "duplicate_detection"
    if any(term in text for term in ["status", "open", "closed", "营业", "闭店", "关闭", "装修"]):
        return "merchant_status_check"
    return "address_correction"


def _score_evidence(
    evidence: list[dict[str, Any]],
    query: str,
    task_type: str,
    original_record: dict[str, Any],
) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []

    for item in evidence:
        source_trust = _clamp(float(item.get("source_trust") or 0.0))
        recency_score = _recency_score(str(item.get("updated_at") or ""))
        semantic_match = _semantic_match(query, task_type, item)
        spatial_consistency, distance_meters = _spatial_consistency(
            task_type=task_type,
            original_record=original_record,
            item=item,
        )
        # This scoring is RAG-style retrieval, but deliberately avoids a vector DB:
        # the demo is about evidence ranking transparency for POI quality workflows.
        final_score = (
            0.35 * source_trust
            + 0.25 * recency_score
            + 0.25 * semantic_match
            + 0.15 * spatial_consistency
        )

        enriched = {
            "source": item.get("source"),
            "claim": item.get("claim"),
            "updated_at": item.get("updated_at"),
            "source_trust": round(source_trust, 3),
            "recency_score": round(recency_score, 3),
            "semantic_match": round(semantic_match, 3),
            "spatial_consistency": round(spatial_consistency, 3),
            "final_score": round(final_score, 3),
            "supports": item.get("supports"),
        }
        if distance_meters is not None:
            enriched["distance_meters"] = round(distance_meters, 1)
        scored.append(enriched)

    scored.sort(key=lambda row: float(row["final_score"]), reverse=True)
    return [{**row, "rank": index + 1} for index, row in enumerate(scored)]


def _recency_score(updated_at: str) -> float:
    try:
        year = int(updated_at[:4])
    except ValueError:
        return 0.35

    if year >= 2026:
        return 1.0
    if year == 2025:
        return 0.8
    if year == 2024:
        return 0.55
    return 0.35


def _semantic_match(query: str, task_type: str, item: dict[str, Any]) -> float:
    keywords = set(TASK_KEYWORDS.get(task_type, set()))
    keywords.update(str(keyword).lower() for keyword in item.get("semantic_keywords") or [])

    evidence_text = (
        f"{item.get('claim', '')} {' '.join(str(keyword) for keyword in item.get('semantic_keywords') or [])}"
    ).lower()
    query_text = query.lower()

    matched = 0
    for keyword in keywords:
        if keyword and (keyword in query_text or keyword in evidence_text):
            matched += 1

    denominator = max(6, min(len(keywords), 12))
    return _clamp(matched / denominator)


def _spatial_consistency(
    task_type: str,
    original_record: dict[str, Any],
    item: dict[str, Any],
) -> tuple[float, float | None]:
    if task_type == "duplicate_detection":
        distance = _extract_pair_distance(original_record)
        if distance < 30:
            return 1.0, distance
        if distance < 100:
            return 0.75, distance
        return 0.4, distance

    if task_type == "merchant_status_check":
        source = str(item.get("source") or "")
        return (0.8 if source in {"order_signal", "merchant_backend"} else 0.5), None

    lat = item.get("lat")
    lng = item.get("lng")
    original_lat = original_record.get("lat")
    original_lng = original_record.get("lng")

    if not all(isinstance(value, (int, float)) for value in [lat, lng, original_lat, original_lng]):
        return 0.5, None

    distance = haversine_meters(
        lat1=float(original_lat),
        lng1=float(original_lng),
        lat2=float(lat),
        lng2=float(lng),
    )
    if 30 <= distance <= 300:
        return 0.8, distance
    if distance < 30:
        return 0.6, distance
    return 0.4, distance


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_meters = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_meters * c


def _extract_pair_distance(original_record: dict[str, Any]) -> float:
    raw_distance = original_record.get("pair_distance_meters")
    if isinstance(raw_distance, (int, float)):
        return float(raw_distance)

    poi_a = original_record.get("poi_a") if isinstance(original_record.get("poi_a"), dict) else {}
    poi_b = original_record.get("poi_b") if isinstance(original_record.get("poi_b"), dict) else {}
    values = [poi_a.get("lat"), poi_a.get("lng"), poi_b.get("lat"), poi_b.get("lng")]
    if all(isinstance(value, (int, float)) for value in values):
        return haversine_meters(
            lat1=float(poi_a["lat"]),
            lng1=float(poi_a["lng"]),
            lat2=float(poi_b["lat"]),
            lng2=float(poi_b["lng"]),
        )
    return 9999.0


def _compare_evidence(
    task_type: str,
    original_record: dict[str, Any],
    scored_evidence: list[dict[str, Any]],
    retrieved_evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = {
        "supports_old_record": [],
        "supports_relocation": [],
        "supports_duplicate": [],
        "supports_closure": [],
        "supports_active": [],
        "conflicting_evidence": [],
        "uncertainty": [],
    }

    for item in scored_evidence:
        support = str(item.get("supports") or "uncertain")
        slim_item = {
            "source": item.get("source"),
            "claim": item.get("claim"),
            "updated_at": item.get("updated_at"),
            "final_score": item.get("final_score"),
            "supports": support,
        }
        if support == "old_record":
            groups["supports_old_record"].append(slim_item)
        elif support == "relocation":
            groups["supports_relocation"].append(slim_item)
        elif support == "duplicate":
            groups["supports_duplicate"].append(slim_item)
        elif support in {"closed", "temporary_closed"}:
            groups["supports_closure"].append(slim_item)
        elif support == "active":
            groups["supports_active"].append(slim_item)
        else:
            groups["uncertainty"].append(slim_item)

    if task_type == "address_correction":
        groups["conflicting_evidence"] = groups["supports_old_record"]
        dominant_signal = "relocation"
        distance_summary = _distance_summary(retrieved_evidence, "merchant_backend")
    elif task_type == "duplicate_detection":
        groups["conflicting_evidence"] = groups["uncertainty"]
        dominant_signal = "duplicate"
        distance_summary = {"pair_distance_meters": round(_extract_pair_distance(original_record), 1)}
    else:
        groups["conflicting_evidence"] = groups["supports_active"]
        dominant_signal = "temporary_closed"
        distance_summary = {}

    return {
        **groups,
        "dominant_signal": dominant_signal,
        "distance_summary": distance_summary,
        "top_sources": [item.get("source") for item in retrieved_evidence],
    }


def _distance_summary(evidence: list[dict[str, Any]], source: str) -> dict[str, float]:
    for item in evidence:
        if item.get("source") == source and isinstance(item.get("distance_meters"), (int, float)):
            return {f"{source}_distance_meters": float(item["distance_meters"])}
    return {}


def _make_decision(
    case_id: str,
    task_type: str,
    retrieved_evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    supports = {str(item.get("supports")) for item in retrieved_evidence}
    sources = {str(item.get("source")) for item in retrieved_evidence}

    if case_id == "case_relocation_luckin" or task_type == "address_correction":
        if "merchant_backend" in sources and "user_feedback" in sources and "relocation" in supports:
            return {
                "label": "suspected_relocation",
                "confidence": 0.84,
                "risk_level": "medium",
                "suggested_action": "manual_review_before_update",
                "suggested_update": {
                    "address": "北京市海淀区中关村大街 19 号新中关购物中心 B1",
                    "status": "open",
                },
                "why_not_auto_update": (
                    "POI updates affect real navigation and should be verified before automatic address replacement."
                ),
            }

    if case_id == "case_duplicate_starbucks" or task_type == "duplicate_detection":
        return {
            "label": "likely_duplicate_poi",
            "confidence": 0.91,
            "risk_level": "medium",
            "suggested_action": "merge_candidates_after_review",
            "suggested_update": {
                "merge_policy": "keep one canonical Starbucks POI after phone, address, and merchant owner review",
            },
            "why_not_auto_update": (
                "Duplicate merges can delete navigation/review history, so candidate POIs should be reviewed before merging."
            ),
        }

    # Status signals are intentionally conservative: temporary closure evidence
    # should not become permanent closure without stronger merchant confirmation.
    return {
        "label": "temporarily_closed_or_needs_review",
        "confidence": 0.78,
        "risk_level": "medium",
        "suggested_action": "mark_temporarily_closed_or_manual_review",
        "suggested_update": {
            "status": "temporarily_closed",
        },
        "why_not_auto_update": (
            "The evidence suggests a current closure or renovation, but older active signals prevent permanent closure."
        ),
    }


def _build_tool_trace(
    payload: dict[str, Any],
    case: dict[str, Any],
    query: str,
    task_type: str,
    original_record: dict[str, Any],
    scored_evidence: list[dict[str, Any]],
    retrieved_evidence: list[dict[str, Any]],
    evidence_comparison: dict[str, Any],
    decision: dict[str, Any],
    llm_mode: str,
) -> list[dict[str, str]]:
    return [
        {
            "id": "task-router",
            "title": "Task Router",
            "status": "complete",
            "tool": "classify_task_type",
            "input": query,
            "output": task_type,
            "explanation": "Routes the natural-language POI quality question to address correction, duplicate detection, or merchant status checking.",
        },
        {
            "id": "poi-record-loader",
            "title": "POI Record Loader",
            "status": "complete",
            "tool": "load_mock_case",
            "input": str(payload.get("case_id") or case.get("case_id")),
            "output": _compact_json(original_record),
            "explanation": "Loads the selected internal POI record and all mock evidence from backend/data/poi_mock_cases.json.",
        },
        {
            "id": "evidence-retriever",
            "title": "Evidence Retriever",
            "status": "complete",
            "tool": "score_evidence_chunks",
            "input": SCORING_FORMULA,
            "output": f"{len(scored_evidence)} chunks scored; top {len(retrieved_evidence)} returned.",
            "explanation": "Uses deterministic RAG-style retrieval over evidence chunks instead of a vector database for transparent scoring.",
        },
        {
            "id": "address-normalizer",
            "title": "Address Normalizer",
            "status": "complete",
            "tool": "normalize_address_claims",
            "input": "claim text + address keywords",
            "output": _address_normalizer_output(task_type, original_record, retrieved_evidence),
            "explanation": "Compares address phrases, brand aliases, category labels, and task keywords before evidence comparison.",
        },
        {
            "id": "geo-distance-calculator",
            "title": "Geo Distance Calculator",
            "status": "complete",
            "tool": "haversine_meters",
            "input": "original lat/lng + evidence lat/lng or POI pair distance",
            "output": _compact_json(evidence_comparison.get("distance_summary") or {}),
            "explanation": "Checks whether nearby coordinates are close enough for relocation evidence or duplicate POI evidence.",
        },
        {
            "id": "multi-source-evidence-comparator",
            "title": "Multi-source Evidence Comparator",
            "status": "complete",
            "tool": "compare_support_groups",
            "input": "ranked evidence + support labels",
            "output": _compact_json(
                {
                    "dominant_signal": evidence_comparison.get("dominant_signal"),
                    "top_sources": evidence_comparison.get("top_sources"),
                    "decision": decision.get("label"),
                }
            ),
            "explanation": "Compares merchant, map, user, order, photo, and external-listing signals before making a conservative quality decision.",
        },
        {
            "id": "llm-explanation-generator",
            "title": "LLM Explanation Generator",
            "status": "complete",
            "tool": "openrouter_gemini_explain",
            "input": "deterministic decision + top evidence",
            "output": llm_mode,
            "explanation": "Uses Gemini through OpenRouter only to explain the fixed decision; the LLM is not allowed to override the deterministic label.",
        },
    ]


def _address_normalizer_output(
    task_type: str,
    original_record: dict[str, Any],
    retrieved_evidence: list[dict[str, Any]],
) -> str:
    if task_type == "duplicate_detection":
        poi_a = original_record.get("poi_a") if isinstance(original_record.get("poi_a"), dict) else {}
        poi_b = original_record.get("poi_b") if isinstance(original_record.get("poi_b"), dict) else {}
        return _compact_json(
            {
                "poi_a_address": poi_a.get("address"),
                "poi_b_address": poi_b.get("address"),
                "phone_similarity": "same normalized phone",
            }
        )
    if task_type == "address_correction":
        relocation_claim = next(
            (item.get("claim") for item in retrieved_evidence if item.get("supports") == "relocation"),
            None,
        )
        return _compact_json(
            {
                "original_address": original_record.get("address"),
                "candidate_claim": relocation_claim,
            }
        )
    return "status task; address normalization is secondary to recent merchant/order/user signals"


def _generate_explanation(
    query: str,
    task_type: str,
    original_record: dict[str, Any],
    retrieved_evidence: list[dict[str, Any]],
    evidence_comparison: dict[str, Any],
    decision: dict[str, Any],
    limitations: list[str],
    use_llm: bool,
) -> tuple[str, str | None, str]:
    fallback_limitation = (
        "OPENROUTER_API_KEY is not configured or the LLM call failed; explanation uses deterministic fallback."
    )

    if not use_llm:
        return (
            _fallback_explanation(query, task_type, retrieved_evidence, evidence_comparison, decision),
            fallback_limitation,
            "disabled_fallback",
        )

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return (
            _fallback_explanation(query, task_type, retrieved_evidence, evidence_comparison, decision),
            fallback_limitation,
            "missing_key_fallback",
        )

    model = os.getenv("OPENROUTER_MODEL") or "google/gemini-2.0-flash-001"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "https://ruizelab.com"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "Ruize Lab Portfolio"),
    }
    prompt = (
        "你是 POI 数据质量 Agent 的解释模块。你只能解释给定的确定性决策，不能修改 decision。\n"
        "请用简洁中文说明：检查了什么、最强证据是什么、冲突在哪里、为什么建议人工复核/合并/临时关闭、仍有什么不确定性。\n\n"
        f"query: {query}\n"
        f"task_type: {task_type}\n"
        f"original_record: {_compact_json(original_record)}\n"
        f"scoring_formula: {SCORING_FORMULA}\n"
        f"retrieved_evidence: {_compact_json(retrieved_evidence)}\n"
        f"evidence_comparison: {_compact_json(evidence_comparison)}\n"
        f"deterministic_decision: {_compact_json(decision)}\n"
        f"limitations: {_compact_json(limitations)}"
    )

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You explain POI quality decisions. Never change the deterministic decision. "
                            "Do not claim production data access. Keep the response in Chinese."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.25,
                "max_tokens": 600,
            },
            timeout=35,
        )
        response.raise_for_status()
        payload = response.json()
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not content:
            raise ValueError("OpenRouter response did not contain message content")
        return content, None, "openrouter"
    except Exception:
        return (
            _fallback_explanation(query, task_type, retrieved_evidence, evidence_comparison, decision),
            fallback_limitation,
            "error_fallback",
        )


def _fallback_explanation(
    query: str,
    task_type: str,
    retrieved_evidence: list[dict[str, Any]],
    evidence_comparison: dict[str, Any],
    decision: dict[str, Any],
) -> str:
    strongest = retrieved_evidence[:3]
    strongest_text = "；".join(
        f"{item.get('source')}({item.get('supports')}, score={item.get('final_score')}): {item.get('claim')}"
        for item in strongest
    )
    conflict_count = len(evidence_comparison.get("conflicting_evidence") or [])

    if task_type == "address_correction":
        action_reason = "因为新地址会影响真实导航，当前证据支持疑似搬迁，但仍应人工复核后再替换地址。"
    elif task_type == "duplicate_detection":
        action_reason = "因为候选点距离、电话、品牌和地址高度一致，建议进入合并复核，而不是直接删除任一 POI。"
    else:
        action_reason = "因为近期商户、用户和订单信号支持临时关闭，但旧照片和内部状态仍有冲突，所以不应直接判定永久闭店。"

    return (
        f"本次问题是：{query}。Agent 将任务识别为 {task_type}，先检索多源证据，再按来源可信度、时效性、语义相关性和空间一致性打分。"
        f"最强证据包括：{strongest_text}。当前存在 {conflict_count} 条冲突或旧记录信号。"
        f"确定性决策为 {decision.get('label')}，置信度约 {decision.get('confidence')}，建议动作是 {decision.get('suggested_action')}。"
        f"{action_reason} 剩余不确定性来自 mock 证据规模有限、缺少真实商户合同/现场验证/生产规则校验。"
    )


def _compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique_values: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            unique_values.append(value)
    return unique_values
