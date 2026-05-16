"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Database, Loader2, Play, Server } from "lucide-react";

import type { PipelineStep, Project } from "@/data/projects";
import { cn } from "@/lib/utils";
import { NbaAgentConsole } from "./NbaAgentConsole";
import { PipelineViewer } from "./PipelineViewer";

type ServiceResponse = {
  ok: boolean;
  mode: string;
  project: string;
  input: Record<string, unknown>;
  trace: PipelineStep[];
  result: Record<string, unknown>;
  limitations: string[];
  provenance: Record<string, unknown>;
};

type NbaRecommendation = {
  player_name?: string;
  current_team?: string;
  gp?: number;
  avg_min?: number;
  fit_score?: number;
  best_match?: string;
};

type BiomedicalResultShape = {
  plan?: {
    keywords?: string[];
    facts_needed?: string[];
  };
  tool_facts?: string[];
  choice?: string;
  final_answer?: string;
};

type InsuranceResultShape = {
  prediction?: {
    estimate: number;
    q10: number;
    q50: number;
    q90: number;
    segment: string;
    routing_summary: string;
  };
  feature_explanation?: Record<string, unknown>[];
  model_comparison?: Record<string, unknown>[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const nbaDefaultQuery =
  "Recommend top 5 players for the Warriors to improve interior defense using the last 10 games. Only include players with at least 20 games and 18 average minutes.";

const biomedicalDefault = {
  question:
    "A 15-year-old with generalized myasthenia gravis, confirmed by positive anti-acetylcholine receptor antibodies and exhibiting fatigable weakness and ptosis, presents without a history of organophosphate exposure, pregnancy, or other health issues. Which medication regimen is considered safest and most effective for pediatric patients in this scenario?",
  choices: [
    "Azathioprine, 50 mg daily, as an immunosuppressive adjunct",
    "DuoDote, single dose for acute symptom management",
    "IMAAVY, 15 mg/kg intravenous infusion every 2 weeks",
    "Azathioprine, 100 mg daily, with a drug holiday every 2 months",
  ],
};

type InsuranceForm = {
  age: number;
  bmi: number;
  children: number;
  sex: "female" | "male";
  region: "northeast" | "northwest" | "southeast" | "southwest";
  smoker_status: "no" | "yes" | "unknown";
  model_selector: "block2_stratified_rf";
};

const insuranceDefault: InsuranceForm = {
  age: 35,
  bmi: 27.5,
  children: 1,
  sex: "female",
  region: "northeast",
  smoker_status: "unknown",
  model_selector: "block2_stratified_rf",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

async function postJson(endpoint: string, body: unknown) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return (await response.json()) as ServiceResponse;
}

type BackendRunnerProps = {
  project: Project;
};

export function BackendRunner({ project }: BackendRunnerProps) {
  if (project.demoKey === "nba") {
    return <NbaAgentConsole project={project} />;
  }

  return <GenericBackendRunner project={project} />;
}

function GenericBackendRunner({ project }: BackendRunnerProps) {
  const [response, setResponse] = useState<ServiceResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nbaQuery, setNbaQuery] = useState(nbaDefaultQuery);
  const [bioQuestion, setBioQuestion] = useState(biomedicalDefault.question);
  const [bioChoices, setBioChoices] = useState(biomedicalDefault.choices);
  const [allowLiveBio, setAllowLiveBio] = useState(false);
  const [insurance, setInsurance] = useState<InsuranceForm>(insuranceDefault);

  const endpoint = useMemo(() => {
    if (project.demoKey === "nba") return "/api/nba/run";
    if (project.demoKey === "biomedical") return "/api/biomedical/run";
    return "/api/insurance/predict";
  }, [project.demoKey]);

  async function run() {
    setIsLoading(true);
    setError("");

    try {
      const payload =
        project.demoKey === "nba"
          ? { query: nbaQuery }
          : project.demoKey === "biomedical"
            ? { question: bioQuestion, choices: bioChoices, allow_live: allowLiveBio }
            : insurance;
      setResponse(await postJson(endpoint, payload));
    } catch (caught) {
      setResponse(null);
      setError(caught instanceof Error ? caught.message : "Backend request failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section id="demo" className="scroll-mt-24">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            backend runner
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Run original project workflow
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Calls <span className="font-mono text-zinc-300">{endpoint}</span> on the
            FastAPI wrapper at{" "}
            <span className="font-mono text-zinc-300">{API_BASE}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {isLoading ? "Running" : "Run backend"}
        </button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          {project.demoKey === "nba" ? (
            <NbaInput value={nbaQuery} onChange={setNbaQuery} />
          ) : null}
          {project.demoKey === "biomedical" ? (
            <BiomedicalInput
              question={bioQuestion}
              choices={bioChoices}
              allowLive={allowLiveBio}
              onQuestionChange={setBioQuestion}
              onChoiceChange={(index, value) =>
                setBioChoices((current) =>
                  current.map((choice, choiceIndex) =>
                    choiceIndex === index ? value : choice,
                  ),
                )
              }
              onAllowLiveChange={setAllowLiveBio}
            />
          ) : null}
          {project.demoKey === "insurance" ? (
            <InsuranceInput value={insurance} onChange={setInsurance} />
          ) : null}

          <BackendNotice response={response} error={error} />
        </div>

        <div className="space-y-4">
          {response ? <ResultHeader response={response} /> : null}
          {error ? <ErrorPanel message={error} /> : null}
          {!response && !error ? <EmptyResult /> : null}
          {response?.trace?.length ? <PipelineViewer steps={response.trace} /> : null}
          {response ? <ProjectResult project={project} response={response} /> : null}
        </div>
      </div>
    </section>
  );
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur",
        className,
      )}
    >
      {children}
    </article>
  );
}

function NbaInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        natural language query
      </p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={7}
        className="mt-4 w-full resize-none rounded-lg border border-white/[0.1] bg-black/20 p-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-violet-300/40"
      />
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Recorded mode only returns the original notebook output for this exact query.
        Live recomputation requires the missing NBA CSV files through{" "}
        <span className="font-mono">NBA_DATA_PATH</span>.
      </p>
    </Panel>
  );
}

function BiomedicalInput({
  question,
  choices,
  allowLive,
  onQuestionChange,
  onChoiceChange,
  onAllowLiveChange,
}: {
  question: string;
  choices: string[];
  allowLive: boolean;
  onQuestionChange: (value: string) => void;
  onChoiceChange: (index: number, value: string) => void;
  onAllowLiveChange: (value: boolean) => void;
}) {
  return (
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        question and choices
      </p>
      <textarea
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        rows={7}
        className="mt-4 w-full resize-none rounded-lg border border-white/[0.1] bg-black/20 p-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-violet-300/40"
      />
      <div className="mt-4 grid gap-2">
        {choices.map((choice, index) => (
          <label key={index} className="grid gap-1">
            <span className="font-mono text-xs text-zinc-500">
              {String.fromCharCode(65 + index)}
            </span>
            <input
              value={choice}
              onChange={(event) => onChoiceChange(index, event.target.value)}
              className="h-10 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-300/40"
            />
          </label>
        ))}
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={allowLive}
          onChange={(event) => onAllowLiveChange(event.target.checked)}
          className="accent-violet-300"
        />
        Attempt live pipeline if backend credentials are configured
      </label>
    </Panel>
  );
}

