"use client";

import { useMemo, useState } from "react";

import {
  calculateInsurancePrediction,
  insuranceDefaults,
  type InsuranceInput,
} from "@/data/insurance-demo";
import { ModelInputPanel } from "./ModelInputPanel";
import { PredictionResultCard } from "./PredictionResultCard";

export function InsurancePredictor() {
  const [input, setInput] = useState<InsuranceInput>(insuranceDefaults);
  const prediction = useMemo(() => calculateInsurancePrediction(input), [input]);

  return (
    <div className="grid gap-4">
      <ModelInputPanel value={input} onChange={setInput} />
      <PredictionResultCard prediction={prediction} />
    </div>
  );
}
