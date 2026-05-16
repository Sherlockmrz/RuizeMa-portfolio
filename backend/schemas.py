from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class NBARequest(BaseModel):
    query: str = Field(
        default=(
            "Recommend the top 5 players for the Golden State Warriors to improve "
            "interior defense over the last 10 games. Only include players with at "
            "least 15 games and 15 average minutes. Check whether the ranking is "
            "robust, and keep a grounded Q&A section for follow-up questions."
        )
    )
    use_llm: bool = False
    filters: dict[str, Any] = Field(default_factory=dict)
    run_evaluation: bool = False
    grounded_question: str | None = None
    use_sidebar_as_manual_override: bool = False
    run_tool_benchmark: bool = False


class NBAQARequest(BaseModel):
    question: str = Field(default="")
    use_llm: bool = False
    latest: bool = True
    agent_result: dict[str, Any] | None = None


class NBAEvaluateRequest(BaseModel):
    query: str | None = None
    use_llm: bool = False
    filters: dict[str, Any] = Field(default_factory=dict)
    use_sidebar_as_manual_override: bool = False
    run_tool_benchmark: bool = True
    agent_result: dict[str, Any] | None = None


class BiomedicalRequest(BaseModel):
    question: str = Field(default="")
    choices: list[str] | dict[str, str] = Field(default_factory=list)
    allow_live: bool = False


class InsuranceRequest(BaseModel):
    age: int = Field(default=35, ge=18, le=64)
    bmi: float = Field(default=27.5, ge=15.0, le=54.0)
    children: int = Field(default=1, ge=0, le=5)
    sex: Literal["female", "male"] = "female"
    region: Literal["northeast", "northwest", "southeast", "southwest"] = "northeast"
    smoker_status: Literal["no", "yes", "unknown"] = "unknown"
    model_selector: Literal["block2_stratified_rf"] = "block2_stratified_rf"


class PipelineStep(BaseModel):
    id: str
    title: str
    status: Literal["complete", "review", "warning", "error"]
    tool: str
    input: str
    output: str
    explanation: str


class ServiceResponse(BaseModel):
    ok: bool
    mode: str
    project: str
    input: dict[str, Any]
    trace: list[PipelineStep]
    result: dict[str, Any]
    limitations: list[str]
    provenance: dict[str, Any]
