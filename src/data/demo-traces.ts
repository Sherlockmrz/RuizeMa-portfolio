import { biomedicalDemo } from "./biomedical-demo";
import { insuranceDemo } from "./insurance-demo";
import { nbaDemo } from "./nba-demo";
import type { DemoKey, DemoTrace } from "./projects";

export const demoTraces: Record<DemoKey, DemoTrace> = {
  nba: nbaDemo,
  biomedical: biomedicalDemo,
  insurance: insuranceDemo,
};
