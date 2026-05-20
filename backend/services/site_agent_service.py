from __future__ import annotations

import json
import os
import re
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


KNOWLEDGE_DIR = Path(__file__).resolve().parents[1] / "site_knowledge"

SYSTEM_PROMPT = """You are Ruize Lab Sprite, an attention-aware AI agent for Ruize Ma's AI Systems Lab website.

Your job:
- Help visitors understand Ruize Ma, his projects, research experience, technical skills, and thinking about AI agents.
- Use the provided site knowledge as the primary source of truth.
- Explain projects clearly and connect them to broader AI system design ideas.
- Help users decide which project to open first.
- Compare projects when useful.
- Explain why an agent is more than tool calling.
- Emphasize evidence, reasoning structure, human attention, responsible AI, and real-world usefulness.
- If information is not in the provided site knowledge, say that the site does not list it yet.
- Do not invent awards, publications, grades, schools, employers, or claims.
- Do not exaggerate benchmark projects as real clinical deployment.
- For medical questions, clarify that the website contains biomedical reasoning research but does not provide medical advice.
- Keep answers concise, polished, and helpful.
- When relevant, suggest one or two next questions.

Core philosophy:
A useful agent should reduce the distance between a human need and a reliable action. It should understand intent, retrieve context, plan, expose evidence, verify claims, and respect uncertainty.
"""

SOURCE_METADATA: dict[str, dict[str, str]] = {
    "profile.md": {
        "title": "Ruize Ma Profile",
        "url": "/about",
        "type": "profile",
    },
    "projects_nba.md": {
        "title": "NBA Roster Upgrade Agent",
        "url": "/projects/nba-roster-upgrade-agent",
        "type": "project",
    },
    "projects_biomedical.md": {
        "title": "Plan-Act-Verify Biomedical Reasoning",
        "url": "/projects/plan-act-verify-biomedical-reasoning",
        "type": "project",
    },
    "projects_insurance.md": {
        "title": "Insurance Cost Predictor",
        "url": "/projects/insurance-cost-predictor",
        "type": "project",
    },
    "research_experience.md": {
        "title": "Research Experience",
        "url": "/about",
        "type": "research",
    },
    "agent_thoughts.md": {
        "title": "Ruize's AI Agent Philosophy",
        "url": "/",
        "type": "thinking",
    },
    "responsible_ai.md": {
        "title": "Responsible AI Notes",
        "url": "/about",
        "type": "thinking",
    },
}

EXTERNAL_SOURCES_BY_FILE: dict[str, list[dict[str, str]]] = {
    "profile.md": [
        {
            "title": "GitHub: Sherlockmrz",
            "url": "https://github.com/Sherlockmrz",
            "type": "external",
        }
    ],
    "projects_nba.md": [
        {
            "title": "NBA Project GitHub",
            "url": "https://github.com/Sherlockmrz/NBA-Roster-Upgrade-Agent-Webapp",
            "type": "github",
        }
    ],
    "projects_biomedical.md": [
        {
            "title": "MIDI 2025 Abstract PDF",
            "url": "https://midi2025.opi.org.pl/wp-content/uploads/2025/12/Plan-Act-Verify-An-Agentic-AI-Question-Answering-and-Reasoning-System-Evaluated-on-the-CURE-Bench-Challenge.pdf",
            "type": "paper",
        },
        {
            "title": "MIDI 2025 Virtual Venue",
            "url": "https://midi2025.opi.org.pl/vr-venue/",
            "type": "venue",
        },
    ],
    "projects_insurance.md": [
        {
            "title": "Insurance Project GitHub",
            "url": "https://github.com/yinruide/Insurance-Cost-Predictor",
            "type": "github",
        }
    ],
    "research_experience.md": [
        {
            "title": "FLAIRS-39 Accepted Papers",
            "url": "https://www.flairs-39.info/accepted-papers",
            "type": "conference",
        }
    ],
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
}


@dataclass(frozen=True)
class KnowledgeDoc:
    filename: str
    title: str
    url: str
    source_type: str
    content: str
    tokens: set[str]
    score: float = 0.0


