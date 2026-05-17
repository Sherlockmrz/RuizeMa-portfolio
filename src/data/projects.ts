export type ProjectSlug =
  | "nba-roster-upgrade-agent"
  | "plan-act-verify-biomedical-reasoning"
  | "insurance-cost-predictor";

export type DemoKey = "nba" | "biomedical" | "insurance";

export type Accent = "purple" | "indigo" | "cyan" | "green";

export type Metric = {
  label: string;
  value: string;
  detail: string;
};

export type ToolModel = {
  name: string;
  type: string;
  description: string;
  signal: string;
  accent: Accent;
};

export type PipelineStep = {
  id: string;
  title: string;
  status: "complete" | "review" | "warning" | "error";
  tool: string;
  input: string;
  output: string;
  explanation: string;
};

export type DemoTrace = {
  projectSlug: ProjectSlug;
  title: string;
  scenario: string;
  inputLabel: string;
  input: string;
  steps: PipelineStep[];
  intermediateResults: Array<{
    label: string;
    value: string;
    description: string;
  }>;
  finalResult: {
    title: string;
    summary: string;
    highlights: string[];
  };
  limitations: string[];
};

export type Project = {
  slug: ProjectSlug;
  title: string;
  shortTitle: string;
  category: string;
  description: string;
  overview: string;
  role: string;
  demoKey: DemoKey;
  tags: string[];
  metrics: Metric[];
  tools: ToolModel[];
  exampleInput: string;
  finalResult: string;
  limitations: string[];
  githubUrl: string;
};

