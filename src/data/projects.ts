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
  status: "complete" | "review" | "warning";
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
      "A decision-support agent that evaluates roster gaps, candidate fits, constraints, and tradeoffs for an NBA upgrade scenario.",
    overview:
      "This project frames front-office roster improvement as an agent workflow. The demo uses static player-like data to show how the system moves from a team need to candidate retrieval, fit scoring, constraint review, and a recommendation with caveats.",
    role: "Designed the agent trace, evaluation rubric, candidate ranking logic, and dashboard narrative.",
    demoKey: "nba",
    tags: ["Agent workflow", "Sports analytics", "Constraint reasoning"],
    metrics: [
      { label: "Trace steps", value: "5", detail: "from roster need to verify" },
      { label: "Candidates", value: "8", detail: "static demo pool" },
      { label: "Fit layers", value: "4", detail: "role, cost, age, risk" },
    ],
    tools: [
      {
        name: "Roster Gap Analyzer",
        type: "agent",
        description:
          "Maps the input roster need into target skills, positional coverage, and risk priorities.",
        signal: "Need vector",
        accent: "purple",
      },
      {
        name: "Candidate Retriever",
        type: "tool",
        description:
          "Selects a small static pool of wings and guards that match the scenario constraints.",
        signal: "8 candidates",
        accent: "cyan",
      },
      {
        name: "Fit Scorer",
        type: "model",
        description:
          "Ranks options with weighted signals for defense, shooting, cost, role fit, and timeline.",
        signal: "0-100 score",
        accent: "indigo",
      },
      {
        name: "Verification Pass",
        type: "review",
        description:
          "Flags assumptions, missing live data, and places where a human decision-maker should inspect the recommendation.",
        signal: "3 caveats",
        accent: "green",
      },
    ],
    exampleInput:
      "Golden State needs a lower-cost wing who can defend primary scorers, keep spacing above league average, and avoid a major long-term salary commitment.",
    finalResult:
      "The static demo recommends a mid-cost 3-and-D wing profile over a star trade, because the role fit is strong while cap and asset risk stay lower.",
    limitations: [
      "Uses static TypeScript data instead of live NBA stats, contracts, or injury reports.",
      "Trade rules and salary matching are simplified for portfolio demonstration.",
      "Outputs are decision-support signals, not a replacement for scouting or front-office review.",
    ],
    githubUrl: "#",
  },
  {
    slug: "plan-act-verify-biomedical-reasoning",
    title: "Plan-Act-Verify Biomedical Reasoning",
    shortTitle: "Biomedical Reasoning",
    category: "Reasoning System",
    description:
      "A transparent biomedical reasoning workflow that plans evidence needs, acts on structured findings, and verifies claims before answering.",
    overview:
      "This system demonstrates a Plan-Act-Verify pattern for biomedical questions. The version on the site is a static trace that emphasizes traceability: what question was asked, what evidence would be needed, how intermediate claims are checked, and where the system refuses to overstate certainty.",
    role: "Built the reasoning pattern, verification checkpoints, result formatting, and limitation language.",
    demoKey: "biomedical",
    tags: ["Plan-Act-Verify", "Biomedical AI", "Evidence checks"],
    metrics: [
      { label: "Reasoning phases", value: "3", detail: "plan, act, verify" },
      { label: "Evidence checks", value: "4", detail: "claim-level review" },
      { label: "Safety flags", value: "3", detail: "scope and uncertainty" },
    ],
    tools: [
      {
        name: "Question Planner",
        type: "planner",
        description:
          "Breaks the biomedical prompt into population, mechanism, comparator, and answer-scope needs.",
        signal: "PICO frame",
        accent: "purple",
      },
      {
        name: "Evidence Extractor",
        type: "tool",
        description:
          "Uses static example findings to model how structured evidence would be summarized.",
        signal: "4 findings",
        accent: "cyan",
      },
      {
        name: "Claim Verifier",
        type: "verifier",
        description:
          "Checks whether the draft answer is supported by the intermediate evidence and uncertainty notes.",
        signal: "claim audit",
        accent: "green",
      },
      {
        name: "Answer Composer",
        type: "model",
        description:
          "Produces a concise answer with supporting rationale, uncertainty, and non-clinical boundaries.",
        signal: "bounded answer",
        accent: "indigo",
      },
    ],
    exampleInput:
      "Explain why a plan-act-verify workflow can reduce unsupported conclusions when answering a biomedical mechanism question.",
    finalResult:
      "The demo answer keeps claims tied to the provided evidence trace and labels uncertain areas instead of presenting a clinical recommendation.",
    limitations: [
      "Static demo data only; no live literature retrieval or clinical database access.",
      "Not medical advice and not designed for diagnosis or treatment decisions.",
      "Verification checks are illustrative and would need stronger evaluation before real biomedical use.",
    ],
    githubUrl: "#",
  },
  {
    slug: "insurance-cost-predictor",
    title: "Insurance Cost Predictor",
    shortTitle: "Cost Predictor",
    category: "Predictive Model",
    description:
      "A client-side model dashboard for estimating annual insurance cost from demographic and lifestyle inputs with uncertainty and feature contributions.",
    overview:
      "The predictor turns a familiar tabular ML task into a clean model product. The first version runs entirely in the browser with a transparent heuristic model, adjustable inputs, model selection, uncertainty ranges, and feature-level contribution cards.",
    role: "Designed the model UI, encoded the client-side prediction logic, and added contribution and uncertainty explanations.",
    demoKey: "insurance",
    tags: ["TypeScript model", "Prediction UI", "Feature attribution"],
    metrics: [
      { label: "Inputs", value: "6", detail: "age, BMI, smoker, children, region, model" },
      { label: "Models", value: "3", detail: "linear, ridge, boosted" },
      { label: "Runtime", value: "0 API", detail: "browser-only demo" },
    ],
    tools: [
      {
        name: "Feature Encoder",
        type: "transform",
        description:
          "Converts numeric, boolean, and categorical fields into model-ready feature signals.",
        signal: "6 features",
        accent: "cyan",
      },
      {
        name: "Cost Estimator",
        type: "model",
        description:
          "Applies transparent client-side coefficients and model-specific adjustments.",
        signal: "annual USD",
        accent: "purple",
      },
      {
        name: "Uncertainty Band",
        type: "calibrator",
        description:
          "Adds a simple interval that changes by selected model family and input risk profile.",
        signal: "low-high",
        accent: "indigo",
      },
      {
        name: "Contribution Explainer",
        type: "explainer",
        description:
          "Breaks the prediction into feature contributions so the result can be inspected.",
        signal: "feature cards",
        accent: "green",
      },
    ],
    exampleInput:
      "Age 42, BMI 31.2, smoker, two children, southeast region, ridge-style model.",
    finalResult:
      "The dashboard returns a predicted annual cost, uncertainty range, and the largest positive and negative feature contributions.",
    limitations: [
      "Heuristic client-side logic for demonstration, not a trained production model.",
      "No personal data is stored or sent to a server.",
      "Real pricing would require regulated actuarial workflows, larger datasets, and fairness review.",
    ],
    githubUrl: "#",
  },
];

export const projectStats: Metric[] = [
  { label: "Featured systems", value: "3", detail: "agent, reasoning, prediction" },
  { label: "Demo mode", value: "static", detail: "browser-only traces" },
  { label: "API calls", value: "0", detail: "first version is local" },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
