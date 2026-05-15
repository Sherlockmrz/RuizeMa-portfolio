import type { DemoTrace } from "./projects";

export const biomedicalDemo: DemoTrace = {
  projectSlug: "plan-act-verify-biomedical-reasoning",
  title: "Plan-act-verify trace",
  scenario:
    "A biomedical reasoning system needs to answer a mechanism question without overstating evidence.",
  inputLabel: "Biomedical prompt",
  input:
    "How could a plan-act-verify workflow reduce unsupported conclusions when answering a biomedical mechanism question?",
  steps: [
    {
      id: "bio-plan",
      title: "Plan evidence needs",
      status: "complete",
      tool: "Question Planner",
      input: "Mechanism-focused biomedical question",
      output: "Plan: define scope, evidence needs, uncertainty checks",
      explanation:
        "The system decides what kind of support would be required before composing an answer.",
    },
    {
      id: "bio-frame",
      title: "Frame claims",
      status: "complete",
      tool: "PICO-like Framer",
      input: "Population, mechanism, outcome, answer boundary",
      output: "Answer scope narrowed to reasoning workflow behavior",
      explanation:
        "The prompt is bounded to a system-design explanation rather than a clinical recommendation.",
    },
    {
      id: "bio-act",
      title: "Act on findings",
      status: "complete",
      tool: "Evidence Extractor",
      input: "Static example findings",
      output: "4 structured findings with support notes",
      explanation:
        "The action phase organizes evidence-like snippets into claims the verifier can inspect.",
    },
    {
      id: "bio-verify",
      title: "Verify claims",
      status: "review",
      tool: "Claim Verifier",
      input: "Draft answer and evidence table",
      output: "2 claims supported, 1 claim softened, 1 boundary added",
      explanation:
        "The verifier checks whether the final language is actually warranted by the intermediate trace.",
    },
    {
      id: "bio-answer",
      title: "Compose bounded answer",
      status: "warning",
      tool: "Answer Composer",
      input: "Verified claim set",
      output: "Concise answer with uncertainty and non-clinical boundary",
      explanation:
        "The final answer preserves useful reasoning while making uncertainty visible.",
    },
  ],
  intermediateResults: [
    {
      label: "Claim softened",
      value: "1",
      description: "A broad statement was rewritten as a conditional, evidence-bound claim.",
    },
    {
      label: "Boundary added",
      value: "Not medical advice",
      description: "The answer is explicitly framed as a workflow demonstration.",
    },
    {
      label: "Verification result",
      value: "Pass with caveats",
      description: "Supported claims can ship, but clinical scope is excluded.",
    },
  ],
  finalResult: {
    title: "Verified response",
    summary:
      "A plan-act-verify workflow can reduce unsupported conclusions by forcing the system to plan evidence needs first, act through structured intermediate findings, and verify final claims against those findings before responding.",
    highlights: [
      "Plan phase narrows answer scope before generation",
      "Act phase exposes intermediate evidence and assumptions",
      "Verify phase softens unsupported claims and adds boundaries",
    ],
  },
  limitations: [
    "The demo uses static illustrative findings rather than live biomedical retrieval.",
    "It is not a medical device, diagnosis tool, or treatment recommendation system.",
    "Real deployment would require expert review, evaluation datasets, and safety governance.",
  ],
};
