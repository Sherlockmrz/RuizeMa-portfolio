import type { DemoTrace } from "./projects";

export type InsuranceRegion = "northeast" | "northwest" | "southeast" | "southwest";
export type InsuranceModelType = "linear" | "ridge" | "boosted";

export type InsuranceInput = {
  age: number;
  bmi: number;
  smoker: boolean;
  children: number;
  region: InsuranceRegion;
  modelType: InsuranceModelType;
};

export type FeatureContribution = {
  label: string;
  value: number;
  direction: "up" | "down" | "neutral";
  description: string;
};

export type InsurancePrediction = {
  predictedAnnualCost: number;
  uncertaintyLow: number;
  uncertaintyHigh: number;
  confidenceLabel: string;
  contributions: FeatureContribution[];
};

export const insuranceDefaults: InsuranceInput = {
  age: 42,
  bmi: 31.2,
  smoker: true,
  children: 2,
  region: "southeast",
  modelType: "ridge",
};

export const regionLabels: Record<InsuranceRegion, string> = {
  northeast: "Northeast",
  northwest: "Northwest",
  southeast: "Southeast",
  southwest: "Southwest",
};

export const modelLabels: Record<InsuranceModelType, string> = {
  linear: "Linear baseline",
  ridge: "Ridge regularized",
  boosted: "Boosted ensemble",
};

const regionAdjustments: Record<InsuranceRegion, number> = {
  northeast: 420,
  northwest: -180,
  southeast: 860,
  southwest: 120,
};

const modelAdjustments: Record<InsuranceModelType, number> = {
  linear: -260,
  ridge: 0,
  boosted: 510,
};

const uncertaintyRates: Record<InsuranceModelType, number> = {
  linear: 0.18,
  ridge: 0.14,
  boosted: 0.11,
};

function roundedCurrency(value: number) {
  return Math.round(value / 10) * 10;
}

function directionFor(value: number): FeatureContribution["direction"] {
  if (value > 75) return "up";
  if (value < -75) return "down";
  return "neutral";
}

export function calculateInsurancePrediction(
  input: InsuranceInput,
): InsurancePrediction {
  const base = 2400;
  const ageContribution =
    Math.max(input.age - 18, 0) * 118 + Math.max(input.age - 45, 0) * 52;
  const bmiContribution =
    (input.bmi - 25) * 210 + Math.max(input.bmi - 30, 0) * 460;
  const smokerContribution = input.smoker ? 15600 : -520;
  const childrenContribution = input.children * 640;
  const regionContribution = regionAdjustments[input.region];
  const modelContribution = modelAdjustments[input.modelType];

  const rawCost =
    base +
    ageContribution +
    bmiContribution +
    smokerContribution +
    childrenContribution +
    regionContribution +
    modelContribution;

  const predictedAnnualCost = Math.max(900, roundedCurrency(rawCost));
  const riskBump = input.smoker || input.bmi >= 35 ? 0.03 : 0;
  const uncertainty = predictedAnnualCost * (uncertaintyRates[input.modelType] + riskBump);
  const uncertaintyLow = Math.max(600, roundedCurrency(predictedAnnualCost - uncertainty));
  const uncertaintyHigh = roundedCurrency(predictedAnnualCost + uncertainty);

  const contributions: FeatureContribution[] = [
    {
      label: "Age",
      value: roundedCurrency(ageContribution),
      direction: directionFor(ageContribution),
      description: `${input.age} years old relative to the demo baseline.`,
    },
    {
      label: "BMI",
      value: roundedCurrency(bmiContribution),
      direction: directionFor(bmiContribution),
      description: `BMI ${input.bmi.toFixed(1)} with added risk above 30.`,
    },
    {
      label: "Smoker status",
      value: roundedCurrency(smokerContribution),
      direction: directionFor(smokerContribution),
      description: input.smoker
        ? "Smoking is the largest positive cost driver in this demo."
        : "Non-smoker status lowers the estimate from the baseline.",
    },
    {
      label: "Children",
      value: roundedCurrency(childrenContribution),
      direction: directionFor(childrenContribution),
      description: `${input.children} covered dependent${input.children === 1 ? "" : "s"}.`,
    },
    {
      label: "Region",
      value: roundedCurrency(regionContribution),
      direction: directionFor(regionContribution),
      description: `${regionLabels[input.region]} regional adjustment.`,
    },
    {
      label: "Model",
      value: roundedCurrency(modelContribution),
      direction: directionFor(modelContribution),
      description: `${modelLabels[input.modelType]} calibration adjustment.`,
    },
  ];

  return {
    predictedAnnualCost,
    uncertaintyLow,
    uncertaintyHigh,
    confidenceLabel:
      input.modelType === "boosted"
        ? "Narrower demo interval"
        : input.modelType === "ridge"
          ? "Balanced demo interval"
          : "Wider demo interval",
    contributions,
  };
}

