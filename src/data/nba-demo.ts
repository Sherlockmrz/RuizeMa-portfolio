import type { DemoTrace } from "./projects";

export const nbaDemo: DemoTrace = {
  projectSlug: "nba-roster-upgrade-agent",
  title: "Roster upgrade trace",
  scenario:
    "A playoff team wants a lower-cost wing upgrade without sacrificing future flexibility.",
  inputLabel: "Front-office prompt",
  input:
    "Find a realistic wing upgrade who improves point-of-attack defense, keeps spacing credible, and avoids a high-risk salary commitment.",
  steps: [
    {
      id: "nba-need",
      title: "Translate roster need",
      status: "complete",
      tool: "Roster Gap Analyzer",
      input: "Defense, spacing, cost discipline",
      output: "Target profile: switchable 3-and-D wing with low usage fit",
      explanation:
        "The prompt is converted into weighted roster needs instead of treating every candidate as a generic upgrade.",
    },
    {
      id: "nba-pool",
      title: "Build candidate pool",
      status: "complete",
      tool: "Candidate Retriever",
      input: "Static wing and guard profiles",
      output: "8 candidates passed position and cost filters",
      explanation:
        "The demo retrieves a small local pool to show the shape of the workflow without relying on live league data.",
    },
    {
      id: "nba-score",
      title: "Score basketball fit",
      status: "complete",
      tool: "Fit Scorer",
      input: "Defense, shooting, role, timeline, availability",
      output: "Top fit score: 87 / 100",
      explanation:
        "Candidates are ranked by role fit and downside risk, not by star power alone.",
    },
    {
      id: "nba-constraint",
      title: "Review constraints",
      status: "review",
      tool: "Constraint Check",
      input: "Salary range, asset cost, rotation fit",
      output: "Star-trade paths flagged as high flexibility risk",
      explanation:
        "The agent separates attractive basketball outcomes from moves that overuse salary or draft assets.",
    },
    {
      id: "nba-verify",
      title: "Verify recommendation",
      status: "warning",
      tool: "Verification Pass",
      input: "Ranked list and caveats",
      output: "Recommendation approved with data freshness warnings",
      explanation:
        "The final pass labels which assumptions depend on live contracts, injuries, and scouting context.",
    },
  ],
  intermediateResults: [
    {
      label: "Best role fit",
      value: "3-and-D wing",
      description: "Switchable defender with low-usage offensive fit.",
    },
    {
      label: "Avoided path",
      value: "Star trade",
      description: "Higher ceiling, but too much asset and salary risk for the scenario.",
    },
    {
      label: "Human review",
      value: "Required",
      description: "Live contracts, injuries, and scouting should be checked before action.",
    },
  ],
  finalResult: {
    title: "Recommended direction",
    summary:
      "Prioritize a mid-cost 3-and-D wing profile over a star trade. The upgrade improves the stated defensive need while protecting future flexibility.",
    highlights: [
      "Fit score: 87 / 100",
      "Primary value: defensive matchup coverage",
      "Main caveat: static data cannot validate current contract or health status",
    ],
  },
  limitations: [
    "No live stats, salary tables, CBA rules, or injury feeds are queried.",
    "Candidate names are intentionally abstracted into profiles.",
    "The trace is a portfolio simulation, not a front-office recommendation engine.",
  ],
};