def run_site_agent_chat(payload: dict[str, Any]) -> dict[str, Any]:
    print("[site-agent] request received", flush=True)

    message = str(payload.get("message") or "").strip()
    history = payload.get("history") or []

    try:
        if not message:
            return {
                "answer": "Ask me about Ruize, the featured systems, research experience, or how the agent projects work.",
                "intent": "general_question",
                "sources": [],
                "limitations": [],
                "suggested_questions": _suggest_questions("general_question", message),
            }

        intent = _classify_intent(message)
        print(f"[site-agent] intent = {intent}", flush=True)

        docs = _retrieve_context(message, intent)
        print(
            "[site-agent] retrieved files = "
            f"{[doc.filename for doc in docs]}",
            flush=True,
        )

        plan = _plan_answer(intent)
        sources = _build_sources(docs)
        limitations = _base_limitations(message, docs)

        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            limitations.append(
                "OPENROUTER_API_KEY is not configured; this response uses deterministic site retrieval rather than live model generation."
            )
            answer = _deterministic_fallback(message, intent, docs, configured=False)
            print("[site-agent] generation complete", flush=True)
            return {
                "answer": answer,
                "intent": intent,
                "sources": sources,
                "limitations": _unique(limitations),
                "suggested_questions": _suggest_questions(intent, message),
            }

        answer, llm_suggestions = _generate_with_openrouter(
            api_key=api_key,
            message=message,
            history=history,
            intent=intent,
            plan=plan,
            docs=docs,
        )
        answer = _verify_answer(answer, message, docs)
        print("[site-agent] generation complete", flush=True)

        return {
            "answer": answer,
            "intent": intent,
            "sources": sources,
            "limitations": _unique(limitations),
            "suggested_questions": _merge_suggestions(
                llm_suggestions,
                _suggest_questions(intent, message),
            ),
        }
    except Exception as exc:
        print(f"[site-agent] error = {exc!r}", flush=True)
        print(traceback.format_exc(), flush=True)
        return {
            "answer": "The AI assistant is temporarily unavailable. Please try again soon.",
            "intent": "general_question",
            "sources": [],
            "limitations": [str(exc)],
            "suggested_questions": [
                "Which project should I open first?",
                "Explain Ruize's view on AI agents.",
            ],
        }


def _classify_intent(message: str) -> str:
    text = message.lower()

    navigation_terms = [
        "open",
        "where",
        "which project",
        "start",
        "first",
        "navigate",
        "visit",
        "看哪个",
        "从哪里",
        "打开",
    ]
    comparison_terms = [
        "compare",
        "different",
        "difference",
        "strongest",
        "best",
        "versus",
        "vs",
        "哪个更",
        "区别",
        "最强",
    ]
    pipeline_terms = [
        "pipeline",
        "architecture",
        "tool",
        "tool a",
        "tool b",
        "tool c",
        "model",
        "rag",
        "retrieval",
        "verification",
        "flow",
        "技术",
        "架构",
        "流程",
        "工具",
    ]
    agent_terms = [
        "agent",
        "agents",
        "ai agent",
        "attention",
        "responsible",
        "tool calling",
        "human need",
        "reliable action",
        "智能体",
        "代理",
        "负责",
        "注意力",
    ]
    research_terms = [
        "research",
        "publication",
        "paper",
        "midi",
        "flairs",
        "author",
        "cure",
        "experience",
        "研究",
        "论文",
        "作者",
        "发表",
    ]
    profile_terms = [
        "ruize",
        "ma",
        "profile",
        "contact",
        "wechat",
        "github",
        "nyu",
        "toefl",
        "course",
        "skill",
        "who",
        "about",
        "马",
        "联系",
        "课程",
        "技能",
    ]
    project_terms = [
        "project",
        "nba",
        "roster",
        "basketball",
        "warriors",
        "biomedical",
        "medical",
        "drug",
        "insurance",
        "prediction",
        "cost",
        "项目",
        "篮球",
        "生物",
        "医学",
        "保险",
    ]

    if _contains_any(text, navigation_terms):
        return "navigation_request"
    if _contains_any(text, comparison_terms):
        return "project_comparison"
    if _contains_any(text, agent_terms):
        return "agent_philosophy_question"
    if _contains_any(text, research_terms):
        return "research_experience_question"
    if _contains_any(text, pipeline_terms):
        return "technical_pipeline_question"
    if _contains_any(text, project_terms):
        if any(term in text for term in ["overview", "summary", "what is", "介绍", "概述"]):
            return "project_overview"
        return "project_explanation"
    if _contains_any(text, profile_terms):
        return "profile_question"

    return "general_question"


