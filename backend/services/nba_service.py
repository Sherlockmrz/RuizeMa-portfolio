from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

DEFAULT_NBA_QUERY = (
    "Recommend top 5 players for the Warriors to improve interior defense using "
    "the last 10 games. Only include players with at least 20 games and 18 "
    "average minutes."
)

DEFAULTS = {
    "team": "Warriors",
    "goal": "",
    "top_k": 5,
    "recent_games": 10,
    "min_games": 15,
    "min_avg_minutes": 15,
    "exclude_current_team": True,
}

CORE_METRICS = ["REB", "AST", "STL", "BLK", "FG3_PCT"]
CORE_METRIC_LABELS = {
    "REB": "Rebounding",
    "AST": "Playmaking",
    "STL": "Perimeter Defense",
    "BLK": "Rim Protection",
    "FG3_PCT": "Three-Point Shooting",
}
RADAR_METRICS = ["PTS", "AST", "REB", "STL", "BLK", "FG3_PCT"]
GOAL_MAP = {
    "interior defense": ["BLK", "REB"],
    "rim protection": ["BLK"],
    "rebounding": ["REB"],
    "playmaking": ["AST"],
    "perimeter defense": ["STL"],
    "three-point shooting": ["FG3_PCT"],
    "shooting": ["FG3_PCT"],
}

NBA_RECORDED_DEMO = {
    "parsed_query": {
        "team": "Warriors",
        "goal": "improve interior defense",
        "top_k": 5,
        "recent_games": 10,
        "min_games": 20,
        "min_avg_minutes": 18,
        "exclude_current_team": True,
    },
    "raw_llm_parse_output": {
        "team": "Warriors",
        "goal": "improve interior defense",
        "top_k": 5,
        "recent_games": 10,
        "min_games": 20,
        "min_avg_minutes": 18,
        "exclude_current_team": True,
    },
    "team": {
        "team_id": 1610612744,
        "team_name": "Golden State Warriors",
        "season": 2022,
    },
    "team_needs": [
        {
            "metric": "STL",
            "label": "Perimeter Defense",
            "team_value": 6.0,
            "league_mean": 7.347,
            "z_score": -1.224,
            "need_weight": 1.224,
            "goal_boosted": False,
        },
        {
            "metric": "REB",
            "label": "Rebounding",
            "team_value": 41.4,
            "league_mean": 43.61,
            "z_score": -0.745,
            "need_weight": 1.118,
            "goal_boosted": True,
        },
        {
            "metric": "BLK",
            "label": "Rim Protection",
            "team_value": 3.9,
            "league_mean": 4.32,
            "z_score": -0.458,
            "need_weight": 0.688,
            "goal_boosted": True,
        },
        {
            "metric": "AST",
            "label": "Playmaking",
            "team_value": 28.1,
            "league_mean": 24.353,
            "z_score": 1.93,
            "need_weight": 0.0,
            "goal_boosted": False,
        },
        {
            "metric": "FG3_PCT",
            "label": "Three-Point Shooting",
            "team_value": 0.383,
            "league_mean": 0.356,
            "z_score": 0.916,
            "need_weight": 0.0,
            "goal_boosted": False,
        },
    ],
    "candidate_count": 236,
    "recommendations": [
        {
            "player_name": "Anthony Davis",
            "current_team": "Los Angeles Lakers",
            "gp": 28,
            "avg_min": 32.145,
            "fit_score": 7.388,
            "best_match": "Rebounding + Rim Protection",
        },
        {
            "player_name": "Rudy Gobert",
            "current_team": "Minnesota Timberwolves",
            "gp": 29,
            "avg_min": 30.795,
            "fit_score": 5.286,
            "best_match": "Rebounding + Rim Protection",
        },
        {
            "player_name": "O.G. Anunoby",
            "current_team": "Toronto Raptors",
            "gp": 33,
            "avg_min": 34.776,
            "fit_score": 5.032,
            "best_match": "Perimeter Defense + Rim Protection",
        },
        {
            "player_name": "Nikola Jokic",
            "current_team": "Denver Nuggets",
            "gp": 30,
            "avg_min": 31.489,
            "fit_score": 5.024,
            "best_match": "Rebounding + Perimeter Defense",
        },
        {
            "player_name": "Joel Embiid",
            "current_team": "Philadelphia 76ers",
            "gp": 24,
            "avg_min": 34.539,
            "fit_score": 4.863,
            "best_match": "Rebounding + Rim Protection",
        },
    ],
    "scouting_summary": (
        "The Golden State Warriors currently lack reliable perimeter defense, "
        "rebounding, and rim protection, creating a pressing mandate to upgrade "
        "their interior presence. To address these schematic deficiencies, the "
        "model identifies Anthony Davis, Rudy Gobert, O.G. Anunoby, Nikola Jokic, "
        "and Joel Embiid as the top statistical fits, with Davis leading the board "
        "due to his elite combination of rebounding and paint deterrence that "
        "directly targets Golden State's most critical defensive voids. Gobert and "
        "Embiid mirror that interior dominance, while Jokic and Anunoby add "
        "versatile perimeter containment and secondary playmaking alongside strong "
        "glass-cleaning profiles. This ranking is derived strictly from on-court "
        "statistical alignment with the team's identified needs and explicitly "
        "disregards salary cap constraints, trade logistics, or roster construction "
        "feasibility."
    ),
}


