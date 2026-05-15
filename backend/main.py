from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import BiomedicalRequest, InsuranceRequest, NBARequest, ServiceResponse
from backend.services.biomedical_service import run_biomedical
from backend.services.insurance_service import predict_insurance
from backend.services.nba_service import run_nba

app = FastAPI(
    title="Ruize Ma Portfolio Backend",
    version="1.0.0",
    description=(
        "Backend wrappers around Ruize Ma's original NBA agent, biomedical "
        "reasoning, and insurance prediction projects."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/nba/run", response_model=ServiceResponse)
def nba_run(request: NBARequest) -> ServiceResponse:
    return ServiceResponse(**run_nba(request.query))


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
