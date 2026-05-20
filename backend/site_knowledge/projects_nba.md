# NBA Roster Upgrade Agent

GitHub: https://github.com/Sherlockmrz/NBA-Roster-Upgrade-Agent-Webapp

The NBA Roster Upgrade Agent is an LLM-driven NBA player recommendation and scouting workflow. It turns natural-language roster questions into structured constraints, runs modular analysis tools, and returns interpretable recommendations.

## Core Workflow

- Natural-language query parsing
- Team need diagnosis
- LLM Need Reasoning
- Player strength vectors
- Fit ranking
- Robustness checks
- Grounded Q&A
- Sensitivity check
- Final scouting summary

## Tool Flow

- Tool A diagnoses team needs from team performance patterns.
- LLM Need Reasoning explains the roster weakness in basketball language.
- Tool B represents player strengths as standardized vectors.
- Tool C ranks candidate players by fit against the diagnosed need.
- Sensitivity checks test whether rankings are stable under changed assumptions.
- Grounded Q&A answers only from the current agent result when possible.

## Why This Is Not Just Zero-Shot Recommendation

A zero-shot LLM recommendation can produce plausible names without verifying whether the players match the team need, constraints, or current dataset. The NBA agent uses tools to parse the request, compute team needs, represent candidates, rank fits, and expose traceable evidence. This makes the recommendation easier to inspect and less dependent on the model's parametric memory.

Live recomputation depends on backend resources and NBA data availability. The original WebApp expects NBA data files such as teams.csv, games.csv, and games_details.csv.