def _clean_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    out = df.replace([np.inf, -np.inf], np.nan).where(pd.notnull(df), None)
    records = out.to_dict(orient="records")
    return [{_snake_case(k): v for k, v in row.items()} for row in records]


def _snake_case(name: str) -> str:
    return name.lower()


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _parse_minutes(value: Any) -> float:
    if pd.isna(value):
        return 0.0
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return 0.0
    if ":" in text:
        try:
            minutes, seconds = text.split(":")
            return float(minutes) + float(seconds) / 60.0
        except Exception:
            return 0.0
    try:
        return float(text)
    except Exception:
        return 0.0


def _fallback_parse_query(user_query: str, teams: pd.DataFrame | None = None) -> dict[str, Any]:
    parsed = DEFAULTS.copy()
    query = user_query.lower()

    if teams is not None:
        for _, row in teams.iterrows():
            possible = [
                str(row["NICKNAME"]).lower(),
                str(row["ABBREVIATION"]).lower(),
                str(row["TEAM_NAME_FULL"]).lower(),
                str(row["CITY"]).lower(),
            ]
            if any(candidate and candidate in query for candidate in possible):
                parsed["team"] = row["TEAM_NAME_FULL"]
                break

    for goal in GOAL_MAP:
        if goal in query:
            parsed["goal"] = goal
            break

    if "improve interior defense" in query:
        parsed["goal"] = "improve interior defense"

    match = re.search(r"top\s*(\d+)", query)
    if match:
        parsed["top_k"] = int(match.group(1))

    match = re.search(r"(last|recent)\s*(\d+)\s*games", query)
    if match:
        parsed["recent_games"] = int(match.group(2))

    match = re.search(r"at least\s*(\d+)\s*games", query)
    if match:
        parsed["min_games"] = int(match.group(1))

    match = re.search(r"at least\s*(\d+)\s*(avg|average)?\s*minutes", query)
    if match:
        parsed["min_avg_minutes"] = int(match.group(1))

    return parsed