function InsuranceInput({
  value,
  onChange,
}: {
  value: InsuranceForm;
  onChange: (value: InsuranceForm) => void;
}) {
  function update(next: Partial<InsuranceForm>) {
    onChange({ ...value, ...next });
  }

  return (
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        original predictor inputs
      </p>
      <div className="mt-5 grid gap-5">
        <label className="grid gap-2">
          <span className="flex items-center justify-between text-sm text-zinc-300">
            Age <span className="font-mono text-zinc-500">{value.age}</span>
          </span>
          <input
            type="range"
            min="18"
            max="64"
            value={value.age}
            onChange={(event) => update({ age: Number(event.target.value) })}
            className="accent-violet-300"
          />
        </label>
        <label className="grid gap-2">
          <span className="flex items-center justify-between text-sm text-zinc-300">
            BMI <span className="font-mono text-zinc-500">{value.bmi.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min="15"
            max="54"
            step="0.1"
            value={value.bmi}
            onChange={(event) => update({ bmi: Number(event.target.value) })}
            className="accent-violet-300"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Children</span>
            <input
              type="number"
              min="0"
              max="5"
              value={value.children}
              onChange={(event) => update({ children: Number(event.target.value) })}
              className="h-10 rounded-lg border border-white/[0.1] bg-black/20 px-3 font-mono text-sm text-zinc-100 outline-none focus:border-violet-300/40"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Sex</span>
            <select
              value={value.sex}
              onChange={(event) => update({ sex: event.target.value as InsuranceForm["sex"] })}
              className="h-10 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-300/40"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm text-zinc-300">Region</span>
          <select
            value={value.region}
            onChange={(event) =>
              update({ region: event.target.value as InsuranceForm["region"] })
            }
            className="h-10 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-300/40"
          >
            <option value="northeast">Northeast</option>
            <option value="northwest">Northwest</option>
            <option value="southeast">Southeast</option>
            <option value="southwest">Southwest</option>
          </select>
        </label>
        <div className="grid gap-2">
          <span className="text-sm text-zinc-300">Smoking status</span>
          <div className="grid grid-cols-3 gap-2">
            {(["no", "yes", "unknown"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => update({ smoker_status: status })}
                className={cn(
                  "h-10 rounded-lg border text-sm capitalize transition",
                  value.smoker_status === status
                    ? "border-violet-300/30 bg-violet-400/[0.1] text-violet-100"
                    : "border-white/[0.08] bg-black/20 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="font-mono text-xs text-zinc-500">Model selector</p>
          <p className="mt-1 text-sm text-zinc-300">Block 2 stratified Random Forest</p>
        </div>
      </div>
    </Panel>
  );
}

function BackendNotice({
  response,
  error,
}: {
  response: ServiceResponse | null;
  error: string;
}) {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200">
          <Server className="size-4" />
        </span>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            backend contract
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Start the backend with{" "}
            <span className="font-mono text-zinc-300">
              uvicorn backend.main:app --reload --port 8000
            </span>
            . The UI displays mode and provenance so recorded artifacts are clearly
            distinguished from live computation.
          </p>
          {response || error ? (
            <p className="mt-3 font-mono text-xs text-zinc-500">
              Last request: {response?.mode ?? "failed"}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function ResultHeader({ response }: { response: ServiceResponse }) {
  return (
    <Panel className={response.ok ? "border-emerald-300/20" : "border-violet-300/20"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            result mode
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{response.project}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1 font-mono text-xs text-violet-200">
            {response.mode}
          </span>
          <span
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-xs",
              response.ok
                ? "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200"
                : "border-amber-300/20 bg-amber-400/[0.08] text-amber-200",
            )}
          >
            {response.ok ? "computed" : "limited"}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <Panel className="border-rose-300/20">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-200" />
        <div>
          <h3 className="font-semibold text-white">Backend request failed</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
        </div>
      </div>
    </Panel>
  );
}

function EmptyResult() {
  return (
    <Panel>
      <div className="flex gap-3">
        <Database className="mt-0.5 size-5 shrink-0 text-violet-200" />
        <div>
          <h3 className="font-semibold text-white">No backend result yet</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Configure the inputs and run the backend to display the original project
            trace and outputs here.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function ProjectResult({
  project,
  response,
}: {
  project: Project;
  response: ServiceResponse;
}) {
  if (project.demoKey === "nba") {
    return <NbaResult response={response} />;
  }
  if (project.demoKey === "biomedical") {
    return <BiomedicalResult response={response} />;
  }
  return <InsuranceResult response={response} />;
}

function NbaResult({ response }: { response: ServiceResponse }) {
  const result = response.result;
  const teamNeeds = asRows(result.team_needs);
  const recommendations = asRows(result.recommendations) as NbaRecommendation[];
  const scoutingSummary =
    typeof result.scouting_summary === "string" ? result.scouting_summary : "";

  return (
    <div className="space-y-4">
      {teamNeeds.length ? (
        <Panel>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            Tool A output
          </p>
          <DataGrid
            rows={teamNeeds}
            columns={["label", "team_value", "league_mean", "z_score", "need_weight"]}
          />
        </Panel>
      ) : null}
      {recommendations.length ? (
        <Panel>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            final recommendation cards
          </p>
          <div className="mt-4 grid gap-3">
            {recommendations.map((player, index) => (
              <div
                key={`${player.player_name}-${index}`}
                className="rounded-xl border border-white/[0.08] bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">
                      #{index + 1} · {player.current_team}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-white">
                      {player.player_name}
                    </h4>
                  </div>
                  <span className="rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1 font-mono text-xs text-violet-200">
                    fit {Number(player.fit_score).toFixed(3)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{player.best_match}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel className="border-amber-300/20">
          <p className="text-sm leading-6 text-zinc-400">
            No recommendations returned for this input. In recorded mode, use the
            original notebook query to avoid showing a mismatched result.
          </p>
        </Panel>
      )}
      {scoutingSummary ? (
        <TextBlock title="LLM scouting summary" text={scoutingSummary} />
      ) : null}
      <Limitations response={response} />
    </div>
  );
}

function BiomedicalResult({ response }: { response: ServiceResponse }) {
  const result = response.result as BiomedicalResultShape;
  const keywords = Array.isArray(result.plan?.keywords) ? result.plan.keywords : [];
  const factsNeeded = Array.isArray(result.plan?.facts_needed)
    ? result.plan.facts_needed
    : [];
  const toolFacts = Array.isArray(result.tool_facts) ? result.tool_facts : [];

  return (
    <div className="space-y-4">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          plan
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <KeyList title="Keywords" items={keywords} />
          <KeyList title="Facts needed" items={factsNeeded} />
        </div>
      </Panel>
      {toolFacts.length ? (
        <Panel>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            tool facts
          </p>
          <div className="mt-4 grid gap-2">
            {toolFacts.slice(0, 6).map((fact, index) => (
              <p
                key={index}
                className="rounded-lg border border-white/[0.08] bg-black/20 p-3 text-xs leading-5 text-zinc-400"
              >
                {fact}
              </p>
            ))}
          </div>
        </Panel>
      ) : null}
      <Panel className="border-violet-300/20 bg-violet-400/[0.06]">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
          final answer
        </p>
        <p className="mt-3 text-2xl font-semibold text-white">{result.choice}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{result.final_answer}</p>
      </Panel>
      <Limitations response={response} />
    </div>
  );
}

function InsuranceResult({ response }: { response: ServiceResponse }) {
  const result = response.result as InsuranceResultShape;
  const prediction = result.prediction;
  const features = result.feature_explanation ?? [];
  const comparison = result.model_comparison ?? [];

  if (!prediction) {
    return <ErrorPanel message="Insurance response did not include a prediction." />;
  }

  return (
    <div className="space-y-4">
      <Panel className="border-violet-300/20 bg-violet-400/[0.06]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              prediction
            </p>
            <p className="mt-3 font-mono text-4xl font-semibold text-white">
              {formatCurrency(prediction.estimate)}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {formatCurrency(prediction.q10)} - {formatCurrency(prediction.q90)} · q50{" "}
              {formatCurrency(prediction.q50)}
            </p>
          </div>
          <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] px-3 py-1 font-mono text-xs text-cyan-200">
            {prediction.segment}
          </span>
        </div>
        <p
          className="mt-4 text-sm leading-6 text-zinc-300"
          dangerouslySetInnerHTML={{ __html: prediction.routing_summary }}
        />
      </Panel>
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          feature explanation
        </p>
        <DataGrid rows={features.slice(0, 6)} columns={["label", "importance", "impact_score"]} />
      </Panel>
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          model comparison
        </p>
        <DataGrid rows={comparison.slice(0, 6)} columns={["model", "r2", "rmse", "mae"]} />
      </Panel>
      <Limitations response={response} />
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </p>
      <p className="mt-4 text-sm leading-7 text-zinc-300">{text}</p>
    </Panel>
  );
}

function KeyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <p className="font-mono text-xs text-zinc-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-300"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function DataGrid({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  if (!rows?.length) {
    return <p className="mt-3 text-sm text-zinc-500">No rows returned.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-white/[0.08] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500"
              >
                {column.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={column}
                  className="border-b border-white/[0.06] px-3 py-3 text-zinc-300"
                >
                  {typeof row[column] === "number"
                    ? row[column].toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })
                    : String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Limitations({ response }: { response: ServiceResponse }) {
  return (
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        limitations and provenance
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
        {response.limitations.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-300/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-white/[0.08] bg-black/30 p-3 text-xs leading-5 text-zinc-500">
        {JSON.stringify(response.provenance, null, 2)}
      </pre>
    </Panel>
  );
}
