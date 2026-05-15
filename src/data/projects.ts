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
    shortTitle: "Roster Upgrade Agent",
    category: "AI Agent System",
    description:
      "An LLM-driven roster recommendation and scouting workflow built around team need diagnosis, player strength vectors, and fit ranking.",
    overview:
      "The backend wraps the original Colab-style NBA project. When the required NBA CSV files are available through NBA_DATA_PATH, it recomputes the original Tool A, Tool B, and Tool C pipeline. Without those CSVs, it displays the captured original notebook output for the published Warriors demo query.",
    role: "Original project authoring and portfolio integration: exposed parsing, need diagnosis, player vectors, fit ranking, and scouting-summary outputs through a structured backend response.",
    demoKey: "nba",
    tags: ["LLM parsing", "Sports analytics", "Fit ranking"],
    metrics: [
      { label: "Original tools", value: "A-C", detail: "need, strength, ranking" },
      { label: "Recorded pool", value: "236", detail: "eligible players in notebook" },
      { label: "Mode", value: "CSV-gated", detail: "live with NBA_DATA_PATH" },
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
        name: "Tool C: Fit Ranking",
        type: "ranker",
        description:
          "Matches team need weights against player strengths to produce top recommendations and best-match labels.",
        signal: "fit score",
        accent: "green",
      },
    ],
    exampleInput:
      "Recommend top 5 players for the Warriors to improve interior defense using the last 10 games. Only include players with at least 20 games and 18 average minutes.",
    finalResult:
      "The original notebook demo recommends Anthony Davis, Rudy Gobert, O.G. Anunoby, Nikola Jokic, and Joel Embiid as the top statistical fits for the Warriors interior-defense request.",
    limitations: [
      "The original repo does not include the required NBA CSV files; live recomputation requires NBA_DATA_PATH.",
      "The original ranking does not include salary, age, trade feasibility, or cap constraints.",
      "The original project notes superstar bias in the statistical ranking.",
    ],
    githubUrl: "#",
  },
  {
    slug: "plan-act-verify-biomedical-reasoning",
    title: "Plan-Act-Verify Biomedical Reasoning",
    shortTitle: "Biomedical Reasoning",
    category: "Reasoning System",
    description:
      "A CURE-Bench Plan-Act-Verify system that uses a model planner, biomedical tools, curated Tool Facts, and a final answer pass.",
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
    githubUrl: "#",
  },
  {
    slug: "insurance-cost-predictor",
    title: "Insurance Cost Predictor",
    shortTitle: "Cost Predictor",
    category: "Predictive Model",
    description:
      "A backend-wrapped Streamlit project that loads the original saved model artifacts and returns annual cost predictions with uncertainty and feature drivers.",
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
    githubUrl: "#",
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