@lru_cache(maxsize=1)
def _load_context(data_path: str) -> dict[str, Any]:
    base_path = Path(data_path)
    teams = pd.read_csv(base_path / "teams.csv")
    games = pd.read_csv(base_path / "games.csv")
    details = pd.read_csv(base_path / "games_details.csv", low_memory=False)

    games["GAME_DATE_EST"] = pd.to_datetime(games["GAME_DATE_EST"])
    for col in [
        "FGM",
        "FGA",
        "FG3M",
        "FG3A",
        "FTM",
        "FTA",
        "OREB",
        "DREB",
        "REB",
        "AST",
        "STL",
        "BLK",
        "TO",
        "PF",
        "PTS",
        "PLUS_MINUS",
    ]:
        details[col] = pd.to_numeric(details[col], errors="coerce").fillna(0)

    details["MIN_FLOAT"] = details["MIN"].apply(_parse_minutes)
    details = details[details["MIN_FLOAT"] > 0].copy()
    games_small = games[["GAME_ID", "GAME_DATE_EST", "SEASON", "HOME_TEAM_ID", "VISITOR_TEAM_ID"]].copy()
    player_game_df = details.merge(
        games_small[["GAME_ID", "GAME_DATE_EST", "SEASON"]],
        on="GAME_ID",
        how="left",
    )

    teams["TEAM_NAME_FULL"] = (
        teams["CITY"].fillna("") + " " + teams["NICKNAME"].fillna("")
    ).str.strip()
    team_name_map = dict(zip(teams["TEAM_ID"], teams["TEAM_NAME_FULL"]))
    team_lookup: dict[str, int] = {}
    for _, row in teams.iterrows():
        for key in [
            str(row["TEAM_ID"]),
            str(row["ABBREVIATION"]),
            str(row["NICKNAME"]),
            str(row["CITY"]),
            str(row["TEAM_NAME_FULL"]),
        ]:
            team_lookup[key.lower()] = int(row["TEAM_ID"])

    team_game_df = (
        player_game_df.groupby(["GAME_ID", "TEAM_ID"], as_index=False)
        .agg({"REB": "sum", "AST": "sum", "STL": "sum", "BLK": "sum", "FG3M": "sum", "FG3A": "sum", "PTS": "sum"})
        .merge(games_small, on="GAME_ID", how="left")
    )
    team_game_df["FG3_PCT"] = np.where(
        team_game_df["FG3A"] > 0,
        team_game_df["FG3M"] / team_game_df["FG3A"],
        0,
    )

    return {
        "teams": teams,
        "games": games,
        "player_game_df": player_game_df,
        "team_game_df": team_game_df,
        "team_name_map": team_name_map,
        "team_lookup": team_lookup,
    }


def _data_path_ready() -> tuple[bool, str | None]:
    data_path = os.environ.get("NBA_DATA_PATH")
    if not data_path:
        return False, None
    base = Path(data_path)
    required = ["teams.csv", "games.csv", "games_details.csv"]
    return all((base / name).exists() for name in required), data_path


def _find_team_id(team_text: str, context: dict[str, Any]) -> int:
    key = str(team_text).strip().lower()
    lookup = context["team_lookup"]
    if key in lookup:
        return lookup[key]
    for candidate, team_id in lookup.items():
        if key in candidate:
            return team_id
    raise ValueError(f"Could not match team name: {team_text}")


def _team_need_diagnosis(context: dict[str, Any], team_id: int, season: int, recent_games: int) -> pd.DataFrame:
    team_game_df = context["team_game_df"]
    team_part = team_game_df[
        (team_game_df["TEAM_ID"] == team_id) & (team_game_df["SEASON"] == season)
    ].sort_values("GAME_DATE_EST")
    if len(team_part) == 0:
        raise ValueError("No team games found for this team/season.")

    team_recent = team_part.tail(recent_games)
    league_recent = (
        team_game_df[team_game_df["SEASON"] == season]
        .sort_values("GAME_DATE_EST")
        .groupby("TEAM_ID", as_index=False)
        .tail(recent_games)
        .groupby("TEAM_ID", as_index=False)[CORE_METRICS]
        .mean()
    )
    team_values = team_recent[CORE_METRICS].mean()
    league_mean = league_recent[CORE_METRICS].mean()
    league_std = league_recent[CORE_METRICS].std(ddof=0).replace(0, 1)
    z_scores = (team_values - league_mean) / league_std
    need_weights = (-z_scores).clip(lower=0)

    return pd.DataFrame(
        {
            "metric": CORE_METRICS,
            "label": [CORE_METRIC_LABELS[m] for m in CORE_METRICS],
            "team_value": [team_values[m] for m in CORE_METRICS],
            "league_mean": [league_mean[m] for m in CORE_METRICS],
            "z_score": [z_scores[m] for m in CORE_METRICS],
            "need_weight": [need_weights[m] for m in CORE_METRICS],
        }
    ).sort_values("need_weight", ascending=False).reset_index(drop=True)


