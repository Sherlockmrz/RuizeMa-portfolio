from __future__ import annotations

import traceback
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import (
    BiomedicalRequest,
    InsuranceRequest,
    NBAEvaluateRequest,
    NBAQARequest,
    NBARequest,
    ServiceResponse,
    SiteAgentRequest,
    SiteAgentResponse,
)
from backend.services.biomedical_service import run_biomedical
from backend.services.insurance_service import predict_insurance
from backend.services.nba_service import evaluate_nba, run_nba, run_nba_qa
from backend.services.site_agent_service import run_site_agent_chat

app = FastAPI(
    title="Ruize Lab Backend",
    version="1.0.0",
    description=(
        "Backend wrappers around Ruize Ma's original NBA agent, biomedical "
        "reasoning, and insurance prediction projects."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local frontend development
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",

        # Cloudflare Pages frontend
        "https://ruizema-portfolio.pages.dev",

        # Custom domain frontend
        "https://ruizelab.com",
        "https://www.ruizelab.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/site-agent/chat", response_model=SiteAgentResponse)
def site_agent_chat(request: SiteAgentRequest) -> SiteAgentResponse:
    try:
        return SiteAgentResponse(**run_site_agent_chat(request.model_dump()))
    except Exception as exc:
        print(f"[site-agent] error = {exc!r}", flush=True)
        print(traceback.format_exc(), flush=True)
        return SiteAgentResponse(
            answer="The AI assistant is temporarily unavailable. Please try again soon.",
            intent="general_question",
            sources=[],
            limitations=[str(exc)],
            suggested_questions=[
                "Which project should I open first?",
                "Explain Ruize's view on AI agents.",
            ],
        )


@app.post("/api/nba/run")
def nba_run(request: NBARequest) -> dict[str, Any] | ServiceResponse:
    print("[api/nba/run] request entered endpoint", flush=True)
    payload = request.model_dump()
    print(f"[api/nba/run] request payload: {payload!r}", flush=True)

    try:
        print("[api/nba/run] before calling run_nba", flush=True)
        response = run_nba(payload)
        print(
            "[api/nba/run] run_nba succeeded "
            f"ok={response.get('ok')} mode={response.get('mode')}",
            flush=True,
        )
        return response
    except Exception as exc:
        error_traceback = traceback.format_exc()
        print(f"[api/nba/run] run_nba failed: {exc!r}", flush=True)
        print(f"[api/nba/run] exception traceback:\n{error_traceback}", flush=True)
        return ServiceResponse(
            ok=False,
            mode="error",
            project="NBA Roster Upgrade Agent",
            input=payload,
            trace=[
                {
                    "id": "nba-endpoint-error",
                    "title": "NBA endpoint error",
                    "status": "error",
                    "tool": "backend.main.nba_run",
                    "input": repr(payload),
                    "output": str(exc),
                    "explanation": (
                        "The FastAPI endpoint caught an exception while calling "
                        "run_nba and returned a structured error response."
                    ),
                }
            ],
            result={
                "error": str(exc),
                "error_type": type(exc).__name__,
            },
            limitations=[
                "The NBA backend failed before returning a complete AgentResult payload."
            ],
            provenance={
                "source": "backend.main.nba_run",
                "wrapped_service": "backend.services.nba_service.run_nba",
            },
        )


@app.post("/api/nba/qa")
def nba_qa(request: NBAQARequest) -> dict[str, Any]:
    return run_nba_qa(request.model_dump())


@app.post("/api/nba/evaluate")
def nba_evaluate(request: NBAEvaluateRequest) -> dict[str, Any]:
    return evaluate_nba(request.model_dump())


@app.post("/api/biomedical/run", response_model=ServiceResponse)
def biomedical_run(request: BiomedicalRequest) -> ServiceResponse:
    return ServiceResponse(
        **run_biomedical(
            question=request.question,
            choices=request.choices,
            allow_live=request.allow_live,
        )
    )


@app.post("/api/insurance/predict", response_model=ServiceResponse)
def insurance_predict(request: InsuranceRequest) -> ServiceResponse:
    return ServiceResponse(**predict_insurance(request.model_dump()))