def _retrieve_context(message: str, intent: str) -> list[KnowledgeDoc]:
    docs = _load_knowledge_docs()
    if not docs:
        return []

    message_tokens = _tokenize(message)
    priority_files = set(_priority_files(message, intent))
    scored: list[KnowledgeDoc] = []

    for doc in docs:
        overlap = message_tokens.intersection(doc.tokens)
        overlap_score = len(overlap) / max(len(message_tokens), 1)
        route_bonus = 0.22 if doc.filename in priority_files else 0.0
        phrase_bonus = _phrase_bonus(message, doc.filename)
        score = overlap_score + route_bonus + phrase_bonus
        scored.append(
            KnowledgeDoc(
                filename=doc.filename,
                title=doc.title,
                url=doc.url,
                source_type=doc.source_type,
                content=doc.content,
                tokens=doc.tokens,
                score=score,
            )
        )

    scored.sort(key=lambda doc: doc.score, reverse=True)
    selected = [doc for doc in scored if doc.score > 0.0][:4]

    if selected:
        return selected

    fallback_files = ["profile.md", "agent_thoughts.md", "research_experience.md"]
    return [doc for doc in scored if doc.filename in fallback_files][:3]


def _load_knowledge_docs() -> list[KnowledgeDoc]:
    docs: list[KnowledgeDoc] = []
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        metadata = SOURCE_METADATA.get(
            path.name,
            {"title": path.stem.replace("_", " ").title(), "url": "/", "type": "knowledge"},
        )
        content = path.read_text(encoding="utf-8")
        docs.append(
            KnowledgeDoc(
                filename=path.name,
                title=metadata["title"],
                url=metadata["url"],
                source_type=metadata["type"],
                content=content,
                tokens=_tokenize(content),
            )
        )
    return docs


def _priority_files(message: str, intent: str) -> list[str]:
    text = message.lower()
    files: list[str] = []

    if intent == "profile_question":
        files.extend(["profile.md", "research_experience.md"])
    if intent in {"research_experience_question", "project_comparison"}:
        files.append("research_experience.md")
    if intent == "agent_philosophy_question":
        files.extend(["agent_thoughts.md", "responsible_ai.md"])
    if intent == "navigation_request":
        files.extend(
            [
                "profile.md",
                "projects_nba.md",
                "projects_biomedical.md",
                "projects_insurance.md",
            ]
        )
    if intent == "technical_pipeline_question":
        files.extend(
            [
                "projects_nba.md",
                "projects_biomedical.md",
                "projects_insurance.md",
                "agent_thoughts.md",
            ]
        )
    if any(term in text for term in ["nba", "roster", "basketball", "warriors", "tool a", "tool b", "tool c", "篮球"]):
        files.append("projects_nba.md")
    if any(term in text for term in ["biomedical", "medical", "drug", "cure", "midi", "tool facts", "生物", "医学", "药"]):
        files.extend(["projects_biomedical.md", "research_experience.md"])
    if any(term in text for term in ["insurance", "cost", "prediction", "uncertainty", "feature", "保险", "预测"]):
        files.append("projects_insurance.md")
    if any(term in text for term in ["agent", "rag", "responsible", "reasoning", "智能体", "负责"]):
        files.extend(["agent_thoughts.md", "responsible_ai.md"])
    if not files:
        files.extend(["profile.md", "research_experience.md", "agent_thoughts.md"])

    return _unique(files)


def _phrase_bonus(message: str, filename: str) -> float:
    text = message.lower()
    file_phrases: dict[str, list[str]] = {
        "profile.md": ["ruize", "nyu", "wechat", "github", "toefl", "skills"],
        "projects_nba.md": ["nba", "roster", "warriors", "basketball", "scouting"],
        "projects_biomedical.md": ["biomedical", "medical", "cure", "midi", "tool facts"],
        "projects_insurance.md": ["insurance", "cost", "prediction", "uncertainty"],
        "research_experience.md": ["research", "publication", "flairs", "midi", "experience"],
        "agent_thoughts.md": ["agent", "attention", "human need", "tool calling"],
        "responsible_ai.md": ["responsible", "limitations", "uncertainty", "medical advice"],
    }
    return 0.08 * sum(phrase in text for phrase in file_phrases.get(filename, []))