def _apply_goal_boost(need_df: pd.DataFrame, goal_text: str, boost: float = 1.5) -> pd.DataFrame:
    out = need_df.copy()
    out["goal_boosted"] = False
    if not goal_text:
        return out
    boosted_metrics: set[str] = set()
    goal_lower = goal_text.lower().strip()
    for key, metrics in GOAL_MAP.items():
        if key in goal_lower:
            boosted_metrics.update(metrics)
    if boosted_metrics:
        mask = out["metric"].isin(boosted_metrics)
        out.loc[mask, "need_weight"] = out.loc[mask, "need_weight"] * boost
        out.loc[mask, "goal_boosted"] = True
    return out.sort_values("need_weight", ascending=False).reset_index(drop=True)


def _player_strengths(context: dict[str, Any], season: int, min_games: int, min_avg_minutes: int) -> pd.DataFrame:
    season_df = context["player_game_df"][context["player_game_df"]["SEASON"] == season].copy()
    player_summary = (
        season_df.groupby(["PLAYER_ID", "PLAYER_NAME", "TEAM_ID"], as_index=False)
        .agg(
            {
                "GAME_ID": pd.Series.nunique,
                "MIN_FLOAT": "mean",
                "PTS": "mean",
                "REB": "mean",
                "AST": "mean",
                "STL": "mean",
                "BLK": "mean",
                "FG3M": "mean",
                "FG3A": "mean",
            }
        )
        .rename(columns={"GAME_ID": "GP", "MIN_FLOAT": "AVG_MIN"})
    )
    player_summary["FG3_PCT"] = np.where(
        player_summary["FG3A"] > 0,
        player_summary["FG3M"] / player_summary["FG3A"],
        0,
    )
    player_summary = player_summary[
        (player_summary["GP"] >= min_games) & (player_summary["AVG_MIN"] >= min_avg_minutes)
    ].copy()
    core_means = player_summary[CORE_METRICS].mean()
    core_stds = player_summary[CORE_METRICS].std(ddof=0).replace(0, 1)
    z_strength = (player_summary[CORE_METRICS] - core_means) / core_stds
    z_strength = z_strength.clip(lower=0)
    for metric in CORE_METRICS:
        player_summary[f"{metric}_strength"] = z_strength[metric]
    for metric in RADAR_METRICS:
        player_summary[f"{metric}_radar"] = player_summary[metric].rank(pct=True) * 100
    player_summary["CURRENT_TEAM"] = player_summary["TEAM_ID"].map(context["team_name_map"])
    return player_summary


def _rank_players(
    team_id: int,
    need_df: pd.DataFrame,
    player_strength_df: pd.DataFrame,
    top_k: int,
    exclude_current_team: bool,
) -> pd.DataFrame:
    candidates = player_strength_df.copy()
    if exclude_current_team:
        candidates = candidates[candidates["TEAM_ID"] != team_id].copy()
    need_map = dict(zip(need_df["metric"], need_df["need_weight"]))
    candidates["fit_score"] = 0.0
    for metric in CORE_METRICS:
        candidates["fit_score"] += need_map.get(metric, 0) * candidates[f"{metric}_strength"]

    def best_match(row: pd.Series) -> str:
        parts = {
            CORE_METRIC_LABELS[metric]: need_map.get(metric, 0) * row[f"{metric}_strength"]
            for metric in CORE_METRICS
        }
        best_two = [label for label, score in sorted(parts.items(), key=lambda item: item[1], reverse=True)[:2] if score > 0]
        return " + ".join(best_two) if best_two else "General fit"

    candidates["best_match"] = candidates.apply(best_match, axis=1)
    return candidates.sort_values("fit_score", ascending=False).reset_index(drop=True).head(top_k)