export const insuranceDemo: DemoTrace = {
  projectSlug: "insurance-cost-predictor",
  title: "Prediction trace",
  scenario:
    "A user adjusts tabular insurance inputs and inspects how the prediction changes.",
  inputLabel: "Default model input",
  input:
    "Age 42, BMI 31.2, smoker, two children, southeast region, ridge-style model.",
  steps: [
    {
      id: "ins-input",
      title: "Capture inputs",
      status: "complete",
      tool: "ModelInputPanel",
      input: "Age, BMI, smoker, children, region, model type",
      output: "Validated client-side feature object",
      explanation:
        "All fields stay in the browser and update the local model state immediately.",
    },
    {
      id: "ins-encode",
      title: "Encode features",
      status: "complete",
      tool: "Feature Encoder",
      input: "Mixed numeric, boolean, and categorical inputs",
      output: "Age, BMI, smoker, children, region, model signals",
      explanation:
        "The demo converts each input into an inspectable contribution rather than hiding the model behind an API call.",
    },
    {
      id: "ins-predict",
      title: "Estimate annual cost",
      status: "complete",
      tool: "Cost Estimator",
      input: "Encoded feature values",
      output: "Predicted annual cost in USD",
      explanation:
        "A transparent heuristic model produces a fast browser-side prediction for portfolio demonstration.",
    },
    {
      id: "ins-uncertainty",
      title: "Compute uncertainty",
      status: "review",
      tool: "Uncertainty Band",
      input: "Prediction, model type, risk profile",
      output: "Low and high estimate range",
      explanation:
        "The interval widens for simpler models and higher-risk profiles so the output does not imply false precision.",
    },
    {
      id: "ins-explain",
      title: "Explain result",
      status: "warning",
      tool: "Contribution Explainer",
      input: "Feature-level adjustments",
      output: "Contribution cards and limitation notes",
      explanation:
        "The final view shows which features moved the prediction most and labels the demo as non-production logic.",
    },
  ],
  intermediateResults: [
    {
      label: "Largest driver",
      value: "Smoker status",
      description: "The default smoker setting dominates the estimate in the demo coefficients.",
    },
    {
      label: "Uncertainty",
      value: "Model-based",
      description: "The selected model family changes the interval width.",
    },
    {
      label: "Data flow",
      value: "Local only",
      description: "No inputs are sent to an API or stored in a database.",
    },
  ],
  finalResult: {
    title: "Interactive prediction",
    summary:
      "The live dashboard returns an annual cost estimate, a low-high range, and feature contribution cards as the user changes inputs.",
    highlights: [
      "Browser-only TypeScript logic",
      "Model type changes calibration and uncertainty",
      "Contribution cards expose the drivers of the estimate",
    ],
  },
  limitations: [
    "The model is a transparent heuristic for portfolio use, not a trained actuarial model.",
    "Predictions should not be used for real pricing, underwriting, or coverage decisions.",
    "A real product would need audited data, fairness checks, privacy review, and regulatory controls.",
  ],
};