def _plan_answer(intent: str) -> str:
    plans = {
        "profile_question": "Answer from Ruize's profile, then point to contact or skills only when relevant.",
        "project_overview": "Summarize the relevant project, name the core system idea, and offer one next place to explore.",
        "project_explanation": "Explain the project through its inputs, workflow, outputs, and what makes it useful.",
        "project_comparison": "Compare projects by purpose, agent design, evidence, and best visitor path.",
        "technical_pipeline_question": "Describe the pipeline step by step while separating implemented facts from design interpretation.",
        "research_experience_question": "Use the research timeline and avoid adding publications or awards not listed.",
        "agent_philosophy_question": "Connect the answer to intent, retrieval, planning, evidence, verification, and uncertainty.",
        "navigation_request": "Recommend the most relevant project page based on the user's goal.",
        "general_question": "Give a concise helpful answer and connect to site knowledge when possible.",
    }
    return plans.get(intent, plans["general_question"])


def _generate_with_openrouter(
    *,
    api_key: str,
    message: str,
    history: list[dict[str, Any]],
    intent: str,
    plan: str,
    docs: list[KnowledgeDoc],
) -> tuple[str, list[str]]:
    model = os.getenv("OPENROUTER_MODEL") or "openrouter/auto"
    site_url = os.getenv("OPENROUTER_SITE_URL") or "http://localhost:3000"
    app_name = os.getenv("OPENROUTER_APP_NAME") or "Ruize Lab Sprite"

    prompt = _build_generation_prompt(
        message=message,
        history=history,
        intent=intent,
        plan=plan,
        docs=docs,
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": site_url,
            "X-Title": app_name,
        },
        json={
            "model": model,
            "messages": messages,
            "temperature": 0.35,
            "max_tokens": 700,
        },
        timeout=35,
    )
    response.raise_for_status()

    data = response.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    parsed = _parse_jsonish(content)

    if isinstance(parsed, dict):
        answer = str(parsed.get("answer") or "").strip()
        suggestions = parsed.get("suggested_questions") or []
        clean_suggestions = [
            str(question).strip()
            for question in suggestions
            if str(question).strip()
        ][:3]
        if answer:
            return answer, clean_suggestions

    if content:
        return content, []

    return _deterministic_fallback(message, intent, docs, configured=True), []