def _fallback_summary(team_name: str, parsed: dict[str, Any], need_df: pd.DataFrame, ranked_df: pd.DataFrame) -> str:
    top_needs = need_df.sort_values("need_weight", ascending=False).head(3)["label"].tolist()
    top_players = ranked_df["PLAYER_NAME"].tolist()
    return (
        f"Team: {team_name}\n"
        f"Goal: {parsed['goal'] if parsed['goal'] else 'None'}\n"
        f"Main needs: {', '.join(top_needs)}\n"
        f"Recommended players: {', '.join(top_players)}\n"
        "This result comes from Tool A team need diagnosis, Tool B player "
        "strengths, and Tool C fit ranking."
    )


def _trace_for_result(result: dict[str, Any], mode: str) -> list[dict[str, str]]:
    return [
        {
            "id": "nba-parse",
            "title": "LLM parsing",
            "status": "complete" if result.get("parsed_query") else "warning",
            "tool": "parse_user_query",
            "input": result.get("query", DEFAULT_NBA_QUERY),
            "output": str(result.get("parsed_query", {})),
            "explanation": "Original workflow converts the natural-language request into team, goal, top-k, recent window, and availability filters.",
        },
        {
            "id": "nba-tool-a",
            "title": "Tool A: Team Need Diagnosis",
            "status": "complete" if result.get("team_needs") else "warning",
            "tool": "tool_a_team_need_diagnosis",
            "input": str(result.get("team", {})),
            "output": f"{len(result.get('team_needs', []))} need dimensions",
            "explanation": "Uses rolling-window team statistics and league z-scores to identify below-average tactical dimensions.",
        },
        {
            "id": "nba-tool-b",
            "title": "Tool B: Player Strength Representation",
            "status": "complete" if result.get("candidate_count") else "warning",
            "tool": "tool_b_player_strengths",
            "input": str(result.get("parsed_query", {})),
            "output": f"{result.get('candidate_count', 0)} eligible players",
            "explanation": "Builds player box-score strength vectors and derived skill indicators after games/minutes filters.",
        },
        {
            "id": "nba-tool-c",
            "title": "Tool C: Fit Ranking",
            "status": "complete" if result.get("recommendations") else "warning",
            "tool": "tool_c_rank_players",
            "input": "Need weights x player strengths",
            "output": f"{len(result.get('recommendations', []))} recommendation cards",
            "explanation": "Ranks candidates by matching team need weights against positive player strength dimensions.",
        },
        {
            "id": "nba-summary",
            "title": "LLM scouting summary",
            "status": "complete" if result.get("scouting_summary") else "warning",
            "tool": "generate_llm_summary",
            "input": "Team needs and ranked players",
            "output": "Scouting-style explanation" if result.get("scouting_summary") else "Unavailable",
            "explanation": f"Summary is {'recorded from the notebook output' if mode == 'recorded_notebook' else 'generated with the original fallback summary path'}.",
        },
    ]