export const projects: Project[] = [
  {
    slug: "nba-roster-upgrade-agent",
    title: "NBA Roster Upgrade Agent",
    shortTitle: "NBA Roster Upgrade Agent",
    category: "AI Agent System",
    description:
      "An LLM-driven NBA player recommendation and scouting workflow built around team need diagnosis, player strength vectors, fit ranking, robustness checks, and grounded Q&A.",
    overview:
      "The backend imports the original NBA-Roster-Upgrade-Agent-Webapp package from the v2-webapp-agent branch. It calls the original parser, roster agent, agentic tool selector, need reasoning, player-strength builder, fit ranker, sensitivity checker, grounded Q&A, zero-shot evaluator, benchmark helpers, and radar renderer without importing Streamlit.",
    role: "Original project authoring and portfolio integration: replaced the simplified portfolio wrapper with a FastAPI bridge around the WebApp computation modules and a Next.js agent console.",
    demoKey: "nba",
    tags: ["LLM parsing", "Sports analytics", "Fit ranking"],
    metrics: [
      { label: "Pipeline nodes", value: "11", detail: "WebApp registry" },
      { label: "Eval metrics", value: "7", detail: "zero-shot vs tools" },
      { label: "Backend", value: "FastAPI", detail: "imports nba_agent" },
    ],
    tools: [
      {
        name: "LLM Parser",
        type: "planner",
        description:
          "Converts the natural-language roster request into team, goal, top-k, recent-game window, and availability filters.",
        signal: "query JSON",
        accent: "purple",
      },
      {
        name: "Agentic Tool Selection",
        type: "planner",
        description:
          "Selects visible workflow sections, validates dependencies, records skipped tools, rationales, and fallback state.",
        signal: "tool plan",
        accent: "indigo",
      },
      {
        name: "Tool A: Team Need Diagnosis",
        type: "analytics",
        description:
          "Uses recent team statistics and league z-scores to compute a need-weight vector.",
        signal: "need vector",
        accent: "cyan",
      },
      {
        name: "Tool B: Player Strength Representation",
        type: "features",
        description:
          "Builds player strength vectors from box-score features and standardized skill indicators.",
        signal: "player vectors",
        accent: "indigo",
      },
      {
        name: "Tool C + Sensitivity",
        type: "ranker",
        description:
          "Ranks players by fit score, generates recommendation cards, and checks stability under need-weight perturbation.",
        signal: "fit + robustness",
        accent: "green",
      },
    ],
    exampleInput:
      "Recommend top 5 players for the Warriors to improve interior defense using the last 10 games. Only include players with at least 20 games and 18 average minutes.",
    finalResult:
      "The FastAPI wrapper returns the original WebApp AgentResult structure: parsed query, selected/skipped tools, Tool A/B/C tables, sensitivity output, scouting summary, grounded Q&A, zero-shot comparison metrics, benchmark rows, and radar SVGs.",
    limitations: [
      "Live recomputation requires teams.csv, games.csv, and games_details.csv at NBA_DATA_PATH or in the bundled WebApp data/raw folder.",
      "The original ranking does not include salary, age, trade feasibility, or cap constraints.",
      "Zero-shot comparison and LLM-selected tools require OpenRouter credentials; deterministic fallbacks are reported when unavailable.",
    ],
    githubUrl: "https://github.com/Sherlockmrz/NBA-Roster-Upgrade-Agent-Webapp",
  },
  {
    slug: "plan-act-verify-biomedical-reasoning",
    title: "Plan–Act–Verify Biomedical Reasoning",
    shortTitle: "Plan–Act–Verify Biomedical Reasoning",
    category: "Reasoning System",
    description:
      "An agentic biomedical QA system that answers medical reasoning problems through planning, evidence retrieval, Tool Facts, verification, and final answer synthesis.",
    overview:
      "The backend wraps the original biomedical pipeline when OpenRouter and ToolUniverse are available. In local recorded mode, it displays an original submission CSV trace with the real plan, tool calls, Tool Facts, and final answer.",
    role: "Portfolio integration: converted the original benchmark pipeline and submission artifacts into a readable question, plan, tool retrieval, verification, and answer display.",
    demoKey: "biomedical",
    tags: ["Plan-Act-Verify", "CURE-Bench", "Tool Facts"],
    metrics: [
      { label: "Published acc.", value: "0.69564", detail: "fine-tuned GPT-4.1 + tools" },
      { label: "Passes", value: "2", detail: "plan then answer/verify" },
      { label: "Tool families", value: "6", detail: "FDA, DailyMed, RxNav, more" },
    ],
    tools: [
      {
        name: "GPT5Model.plan",
        type: "planner",
        description:
          "Analyzes the stem and choices, extracts keywords, selects facts needed, and proposes biomedical tools.",
        signal: "plan JSON",
        accent: "purple",
      },
      {
        name: "ToolAgent.collect",
        type: "retrieval",
        description:
          "Runs curated biomedical tools and records success/failure traces for evidence gathering.",
        signal: "tool calls",
        accent: "cyan",
      },
      {
        name: "Tool Fact Curator",
        type: "filter",
        description:
          "Filters, deduplicates, clips, and diversifies successful facts before the answer pass.",
        signal: "10 facts max",
        accent: "green",
      },
      {
        name: "Pass-2 Answer Prompt",
        type: "verifier",
        description:
          "Combines prior analysis, curated facts, and the full MCQ to produce one final answer letter.",
        signal: "Final answer",
        accent: "indigo",
      },
    ],
    exampleInput:
      "A pediatric generalized myasthenia gravis multiple-choice question with drug choices.",
    finalResult:
      "The backend returns either a live original pipeline run or a provenance-backed recorded submission row from the original CURE-Bench outputs.",
    limitations: [
      "Live mode requires OpenRouter credentials and ToolUniverse dependencies.",
      "Recorded mode is an original artifact but does not answer arbitrary new biomedical questions.",
      "This is benchmark reasoning output, not medical advice.",
    ],
    githubUrl: "https://github.com/Sherlockmrz/Agentic--Biomedical-Reasoning",
  },
  {
    slug: "insurance-cost-predictor",
    title: "Insurance Cost Predictor",
    shortTitle: "Insurance Cost Predictor",
    category: "Predictive Model",
    description:
      "A neural-network and machine-learning prediction system that estimates annual insurance costs using original saved model artifacts, uncertainty signals, and feature drivers.",
    overview:
      "The backend imports the original Insurance Cost Predictor Streamlit shared module and calls make_prediction directly. It reuses the saved subgroup Random Forest regressors, smoker classifier path, quantile regression interval, and model comparison metrics.",
    role: "Portfolio integration: replaced the Streamlit UI with a Next.js dashboard while preserving the original inference path and model artifacts.",
    demoKey: "insurance",
    tags: ["Saved models", "Block 2 routing", "Quantile interval"],
    metrics: [
      { label: "Inputs", value: "6", detail: "age, BMI, children, sex, region, smoker" },
      { label: "Best model R2", value: "0.846", detail: "XGBoost comparison metric" },
      { label: "Backend", value: "FastAPI", detail: "wraps original shared.py" },
    ],
    tools: [
      {
        name: "Block 2 Router",
        type: "classifier",
        description:
          "Uses known smoker status directly, or estimates smoker probability for unknown status.",
        signal: "segment",
        accent: "cyan",
      },
      {
        name: "Subgroup Random Forests",
        type: "model",
        description:
          "Loads the original smoker and non-smoker Random Forest regressor artifacts.",
        signal: "annual USD",
        accent: "purple",
      },
      {
        name: "Quantile Regression",
        type: "uncertainty",
        description:
          "Uses the original q10/q50/q90 quantile models for the 80% prediction interval.",
        signal: "q10-q90",
        accent: "indigo",
      },
      {
        name: "Feature Impact Heuristic",
        type: "explainer",
        description:
          "Ranks local drivers using feature importance times deviation from dataset medians.",
        signal: "drivers",
        accent: "green",
      },
    ],
    exampleInput:
      "Age 35, BMI 27.5, one child, female, northeast region, unknown smoker status.",
    finalResult:
      "The backend returns the original Block 2 routed prediction, q10/q50/q90 interval, subgroup costs, smoker probability, model comparison, and feature-impact table.",
    limitations: [
      "The feature-impact chart is the original heuristic, not formal SHAP.",
      "The saved models may emit scikit-learn version warnings when loaded in a different environment.",
      "Predictions are project outputs and not real underwriting or pricing guidance.",
    ],
    githubUrl: "https://github.com/yinruide/Insurance-Cost-Predictor",
  },
];

export const projectStats: Metric[] = [
  { label: "Featured systems", value: "3", detail: "agent, reasoning, prediction" },
  { label: "Backend", value: "FastAPI", detail: "wraps original project code" },
  { label: "Demo data", value: "real", detail: "models or original artifacts" },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
