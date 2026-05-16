"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageSquare,
  Network,
  Play,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import type { Project } from "@/data/projects";
import { cn } from "@/lib/utils";

type NbaConsoleProps = {
  project: Project;
};

type NbaControls = {
  team: string;
  goal: string;
  top_k: number;
  recent_games: number;
  min_games: number;
  min_avg_minutes: number;
  exclude_current_team: boolean;
  ranking_mode: "Best Talent" | "Realistic Fit" | "Hidden Gems";
  use_llm: boolean;
  use_sidebar_as_manual_override: boolean;
  run_evaluation: boolean;
  run_tool_benchmark: boolean;
};

type ApiResponse = Record<string, unknown> & {
  ok?: boolean;
  mode?: string;
  project?: string;
  result?: Record<string, unknown>;
  warnings?: string[];
  limitations?: string[];
  provenance?: Record<string, unknown>;
};

type ToolDefinition = {
  tool_id?: string;
  name?: string;
  description?: string;
  dependencies?: string[];
  status?: string;
  rationale?: string;
};

type Recommendation = {
  rank?: number;
  player_name?: string;
  current_team?: string;
  fit_score?: number;
  best_match?: string;
  gp?: number;
  avg_min?: number;
  profile_explanation?: string;
  ability_radar?: Array<{ label?: string; value?: number }>;
  radar_svg?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const defaultQuery =
  "Recommend the top 5 players for the Golden State Warriors to improve interior defense over the last 10 games. Only include players with at least 15 games and 15 average minutes. Check whether the ranking is robust, and keep a grounded Q&A section for follow-up questions.";

const defaultControls: NbaControls = {
  team: "Golden State Warriors",
  goal: "interior defense",
  top_k: 5,
  recent_games: 10,
  min_games: 20,
  min_avg_minutes: 18,
  exclude_current_team: true,
  ranking_mode: "Best Talent",
  use_llm: false,
  use_sidebar_as_manual_override: false,
  run_evaluation: true,
  run_tool_benchmark: false,
};

const tabs = [
  "Agent Workflow",
  "Evaluation: Tool Pipeline vs Zero-shot",
  "Grounded Q&A",
  "Tool-Selection Benchmark",
] as const;

type TabName = (typeof tabs)[number];

export function NbaAgentConsole({ project }: NbaConsoleProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [controls, setControls] = useState<NbaControls>(defaultControls);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("Agent Workflow");
  const [openTools, setOpenTools] = useState<Set<string>>(
    () =>
      new Set([
        "user_query",
        "parsed_query",
        "agentic_tool_selection",
        "tool_c_fit_ranking",
        "final_scouting_summary",
      ]),
  );
  const [qaQuestion, setQaQuestion] = useState("What data is missing?");
  const [qaAnswer, setQaAnswer] = useState<Record<string, unknown> | null>(null);
  const [isQaLoading, setIsQaLoading] = useState(false);
  const [isEvalLoading, setIsEvalLoading] = useState(false);

  const result = useMemo(() => extractResult(response), [response]);

  async function runAgent() {
    setIsRunning(true);
    setError("");
    setQaAnswer(null);

    try {
      const next = await postJson("/api/nba/run", {
        query,
        use_llm: controls.use_llm,
        filters: {
          team: controls.team,
          goal: controls.goal,
          top_k: controls.top_k,
          recent_games: controls.recent_games,
          min_games: controls.min_games,
          min_avg_minutes: controls.min_avg_minutes,
          exclude_current_team: controls.exclude_current_team,
          ranking_mode: controls.ranking_mode,
        },
        run_evaluation: controls.run_evaluation,
        grounded_question: qaQuestion,
        use_sidebar_as_manual_override: controls.use_sidebar_as_manual_override,
        run_tool_benchmark: controls.run_tool_benchmark,
      });
      setResponse(next);
      setActiveTab("Agent Workflow");
    } catch (caught) {
      setResponse(null);
      setError(caught instanceof Error ? caught.message : "Backend request failed");
    } finally {
      setIsRunning(false);
    }
  }

  async function runQa(question = qaQuestion) {
    if (!question.trim()) return;
    setIsQaLoading(true);
    setError("");
    try {
      const next = await postJson("/api/nba/qa", {
        question,
        use_llm: controls.use_llm,
        latest: true,
      });
      const nestedResult = asRecord(next.result);
      const groundedQa = asRecord(next.grounded_qa) ?? asRecord(nestedResult?.grounded_qa);
      setQaAnswer(groundedQa);
      setActiveTab("Grounded Q&A");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Grounded Q&A failed");
    } finally {
      setIsQaLoading(false);
    }
  }

  async function runEvaluation() {
    setIsEvalLoading(true);
    setError("");
    try {
      const next = await postJson("/api/nba/evaluate", {
        use_llm: controls.use_llm,
        run_tool_benchmark: true,
      });
      setResponse((current) => mergeEvaluation(current, next));
      setActiveTab("Evaluation: Tool Pipeline vs Zero-shot");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evaluation failed");
    } finally {
      setIsEvalLoading(false);
    }
  }

  function updateControls(next: Partial<NbaControls>) {
    setControls((current) => ({ ...current, ...next }));
  }

  function toggleTool(toolId: string) {
    setOpenTools((current) => {
      const next = new Set(current);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  }

  return (
    <section id="demo" className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            full WebApp backend wrapper
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            NBA Agent Console
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Calls <span className="font-mono text-zinc-300">/api/nba/run</span> on{" "}
            <span className="font-mono text-zinc-300">{API_BASE}</span> and displays
            the original WebApp pipeline, traces, evaluation, and grounded Q&A.
          </p>
        </div>
        <StatusBadge ok={response?.ok} mode={response?.mode} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <RunControls controls={controls} onChange={updateControls} />

        <div className="space-y-5">
          <QueryPanel
            query={query}
            onQueryChange={setQuery}
            onRun={runAgent}
            isRunning={isRunning}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <ModelStatus result={result} requestedLlm={controls.use_llm} />
            <HowToRead />
          </div>

          {error ? <ErrorPanel message={error} /> : null}
          {response && response.ok === false ? <WarningPanel result={result} /> : null}
          {!response && !error ? <EmptyPanel projectTitle={project.title} /> : null}

          {response ? (
            <>
              <Tabs active={activeTab} onChange={setActiveTab} />

              {activeTab === "Agent Workflow" ? (
                <AgentWorkflow
                  result={result}
                  openTools={openTools}
                  onToggleTool={toggleTool}
                />
              ) : null}

              {activeTab === "Evaluation: Tool Pipeline vs Zero-shot" ? (
                <EvaluationTab
                  result={result}
                  isLoading={isEvalLoading}
                  onRun={runEvaluation}
                />
              ) : null}

              {activeTab === "Grounded Q&A" ? (
                <GroundedQaTab
                  result={result}
                  qaQuestion={qaQuestion}
                  qaAnswer={qaAnswer}
                  isLoading={isQaLoading}
                  onQuestionChange={setQaQuestion}
                  onAsk={runQa}
                />
              ) : null}

              {activeTab === "Tool-Selection Benchmark" ? (
                <BenchmarkTab
                  result={result}
                  isLoading={isEvalLoading}
                  onRun={runEvaluation}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RunControls({
  controls,
  onChange,
}: {
  controls: NbaControls;
  onChange: (next: Partial<NbaControls>) => void;
}) {
  return (
    <Panel className="h-fit xl:sticky xl:top-24">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] text-violet-200">
          <SlidersHorizontal className="size-4" />
        </span>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            run controls
          </p>
          <h3 className="mt-1 font-semibold text-white">Sidebar controls</h3>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <TextInput
          label="Team"
          value={controls.team}
          onChange={(team) => onChange({ team })}
        />
        <TextInput
          label="Goal"
          value={controls.goal}
          onChange={(goal) => onChange({ goal })}
        />
        <NumberInput
          label="Top K"
          value={controls.top_k}
          min={1}
          max={12}
          onChange={(top_k) => onChange({ top_k })}
        />
        <NumberInput
          label="Recent games"
          value={controls.recent_games}
          min={1}
          max={30}
          onChange={(recent_games) => onChange({ recent_games })}
        />
        <NumberInput
          label="Minimum games"
          value={controls.min_games}
          min={1}
          max={82}
          onChange={(min_games) => onChange({ min_games })}
        />
        <NumberInput
          label="Minimum avg minutes"
          value={controls.min_avg_minutes}
          min={0}
          max={40}
          step={0.5}
          onChange={(min_avg_minutes) => onChange({ min_avg_minutes })}
        />
        <label className="grid gap-2">
          <span className="text-sm text-zinc-300">Ranking mode</span>
          <select
            value={controls.ranking_mode}
            onChange={(event) =>
              onChange({ ranking_mode: event.target.value as NbaControls["ranking_mode"] })
            }
            className="h-10 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-300/40"
          >
            <option>Best Talent</option>
            <option>Realistic Fit</option>
            <option>Hidden Gems</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-2">
        <ToggleRow
          label="Exclude current team"
          checked={controls.exclude_current_team}
          onChange={(exclude_current_team) => onChange({ exclude_current_team })}
        />
        <ToggleRow
          label="Use LLM"
          checked={controls.use_llm}
          onChange={(use_llm) => onChange({ use_llm })}
        />
        <ToggleRow
          label="Manual sidebar override"
          checked={controls.use_sidebar_as_manual_override}
          onChange={(use_sidebar_as_manual_override) =>
            onChange({ use_sidebar_as_manual_override })
          }
        />
        <ToggleRow
          label="Run evaluation"
          checked={controls.run_evaluation}
          onChange={(run_evaluation) => onChange({ run_evaluation })}
        />
        <ToggleRow
          label="Run benchmark"
          checked={controls.run_tool_benchmark}
          onChange={(run_tool_benchmark) => onChange({ run_tool_benchmark })}
        />
      </div>

      <div className="mt-5 rounded-lg border border-white/[0.08] bg-black/20 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          data contract
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Requires <span className="font-mono text-zinc-300">teams.csv</span>,{" "}
          <span className="font-mono text-zinc-300">games.csv</span>, and{" "}
          <span className="font-mono text-zinc-300">games_details.csv</span>. Missing
          files return a clear error without recorded fallback.
        </p>
      </div>
    </Panel>
  );
}

function QueryPanel({
  query,
  onQueryChange,
  onRun,
  isRunning,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            natural-language query input
          </p>
          <textarea
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            rows={5}
            className="mt-4 w-full resize-none rounded-lg border border-white/[0.1] bg-black/20 p-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-violet-300/40"
          />
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {isRunning ? "Running" : "Run Agent"}
        </button>
      </div>
    </Panel>
  );
}

function ModelStatus({
  result,
  requestedLlm,
}: {
  result: Record<string, unknown>;
  requestedLlm: boolean;
}) {
  const status = asRecord(result.llm_status);
  const available = Boolean(status?.available);
  const model = stringValue(status?.model, "openrouter/free");
  const warnings = arrayOfStrings(status?.warnings);
  const fallback =
    requestedLlm && !available
      ? "LLM requested, deterministic fallback active"
      : requestedLlm
        ? "LLM requested"
        : "Deterministic mode";

  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-lg border",
            available
              ? "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200"
              : "border-amber-300/20 bg-amber-400/[0.08] text-amber-200",
          )}
        >
          <Server className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            model status
          </p>
          <h3 className="mt-1 font-semibold text-white">
            {available ? "LLM available" : "LLM missing"}
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Model <span className="font-mono text-zinc-300">{model}</span>. {fallback}.
          </p>
          {warnings.length ? (
            <p className="mt-2 text-xs leading-5 text-amber-200/80">{warnings[0]}</p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function HowToRead() {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            how to read this result
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Selected tools show what the planner surfaced first. Closed cards can still
            be opened because the backend returns the full AgentResult trace for audit.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Tabs({
  active,
  onChange,
}: {
  active: TabName;
  onChange: (tab: TabName) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#11131F]/80 p-1 backdrop-blur">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition",
            active === tab
              ? "bg-violet-300 text-[#080A12]"
              : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function AgentWorkflow({
  result,
  openTools,
  onToggleTool,
}: {
  result: Record<string, unknown>;
  openTools: Set<string>;
  onToggleTool: (toolId: string) => void;
}) {
  const recommendations = records(result.recommendations) as Recommendation[];
  const fullPipeline = records(result.full_tool_pipeline) as ToolDefinition[];
  const trace = records(result.trace_steps);

  return (
    <div className="space-y-5">
      <RecommendationCards recommendations={recommendations} />

      <Panel>
        <SectionHeader
          icon={<Network className="size-4" />}
          label="full agent pipeline cards"
          title="Original WebApp tool flow"
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {fullPipeline.map((tool) => {
            const toolId = stringValue(tool.tool_id, tool.name ?? "tool");
            const isOpen = openTools.has(toolId);
            return (
              <motion.div
                key={toolId}
                layout
                className="rounded-xl border border-white/[0.08] bg-black/20"
              >
                <button
                  type="button"
                  onClick={() => onToggleTool(toolId)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-white">{tool.name}</h4>
                      <ToolStatusBadge status={tool.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {tool.description}
                    </p>
                    {tool.rationale ? (
                      <p className="mt-2 text-xs leading-5 text-violet-100/80">
                        {tool.rationale}
                      </p>
                    ) : null}
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 size-4 shrink-0 text-zinc-500 transition",
                      isOpen ? "rotate-180" : "",
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-white/[0.08] p-4">
                    <ToolDetail toolId={toolId} result={result} />
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          icon={<Search className="size-4" />}
          label="original trace steps"
          title="AgentResult trace"
        />
        <div className="mt-4 grid gap-3">
          {trace.map((step, index) => (
            <div key={index} className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-white">
                  {stringValue(step.step_number, String(index + 1))}. {stringValue(step.title)}
                </h4>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
                  {stringValue(step.status, "complete")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {stringValue(step.short_description)}
              </p>
              <JsonBlock value={step.key_outputs} />
            </div>
          ))}
        </div>
      </Panel>

      <TracePanels result={result} />
    </div>
  );
}

function ToolDetail({
  toolId,
  result,
}: {
  toolId: string;
  result: Record<string, unknown>;
}) {
  const traces = asRecord(result.tool_traces);
  const parsed = asRecord(result.parsed_query);
  const selection = asRecord(result.tool_selection);
  const needReasoning = asRecord(result.need_reasoning);
  const sensitivity = asRecord(result.sensitivity);
  const finalSummary = asRecord(result.final_summary);
  const evaluation = asRecord(result.evaluation);

  if (toolId === "user_query") {
    const input = asRecord(result.input);
    return <TextCallout text={stringValue(input?.query, "Run the agent to capture a query.")} />;
  }
  if (toolId === "parsed_query") {
    return <JsonBlock value={parsed} expanded />;
  }
  if (toolId === "agentic_tool_selection") {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <KeyValueList title="Selected tools" items={arrayOfStrings(selection?.selected_tool_ids)} />
        <KeyValueList title="Skipped tools" items={arrayOfStrings(selection?.skipped_tool_ids)} />
        <div className="lg:col-span-2">
          <TextCallout text={stringValue(selection?.validation_note)} />
        </div>
      </div>
    );
  }
  if (toolId === "tool_a_need_diagnosis") {
    return (
      <DataTable
        rows={records(asRecord(result.team_need_diagnosis)?.need_df)}
        columns={["metric", "label", "team_value", "league_mean", "z_score", "need_weight"]}
      />
    );
  }
  if (toolId === "llm_need_reasoning") {
    return (
      <div className="space-y-3">
        <TextCallout text={stringValue(needReasoning?.tactical_interpretation)} />
        <JsonBlock value={needReasoning?.metric_multipliers} />
        <DataTable
          rows={records(needReasoning?.adjusted_need_df)}
          columns={["metric", "label", "need_weight", "adjusted_need_weight"]}
        />
      </div>
    );
  }
  if (toolId === "tool_b_player_strength") {
    const summary = asRecord(result.player_strength_summary);
    return (
      <div className="space-y-3">
        <MetricStrip
          metrics={[
            {
              label: "Eligible candidates",
              value: stringValue(summary?.candidate_count, "0"),
            },
          ]}
        />
        <DataTable
          rows={records(summary?.preview ?? summary?.player_strength_df)}
          columns={["PLAYER_NAME", "CURRENT_TEAM", "GP", "AVG_MIN", "REB_strength", "BLK_strength", "STL_strength"]}
        />
      </div>
    );
  }
  if (toolId === "tool_c_fit_ranking") {
    return (
      <DataTable
        rows={records(traces?.ranked_df)}
        columns={["PLAYER_NAME", "CURRENT_TEAM", "GP", "AVG_MIN", "fit_score", "best_match"]}
      />
    );
  }
  if (toolId === "sensitivity_check") {
    return (
      <div className="space-y-3">
        <MetricStrip
          metrics={[
            {
              label: "Stability",
              value: stringValue(sensitivity?.stability_label, "Unavailable"),
            },
            {
              label: "Top-k overlap",
              value: percentValue(sensitivity?.top_k_overlap),
            },
          ]}
        />
        <TextCallout text={stringValue(sensitivity?.explanation)} />
        <DataTable rows={records(sensitivity?.rank_comparison_df)} />
      </div>
    );
  }
  if (toolId === "final_scouting_summary") {
    return (
      <div className="space-y-3">
        <TextCallout text={stringValue(finalSummary?.executive_summary)} />
        <KeyValueList title="Key takeaways" items={arrayOfStrings(finalSummary?.key_takeaways)} />
      </div>
    );
  }
  if (toolId === "grounded_qa") {
    const qa = asRecord(result.grounded_qa);
    return qa ? (
      <div className="space-y-3">
        <TextCallout text={stringValue(qa.question)} muted />
        <TextCallout text={stringValue(qa.answer)} />
      </div>
    ) : (
      <TextCallout text="Open the Grounded Q&A tab to ask about the current AgentResult." />
    );
  }
  if (toolId === "zero_shot_evaluation") {
    return evaluation ? (
      <DataTable rows={records(evaluation.comparison_table)} />
    ) : (
      <TextCallout text="Open the Evaluation tab to run the zero-shot baseline comparison." />
    );
  }
  return <JsonBlock value={result} />;
}

function RecommendationCards({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations.length) {
    return (
      <Panel className="border-amber-300/20">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-200" />
          <p className="text-sm leading-6 text-zinc-400">
            No recommendation cards were returned. Check the data-file warning or relax
            the eligibility controls.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionHeader
        icon={<CheckCircle2 className="size-4" />}
        label="top recommendation cards"
        title="Tool C ranked fits"
      />
      <div className="mt-4 grid gap-4">
        {recommendations.map((player) => (
          <div
            key={`${player.rank}-${player.player_name}`}
            className="grid gap-4 rounded-xl border border-white/[0.08] bg-black/20 p-4 lg:grid-cols-[minmax(0,1fr)_230px]"
          >
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-zinc-500">
                    #{player.rank} · {player.current_team}
                  </p>
                  <h4 className="mt-1 text-xl font-semibold text-white">
                    {player.player_name}
                  </h4>
                </div>
                <span className="rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1 font-mono text-xs text-violet-200">
                  fit {formatNumber(player.fit_score)}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-violet-100">
                {player.best_match}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {player.profile_explanation}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SmallMetric label="GP" value={formatNumber(player.gp, 0)} />
                <SmallMetric label="Avg min" value={formatNumber(player.avg_min, 1)} />
              </div>
            </div>
            {player.radar_svg ? (
              <div
                className="mx-auto max-w-[230px] rounded-lg border border-white/[0.08] bg-zinc-950/50 p-2 [&_.radar-wrap]:mx-auto [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: player.radar_svg }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TracePanels({ result }: { result: Record<string, unknown> }) {
  const traces = asRecord(result.tool_traces);
  if (!traces) return null;

  return (
    <div className="grid gap-4">
      <TracePanel title="parsed query" value={traces.parsed_query} />
      <TracePanel title="need_df" value={traces.need_df} table />
      <TracePanel title="adjusted need_df" value={traces.adjusted_need_df} table />
      <TracePanel
        title="player_strength_df"
        value={records(traces.player_strength_df).slice(0, 25)}
        table
      />
      <TracePanel title="ranked_df" value={traces.ranked_df} table />
      <TracePanel title="sensitivity output" value={traces.sensitivity_output} />
      <TracePanel title="final summary" value={traces.final_summary} />
    </div>
  );
}

function TracePanel({
  title,
  value,
  table,
}: {
  title: string;
  value: unknown;
  table?: boolean;
}) {
  return (
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </p>
      {table ? <DataTable rows={records(value)} /> : <JsonBlock value={value} expanded />}
    </Panel>
  );
}

function EvaluationTab({
  result,
  isLoading,
  onRun,
}: {
  result: Record<string, unknown>;
  isLoading: boolean;
  onRun: () => void;
}) {
  const evaluation = asRecord(result.evaluation);
  const comparison = records(evaluation?.comparison_table);
  const playerTable = records(evaluation?.player_table);
  const zeroShot = asRecord(evaluation?.zero_shot);
  const zeroPlayers = records(zeroShot?.players);

  if (!evaluation) {
    return <RunEvaluationPrompt isLoading={isLoading} onRun={onRun} />;
  }

  return (
    <div className="space-y-5">
      <Panel>
        <SectionHeader
          icon={<BarChart3 className="size-4" />}
          label="zero-shot baseline comparison"
          title="Fair metric evaluation"
        />
        <MetricStrip metrics={comparisonMetrics(comparison)} />
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          {stringValue(evaluation.fairness_note)}
        </p>
      </Panel>

      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          zero-shot output
        </p>
        {zeroPlayers.length ? (
          <DataTable rows={zeroPlayers} columns={["rank", "player_name", "reasoning"]} />
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {stringValue(zeroShot?.limitations, "Zero-shot baseline requires LLM access.")}
          </p>
        )}
      </Panel>

      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          main comparison table
        </p>
        <DataTable rows={comparison} />
      </Panel>

      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          player-by-player comparison
        </p>
        <DataTable rows={playerTable} />
      </Panel>
    </div>
  );
}

function GroundedQaTab({
  result,
  qaQuestion,
  qaAnswer,
  isLoading,
  onQuestionChange,
  onAsk,
}: {
  result: Record<string, unknown>;
  qaQuestion: string;
  qaAnswer: Record<string, unknown> | null;
  isLoading: boolean;
  onQuestionChange: (value: string) => void;
  onAsk: (question?: string) => void;
}) {
  const runQa = asRecord(result.grounded_qa);
  const currentAnswer = qaAnswer ?? runQa;
  const examples = [
    "Why is the first player ranked first?",
    "What changed after LLM Need Reasoning?",
    "Why does this team need rebounding?",
    "Is the recommendation stable?",
    "Can we use salary or injury data?",
  ];

  return (
    <div className="space-y-5">
      <Panel>
        <SectionHeader
          icon={<MessageSquare className="size-4" />}
          label="grounded Q&A"
          title="Ask only about this AgentResult"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                onQuestionChange(example);
                onAsk(example);
              }}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-violet-300/25 hover:text-violet-100"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={qaQuestion}
            onChange={(event) => onQuestionChange(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-300/40"
            placeholder="Ask about the current pipeline output"
          />
          <button
            type="button"
            onClick={() => onAsk()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
            Ask
          </button>
        </div>
      </Panel>

      {currentAnswer ? (
        <Panel>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            answer
          </p>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            {stringValue(currentAnswer.answer)}
          </p>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Unsupported fields: {arrayOfStrings(currentAnswer.unsupported_fields).join(", ")}
          </p>
        </Panel>
      ) : (
        <Panel>
          <p className="text-sm leading-6 text-zinc-400">
            Run the agent, then ask a question. Salary, injury, contract, news, and
            trade-rumor requests are marked unavailable by the original Q&A guardrails.
          </p>
        </Panel>
      )}
    </div>
  );
}

function BenchmarkTab({
  result,
  isLoading,
  onRun,
}: {
  result: Record<string, unknown>;
  isLoading: boolean;
  onRun: () => void;
}) {
  const benchmark = asRecord(result.tool_selection_benchmark);
  const metrics = asRecord(benchmark?.aggregate_metrics);
  const rows = records(benchmark?.rows);

  if (!benchmark) {
    return (
      <Panel>
        <SectionHeader
          icon={<BarChart3 className="size-4" />}
          label="agent tool-selection benchmark"
          title="Planner evaluation"
        />
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Run the benchmark to compute exact match, precision, recall, F1, dependency
          validity, and execution safety using the original benchmark helper.
        </p>
        <button
          type="button"
          onClick={onRun}
          disabled={isLoading}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200 disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Run Benchmark
        </button>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel>
        <SectionHeader
          icon={<BarChart3 className="size-4" />}
          label="agent tool-selection benchmark"
          title="Aggregate metrics"
        />
        <MetricStrip
          metrics={[
            { label: "Exact match", value: percentValue(metrics?.average_exact_match) },
            { label: "Precision", value: percentValue(metrics?.average_precision) },
            { label: "Recall", value: percentValue(metrics?.average_recall) },
            { label: "F1", value: percentValue(metrics?.average_f1) },
            {
              label: "Dependency validity",
              value: percentValue(metrics?.dependency_validity_rate),
            },
            {
              label: "Execution safety",
              value: percentValue(metrics?.execution_safety_rate),
            },
          ]}
        />
      </Panel>
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          benchmark rows
        </p>
        <DataTable rows={rows} />
      </Panel>
    </div>
  );
}

function RunEvaluationPrompt({
  isLoading,
  onRun,
}: {
  isLoading: boolean;
  onRun: () => void;
}) {
  return (
    <Panel>
      <SectionHeader
        icon={<BarChart3 className="size-4" />}
        label="evaluation"
        title="Zero-shot comparison not loaded"
      />
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Run evaluation to call the original zero-shot baseline comparison and
        metric helpers for the current AgentResult.
      </p>
      <button
        type="button"
        onClick={onRun}
        disabled={isLoading}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 text-sm font-semibold text-[#080A12] transition hover:bg-violet-200 disabled:opacity-70"
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        Run Evaluation
      </button>
    </Panel>
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

function SectionHeader({
  icon,
  label,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] text-violet-200">
        {icon}
      </span>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-300/40"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-sm text-zinc-300">
        {label}
        <span className="font-mono text-xs text-zinc-500">{formatNumber(value, step < 1 ? 1 : 0)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-violet-300"
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-zinc-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-violet-300"
      />
    </label>
  );
}

function StatusBadge({ ok, mode }: { ok?: boolean; mode?: unknown }) {
  if (ok === undefined) {
    return (
      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-zinc-500">
        idle
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-xs",
        ok
          ? "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200"
          : "border-amber-300/20 bg-amber-400/[0.08] text-amber-200",
      )}
    >
      {ok ? "computed" : "limited"} · {stringValue(mode)}
    </span>
  );
}

function ToolStatusBadge({ status }: { status?: string }) {
  const text = (status || "available").replaceAll("_", " ");
  const active = status?.includes("selected") || status === "required_dependency";
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 font-mono text-[11px]",
        active
          ? "border-violet-300/20 bg-violet-400/[0.08] text-violet-200"
          : status === "skipped"
            ? "border-zinc-500/20 bg-zinc-500/[0.08] text-zinc-400"
            : "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200",
      )}
    >
      {text}
    </span>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <span className="ml-2 font-mono text-xs text-zinc-200">{value}</span>
    </span>
  );
}

function MetricStrip({ metrics }: { metrics: Array<{ label: string; value: string }> }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            {metric.label}
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

function KeyValueList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {title}
      </p>
      {items.length ? (
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
      ) : (
        <p className="mt-2 text-sm text-zinc-500">None returned.</p>
      )}
    </div>
  );
}

function TextCallout({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <p className={cn("text-sm leading-6", muted ? "text-zinc-500" : "text-zinc-300")}>
        {text || "No text returned."}
      </p>
    </div>
  );
}

function DataTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns?: string[];
}) {
  if (!rows.length) {
    return <p className="mt-3 text-sm text-zinc-500">No rows returned.</p>;
  }

  const tableColumns = columns?.length ? columns : Object.keys(rows[0]).slice(0, 8);

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {tableColumns.map((column) => (
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
          {rows.slice(0, 25).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {tableColumns.map((column) => (
                <td
                  key={column}
                  className="max-w-[320px] border-b border-white/[0.06] px-3 py-3 text-zinc-300"
                >
                  {cellValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 25 ? (
        <p className="mt-3 text-xs text-zinc-500">Showing first 25 of {rows.length} rows.</p>
      ) : null}
    </div>
  );
}

function JsonBlock({ value, expanded }: { value: unknown; expanded?: boolean }) {
  return (
    <pre
      className={cn(
        "mt-3 overflow-auto rounded-lg border border-white/[0.08] bg-black/30 p-3 text-xs leading-5 text-zinc-500",
        expanded ? "max-h-[460px]" : "max-h-56",
      )}
    >
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

function WarningPanel({ result }: { result: Record<string, unknown> }) {
  const warnings = arrayOfStrings(result.warnings);
  return (
    <Panel className="border-amber-300/20">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-200" />
        <div>
          <h3 className="font-semibold text-white">NBA backend returned a limitation</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-400">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
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

function EmptyPanel({ projectTitle }: { projectTitle: string }) {
  return (
    <Panel>
      <div className="flex gap-3">
        <Search className="mt-0.5 size-5 shrink-0 text-violet-200" />
        <div>
          <h3 className="font-semibold text-white">No run yet</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Configure the WebApp controls and run {projectTitle} to display the
            original pipeline output.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function comparisonMetrics(rows: Record<string, unknown>[]) {
  const wanted = [
    "Candidate Found Rate",
    "Constraint Satisfaction Rate",
    "Average Tool C Fit Score",
    "Penalized Average Tool C Fit Score",
    "Need Alignment Score",
    "Robustness Check Available",
    "Evidence Coverage / Explainability Score",
  ];
  return wanted.map((metric) => {
    const row = rows.find((item) => item.Metric === metric);
    return {
      label: metric,
      value: row ? stringValue(row["Our Tool Pipeline"], "N/A") : "N/A",
    };
  });
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

  return (await response.json()) as ApiResponse;
}

function mergeEvaluation(current: ApiResponse | null, next: ApiResponse): ApiResponse {
  if (!current) return next;
  const currentResult = extractResult(current);
  const nextResult = extractResult(next);
  const mergedResult = {
    ...currentResult,
    evaluation: next.evaluation ?? nextResult.evaluation,
    tool_selection_benchmark:
      next.tool_selection_benchmark ?? nextResult.tool_selection_benchmark,
  };
  return {
    ...current,
    evaluation: mergedResult.evaluation,
    tool_selection_benchmark: mergedResult.tool_selection_benchmark,
    result: mergedResult,
  };
}

function extractResult(response: ApiResponse | null): Record<string, unknown> {
  if (!response) return {};
  const nested = asRecord(response.result);
  return nested ? { ...response, ...nested } : response;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function stringValue(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  return String(value);
}

function formatNumber(value: unknown, maximumFractionDigits = 3): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return numeric.toLocaleString(undefined, { maximumFractionDigits });
}

function percentValue(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return `${Math.round(numeric * 100)}%`;
}

function cellValue(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value ?? "");
}
