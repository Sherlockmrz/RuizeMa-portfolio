from __future__ import annotations

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
)
from backend.services.biomedical_service import run_biomedical
from backend.services.insurance_service import predict_insurance
from backend.services.nba_service import evaluate_nba, run_nba, run_nba_qa

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


@app.post("/api/nba/run")
def nba_run(request: NBARequest) -> dict[str, Any]:
    return run_nba(request.model_dump())


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