def _build_generation_prompt(
    *,
    message: str,
    history: list[dict[str, Any]],
    intent: str,
    plan: str,
    docs: list[KnowledgeDoc],
) -> str:
    context_blocks = []
    for doc in docs:
        context_blocks.append(
            f"### {doc.title} ({doc.filename})\n{_trim(doc.content, 3200)}"
        )

    clean_history = []
    for item in history[-6:]:
        role = item.get("role")
        content = str(item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            clean_history.append(f"{role}: {_trim(content, 700)}")

    return f"""Current user question:
{message}

Detected intent:
{intent}

Answer plan:
{plan}

Recent conversation:
{chr(10).join(clean_history) if clean_history else "(none)"}

Retrieved site knowledge:
{chr(10).join(context_blocks) if context_blocks else "(no strong context retrieved)"}

Instructions:
- Answer in the same language as the current user question when reasonable.
- For site-specific claims, use only the retrieved site knowledge.
- If the knowledge does not list a detail, say that.
- Do not provide medical advice.
- Keep the answer compact and useful.
- Return valid JSON only with this shape:
  {{"answer": "string", "suggested_questions": ["string", "string"]}}
"""


def _deterministic_fallback(
    message: str,
    intent: str,
    docs: list[KnowledgeDoc],
    *,
    configured: bool,
) -> str:
    prefix = ""
    if not configured:
        if _is_chinese(message):
            prefix = "Ruize Lab Sprite 可以读取本地站点知识，但由于 OPENROUTER_API_KEY 尚未配置，实时模型生成暂不可用。"
        else:
            prefix = (
                "Ruize Lab Sprite can read the local site knowledge, but live "
                "OpenRouter generation is not configured yet because OPENROUTER_API_KEY "
                "is missing. "
            )

    if _is_chinese(message):
        if intent == "agent_philosophy_question":
            return (
                prefix
                + "Ruize 的观点是，智能体不应只按调用了多少工具来评价。真正有用的智能体应该降低人的注意力成本，把模糊需求转化为可靠行动：理解意图、检索上下文、规划、在有用时调用工具、暴露证据、验证结论，并尊重不确定性。"
            )
        if intent == "navigation_request":
            return (
                prefix
                + "如果你想看最清晰的智能体推理系统，可以先打开 Biomedical 项目；如果想看工具编排和推荐流程，可以看 NBA 项目；如果想看预测建模、不确定性和特征解释，可以看 Insurance 项目。"
            )
        if intent == "profile_question":
            return (
                prefix
                + "Ruize Ma 是纽约大学 Data Science/Math 学生，正在通过 Ruize Lab / AI Systems Lab 构建 LLM agents 和数据驱动应用。站点列出的 GitHub 是 Sherlockmrz，WeChat 是 Marvin041018，TOEFL 是 112/120，编程技能包括 Java、Python、SQL 和 R。"
            )
        if intent == "research_experience_question":
            return (
                prefix
                + "Ruize 的研究经历包括 MIDI 2025 First Author 的 Plan-Act-Verify CURE-Bench 项目、FLAIRS-39 accepted 的 Reliability Beyond Accuracy 第二作者项目，以及保险预测、NBA 阵容智能、教授评分建模和租金预测等应用型机器学习项目。"
            )
        if intent in {"project_overview", "project_explanation", "technical_pipeline_question", "project_comparison"}:
            return (
                prefix
                + "站点重点展示三个系统：NBA Roster Upgrade Agent 用查询解析、工具选择、球队需求诊断、球员强度向量、fit ranking、鲁棒性检查和 grounded Q&A 做推荐；Plan-Act-Verify Biomedical Reasoning 用检索、Tool Facts、验证和答案合成做医学基准推理；Insurance Cost Predictor 使用保存的模型 artifacts、不确定性信号、模型比较和特征驱动解释来预测保险费用。"
            )
        return prefix + "站点知识暂时没有列出更具体的信息。你可以询问 Ruize、NBA agent、biomedical reasoning、insurance prediction、research experience 或 responsible AI。"

    if intent == "agent_philosophy_question":
        return (
            prefix
            + "Ruize's view is that useful agents should not be judged only by how many tools they call. "
            "They should reduce human attention cost by moving from a vague need to a reliable action: understand intent, retrieve context, plan, use tools when helpful, expose evidence, verify claims, and respect uncertainty."
        )
    if intent == "navigation_request":
        return (
            prefix
            + "Open the biomedical project first if you want to see the clearest agentic reasoning system, the NBA project if you want modular tool orchestration for recommendations, and the insurance project if you want predictive modeling with uncertainty and feature explanations."
        )
    if intent == "profile_question":
        return (
            prefix
            + "Ruize Ma is a Data Science/Math student at New York University building LLM agents and data-driven applications through Ruize Lab / AI Systems Lab. "
            "The site lists GitHub as Sherlockmrz, WeChat as Marvin041018, TOEFL as 112/120, and programming skills in Java, Python, SQL, and R."
        )
    if intent in {"project_overview", "project_explanation", "technical_pipeline_question", "project_comparison"}:
        titles = ", ".join(doc.title for doc in docs[:3]) or "the featured systems"
        return (
            prefix
            + f"The most relevant site knowledge points to {titles}. "
            "The portfolio highlights three system types: an NBA roster agent with query parsing, tool selection, need diagnosis, player strength vectors, fit ranking, robustness checks, and grounded Q&A; a Plan-Act-Verify biomedical QA agent with retrieval, Tool Facts, verification, and final answer synthesis; and an insurance cost predictor using saved model artifacts, uncertainty signals, model comparison, and feature drivers."
        )
    if intent == "research_experience_question":
        return (
            prefix
            + "Ruize's research experience includes Plan-Act-Verify for CURE-Bench as First Author at MIDI 2025, Reliability Beyond Accuracy as Second Author accepted at FLAIRS-39, plus applied ML projects in insurance cost prediction, NBA roster intelligence, professor-rating modeling, and rental price estimation."
        )

    highlights = _extract_highlights(docs)
    if highlights:
        return prefix + "Based on the retrieved site knowledge: " + " ".join(highlights[:3])
    return prefix + "The site knowledge does not list a specific answer yet, but you can ask about Ruize, the NBA agent, the biomedical reasoning system, insurance prediction, research experience, or responsible AI."


def _verify_answer(answer: str, message: str, docs: list[KnowledgeDoc]) -> str:
    clean = answer.strip()
    lower_message = message.lower()
    medical_terms = ["medical", "biomedical", "drug", "clinical", "dose", "treatment", "medicine", "医学", "药", "治疗"]

    if any(term in lower_message for term in medical_terms):
        lower_answer = clean.lower()
        if "medical advice" not in lower_answer and "not provide" not in lower_answer and "不是医疗建议" not in clean:
            clean += " This is research and benchmark context from the website, not medical advice."

    if not docs:
        clean += " The site knowledge does not list more specific details yet."

    return clean


def _is_chinese(text: str) -> bool:
    return any("\u4e00" <= character <= "\u9fff" for character in text)


def _base_limitations(message: str, docs: list[KnowledgeDoc]) -> list[str]:
    limitations: list[str] = []
    filenames = {doc.filename for doc in docs}
    text = message.lower()

    if not docs:
        limitations.append("No strong site-knowledge match was retrieved for this question.")
    if "projects_biomedical.md" in filenames or any(term in text for term in ["medical", "drug", "clinical", "医学", "药"]):
        limitations.append("Biomedical content describes research and benchmark behavior, not medical advice.")
    if "projects_nba.md" in filenames:
        limitations.append("Live NBA recomputation depends on backend resources and NBA data availability.")
    if "salary" in text or "injury" in text or "trade rumor" in text:
        limitations.append("The NBA project knowledge does not provide live salary, injury, or trade-rumor data.")

    return limitations


def _build_sources(docs: list[KnowledgeDoc]) -> list[dict[str, str]]:
    sources: list[dict[str, str]] = []
    seen: set[str] = set()

    for doc in docs[:4]:
        source = {
            "title": doc.title,
            "url": doc.url,
            "type": doc.source_type,
        }
        if source["url"] not in seen:
            sources.append(source)
            seen.add(source["url"])

        for external in EXTERNAL_SOURCES_BY_FILE.get(doc.filename, [])[:1]:
            if external["url"] not in seen:
                sources.append(external)
                seen.add(external["url"])

        if len(sources) >= 5:
            break

    return sources


def _suggest_questions(intent: str, message: str) -> list[str]:
    text = message.lower()
    if "nba" in text or "basketball" in text:
        return [
            "Why does the NBA project need tools?",
            "How is the NBA agent different from zero-shot recommendations?",
            "What should I inspect in the NBA workflow?",
        ]
    if "biomedical" in text or "medical" in text or "cure" in text:
        return [
            "How is the biomedical project different from a normal chatbot?",
            "What are Tool Facts?",
            "Why does verification matter in medical reasoning?",
        ]
    if "insurance" in text:
        return [
            "How does the insurance model explain a prediction?",
            "What does uncertainty mean in this project?",
            "Which model artifacts are wrapped by the backend?",
        ]
    if intent == "agent_philosophy_question":
        return [
            "What does responsible AI mean in these projects?",
            "Why is an agent more than tool calling?",
            "Which project best shows this philosophy?",
        ]
    if intent == "navigation_request":
        return [
            "Which project should I open first?",
            "What is Ruize's strongest AI agent project?",
            "Compare the three featured systems.",
        ]
    return [
        "What is Ruize's strongest AI agent project?",
        "Explain Ruize's view on AI agents.",
        "Which project should I open first?",
    ]


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9][a-zA-Z0-9+\-/]*", text.lower())
    tokens = {word for word in words if len(word) > 1 and word not in STOPWORDS}

    chinese_terms = [
        "智能体",
        "代理",
        "项目",
        "研究",
        "医学",
        "医疗",
        "生物",
        "药",
        "篮球",
        "保险",
        "预测",
        "负责",
        "课程",
        "技能",
    ]
    for term in chinese_terms:
        if term in text:
            tokens.add(term)

    return tokens


def _contains_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def _parse_jsonish(content: str) -> Any:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _merge_suggestions(primary: list[str], fallback: list[str]) -> list[str]:
    merged = [question for question in primary if question]
    merged.extend(fallback)
    return _unique(merged)[:3]


def _extract_highlights(docs: list[KnowledgeDoc]) -> list[str]:
    highlights: list[str] = []
    for doc in docs:
        for line in doc.content.splitlines():
            stripped = line.strip()
            if stripped.startswith("- "):
                highlights.append(stripped[2:].strip())
            if len(highlights) >= 5:
                return highlights
    return highlights


def _trim(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."


def _unique(items: list[Any]) -> list[Any]:
    unique_items: list[Any] = []
    seen: set[str] = set()
    for item in items:
        marker = json.dumps(item, sort_keys=True) if isinstance(item, dict) else str(item)
        if marker in seen:
            continue
        unique_items.append(item)
        seen.add(marker)
    return unique_items