def _recorded_response(query: str) -> dict[str, Any]:
    input_matches = _normalize_query(query) == _normalize_query(DEFAULT_NBA_QUERY)
    result = {
        **NBA_RECORDED_DEMO,
        "query": query,
        "robustness_check": {
            "available": False,
            "summary": "No robustness-check code or output was present in the original NBA project folder.",
        },
        "grounded_qa": {
            "available": False,
            "summary": "No grounded Q&A implementation was present in the original NBA project folder.",
        },
        "input_matches_recorded_sample": input_matches,
    }
    if not input_matches:
        result["recommendations"] = []
        result["scouting_summary"] = ""
    return {
        "ok": input_matches,
        "mode": "recorded_notebook",
        "project": "NBA Roster Upgrade Agent",
        "input": {"query": query},
        "trace": _trace_for_result(result, "recorded_notebook"),
        "result": result,
        "limitations": [
            "The original NBA repo does not include teams.csv, games.csv, or games_details.csv.",
            "Recorded mode only returns the original notebook output for the original demo query.",
            "Salary, age, trade feasibility, and robustness checks are not implemented in the original demo.",
        ],
        "provenance": {
            "source": "original_projects/NBA-Roster-Upgrade-Agent/notebooks/demo.ipynb",
            "wrapped_files": ["original_projects/NBA-Roster-Upgrade-Agent/src/main.py"],
            "data_dependency": "Set NBA_DATA_PATH to a folder with teams.csv, games.csv, and games_details.csv for live recomputation.",
        },
    }


def _live_response(query: str, data_path: str) -> dict[str, Any]:
    context = _load_context(data_path)
    parsed = _fallback_parse_query(query, context["teams"])
    team_id = _find_team_id(parsed["team"], context)
    team_name = context["team_name_map"][team_id]
    season = int(context["games"]["SEASON"].max())
    need_df = _apply_goal_boost(
        _team_need_diagnosis(context, team_id, season, parsed["recent_games"]),
        parsed["goal"],
    )
    player_strength_df = _player_strengths(
        context,
        season,
        parsed["min_games"],
        parsed["min_avg_minutes"],
    )
    ranked_df = _rank_players(
        team_id,
        need_df,
        player_strength_df,
        parsed["top_k"],
        parsed["exclude_current_team"],
    )
    result = {
        "query": query,
        "parsed_query": parsed,
        "raw_llm_parse_output": "[Original fallback parser used in backend; live LLM parsing not required for local recomputation.]",
        "team": {"team_id": team_id, "team_name": team_name, "season": season},
        "team_needs": _clean_records(need_df.round(3)),
        "candidate_count": int(len(player_strength_df)),
        "recommendations": _clean_records(
            ranked_df[
                ["PLAYER_NAME", "CURRENT_TEAM", "GP", "AVG_MIN", "fit_score", "best_match"]
            ].rename(
                columns={
                    "PLAYER_NAME": "player_name",
                    "CURRENT_TEAM": "current_team",
                    "GP": "gp",
                    "AVG_MIN": "avg_min",
                }
            ).round(3)
        ),
        "scouting_summary": _fallback_summary(team_name, parsed, need_df, ranked_df),
        "robustness_check": {
            "available": False,
            "summary": "No robustness-check function was present in the original source.",
        },
        "grounded_qa": {
            "available": False,
            "summary": "No grounded Q&A implementation was present in the original source.",
        },
        "input_matches_recorded_sample": False,
    }
    return {
        "ok": True,
        "mode": "live_refactored_original",
        "project": "NBA Roster Upgrade Agent",
        "input": {"query": query},
        "trace": _trace_for_result(result, "live_refactored_original"),
        "result": result,
        "limitations": [
            "The backend refactors the original Colab-style code into importable functions; the original source file is unchanged.",
            "Live mode uses the original fallback parser unless OpenRouter parsing is added with credentials.",
            "Original project limitations still apply: statistical fit is not salary/trade realism.",
        ],
        "provenance": {
            "source": "original_projects/NBA-Roster-Upgrade-Agent/src/main.py",
            "data_path": data_path,
            "wrapped_logic": [
                "fallback_parse_query",
                "tool_a_team_need_diagnosis",
                "apply_goal_boost",
                "tool_b_player_strengths",
                "tool_c_rank_players",
                "fallback_summary",
            ],
        },
    }


def run_nba(query: str) -> dict[str, Any]:
    ready, data_path = _data_path_ready()
    if ready and data_path:
        try:
            return _live_response(query, data_path)
        except Exception as exc:
            response = _recorded_response(query)
            response["ok"] = False
            response["limitations"].insert(0, f"Live NBA recomputation failed: {exc}")
            return response
    return _recorded_response(query)
