"""
## Soccer Semantics Refresh Pipeline

This DAG refreshes the semantic lookup tables used by the NL query agent:
- player_aliases: Maps name variants to canonical names (e.g., "Messi" → "Lionel Messi")
- pitch_zones: Defines pitch regions for spatial queries
- event_synonyms: Maps natural language to event types (e.g., "shooting" → "Shot")

**Data-Aware Scheduling**: This DAG is triggered automatically when the
`worldcup_events_loaded` Asset is updated by the ingest pipeline, ensuring
semantics are always in sync with the latest data.

The semantic layer reduces LLM token usage by pre-resolving names and terms,
visible in the app's SemanticStatusBar component.
"""

import json
from datetime import datetime, timedelta

import pandas as pd
from airflow.decorators import dag, task
from airflow.models.dataset import Dataset
from airflow.providers.postgres.hooks.postgres import PostgresHook

# Asset that triggers this DAG when new data lands
WORLDCUP_DATA_ASSET = Dataset("worldcup_events_loaded")

# Asset this DAG produces (for downstream consumers if any)
SEMANTICS_READY_ASSET = Dataset("soccer_semantics_ready")


@dag(
    dag_id="soccer_semantics_refresh",
    # Data-aware schedule: triggered by Asset, not cron
    schedule=[WORLDCUP_DATA_ASSET],
    start_date=datetime(2026, 1, 1),
    catchup=False,
    doc_md=__doc__,
    default_args={
        "owner": "data-team",
        "retries": 1,
        "retry_delay": timedelta(minutes=2),
    },
    tags=["soccer", "semantics", "nlp", "data-aware"],
)
def soccer_semantics_refresh():
    """
    Refresh semantic lookup tables when new soccer data is loaded.
    Triggered by the worldcup_ingest DAG via Asset.
    """

    @task
    def extract_players() -> str:
        """Extract unique players from the database for alias building."""
        pg_hook = PostgresHook(postgres_conn_id="soccer_db")

        query = """
            SELECT DISTINCT 
                player_name,
                player_id,
                team_name
            FROM players
            WHERE player_name IS NOT NULL
            ORDER BY player_name
        """

        df = pg_hook.get_pandas_df(query)
        print(f"Extracted {len(df)} unique players for alias processing")
        return df.to_json()

    @task
    def build_player_aliases(players_json: str) -> int:
        """
        Build player aliases using fuzzy matching.
        Groups similar names and picks the longest (most complete) as canonical.

        Example: "L. Messi", "Messi", "Lionel Messi" → canonical: "Lionel Messi"
        """
        from fuzzywuzzy import process

        players = pd.read_json(players_json)

        if players.empty:
            print("No players to process")
            return 0

        all_names = list(dict.fromkeys(players["player_name"].dropna().tolist()))

        if not all_names:
            print("No player names found")
            return 0

        print(f"Processing {len(all_names)} unique player names")

        # Union-find for clustering similar names
        parent = {n: n for n in all_names}

        def find(x):
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py

        # Cluster names with fuzzy matching (score >= 80)
        for name in all_names:
            similar = process.extract(
                name, all_names, limit=len(all_names), score_cutoff=80
            )
            for match_name, _ in similar:
                union(name, match_name)

        # Build clusters and pick canonical (longest name)
        clusters = {}
        for name in all_names:
            root = find(name)
            if root not in clusters:
                clusters[root] = []
            clusters[root].append(name)

        canonical_for = {}
        for members in clusters.values():
            canonical = max(members, key=len)
            for m in members:
                canonical_for[m] = canonical

        # Insert aliases into database
        pg_hook = PostgresHook(postgres_conn_id="soccer_db")
        rows_inserted = 0

        for alias_name, canonical_name in canonical_for.items():
            if alias_name == canonical_name:
                continue
            query = """
                INSERT INTO player_aliases (canonical_name, alias, confidence)
                VALUES (%s, %s, 1.0)
                ON CONFLICT (canonical_name, alias) DO UPDATE
                SET confidence = 1.0, updated_at = NOW()
            """
            pg_hook.run(query, parameters=(canonical_name, alias_name))
            rows_inserted += 1

        print(f"Inserted/updated {rows_inserted} player aliases")
        print(f"Found {len(clusters)} distinct player clusters")
        return rows_inserted

    @task
    def build_pitch_zones() -> int:
        """
        Build pitch zone definitions for spatial queries.
        Zones match StatsBomb coordinate system (120x80 pitch).
        """
        zones = {
            "defensive_third": {"x_min": 0, "x_max": 40},
            "middle_third": {"x_min": 40, "x_max": 80},
            "final_third": {"x_min": 80, "x_max": 120},
            "left_wing": {"y_min": 0, "y_max": 26},
            "center": {"y_min": 27, "y_max": 53},
            "right_wing": {"y_min": 54, "y_max": 80},
            "penalty_box": {"x_min": 102, "x_max": 120, "y_min": 18, "y_max": 62},
            "six_yard_box": {"x_min": 114, "x_max": 120, "y_min": 30, "y_max": 50},
            # Additional useful zones
            "own_half": {"x_min": 0, "x_max": 60},
            "opponent_half": {"x_min": 60, "x_max": 120},
            "center_circle": {"x_min": 50, "x_max": 70, "y_min": 30, "y_max": 50},
        }

        pg_hook = PostgresHook(postgres_conn_id="soccer_db")

        for zone_name, coords in zones.items():
            query = """
                INSERT INTO pitch_zones (zone_name, coordinates)
                VALUES (%s, %s)
                ON CONFLICT (zone_name) DO UPDATE
                SET coordinates = EXCLUDED.coordinates,
                    updated_at = NOW()
            """
            pg_hook.run(query, parameters=(zone_name, json.dumps(coords)))

        print(f"Loaded {len(zones)} pitch zones")
        return len(zones)

    @task
    def build_event_synonyms() -> int:
        """
        Build event type synonyms for natural language to event mapping.
        Maps user-friendly terms to StatsBomb event types.
        """
        synonyms = {
            # Core events
            "Pass": [
                "pass",
                "passes",
                "passing",
                "distribution",
                "ball distribution",
                "through ball",
                "cross",
                "crosses",
                "assist",
                "key pass",
            ],
            "Shot": [
                "shot",
                "shots",
                "shooting",
                "shoot",
                "strike",
                "strikes",
                "attempt",
                "attempts",
                "finish",
                "finishing",
            ],
            "Carry": [
                "carry",
                "carries",
                "run with ball",
                "dribbling run",
                "progressive carry",
                "ball carry",
            ],
            "Dribble": [
                "dribble",
                "dribbles",
                "take-on",
                "take on",
                "beat defender",
                "skill move",
                "1v1",
            ],
            # Defensive events
            "Pressure": [
                "pressure",
                "pressures",
                "press",
                "pressing",
                "harass",
                "close down",
                "high press",
            ],
            "Interception": [
                "interception",
                "interceptions",
                "intercept",
                "cut off pass",
                "break up play",
                "read the game",
            ],
            "Tackle": [
                "tackle",
                "tackles",
                "tackling",
                "dispossess",
                "win ball",
                "challenge",
                "sliding tackle",
            ],
            "Clearance": [
                "clearance",
                "clearances",
                "clear",
                "cleared",
                "kick out",
                "head away",
                "defensive clearance",
            ],
            "Block": ["block", "blocks", "blocking", "shot block", "blocked"],
            # Set pieces
            "Foul Committed": [
                "foul",
                "fouls",
                "fouled",
                "committed foul",
                "infringement",
            ],
            "Foul Won": ["foul won", "won foul", "drew foul", "earned foul"],
            "Free Kick": ["free kick", "free kicks", "set piece", "dead ball"],
            "Corner": ["corner", "corners", "corner kick"],
            "Penalty": ["penalty", "penalties", "pen", "spot kick", "penalty kick"],
            # Other
            "Goal Keeper": [
                "save",
                "saves",
                "goalkeeper",
                "keeper",
                "gk",
                "punch",
                "catch",
            ],
            "Ball Receipt*": ["receive", "reception", "ball receipt", "first touch"],
            "Ball Recovery": ["recovery", "recover", "ball recovery", "win possession"],
        }

        pg_hook = PostgresHook(postgres_conn_id="soccer_db")
        total_inserted = 0

        for event_type, synonym_list in synonyms.items():
            for synonym in synonym_list:
                query = """
                    INSERT INTO event_synonyms (canonical_type, synonym)
                    VALUES (%s, %s)
                    ON CONFLICT (canonical_type, synonym) DO NOTHING
                """
                pg_hook.run(query, parameters=(event_type, synonym.lower()))
                total_inserted += 1

        print(f"Loaded {total_inserted} event synonyms for {len(synonyms)} event types")
        return total_inserted

    @task
    def extract_team_aliases() -> int:
        """
        Build team name aliases from match data.
        Handles variations like "Germany" vs "Germany Men's".
        """
        pg_hook = PostgresHook(postgres_conn_id="soccer_db")

        # Get unique team names from matches
        query = """
            SELECT DISTINCT home_team_name as team_name FROM matches
            UNION
            SELECT DISTINCT away_team_name as team_name FROM matches
            UNION
            SELECT DISTINCT team_name FROM events WHERE team_name IS NOT NULL
        """

        df = pg_hook.get_pandas_df(query)
        team_names = df["team_name"].dropna().tolist()

        # Common team aliases (World Cup teams)
        known_aliases = {
            "Germany": ["Deutschland", "Die Mannschaft", "German"],
            "Brazil": ["Brasil", "Seleção", "Brazilian"],
            "Argentina": ["Albiceleste", "Argentine"],
            "France": ["Les Bleus", "French"],
            "England": ["Three Lions", "English"],
            "Spain": ["La Roja", "España", "Spanish"],
            "Netherlands": ["Holland", "Dutch", "Oranje"],
            "Portugal": ["Portuguese"],
            "Italy": ["Italia", "Azzurri", "Italian"],
            "Belgium": ["Red Devils", "Belgian"],
        }

        # This is a placeholder - in production you'd store these
        # For now just log what we found
        print(f"Found {len(team_names)} unique team names")
        return len(team_names)

    @task(outlets=[SEMANTICS_READY_ASSET])
    def summarize_semantics(
        aliases_count: int,
        zones_count: int,
        synonyms_count: int,
        teams_count: int,
    ) -> dict:
        """
        Summarize semantic refresh results.
        Declares Asset outlet to signal semantics are ready.
        """
        summary = {
            "player_aliases": aliases_count,
            "pitch_zones": zones_count,
            "event_synonyms": synonyms_count,
            "teams_processed": teams_count,
            "completed_at": datetime.utcnow().isoformat(),
            "asset_updated": "soccer_semantics_ready",
        }

        print("=" * 50)
        print("SEMANTICS REFRESH COMPLETE")
        print("=" * 50)
        for key, value in summary.items():
            print(f"  {key}: {value}")
        print("=" * 50)
        print("NL query agent semantic layer is now up to date!")

        return summary

    # DAG flow - all semantic tasks can run in parallel after data is ready
    players_json = extract_players()

    # Build all semantic tables
    aliases_count = build_player_aliases(players_json)
    zones_count = build_pitch_zones()
    synonyms_count = build_event_synonyms()
    teams_count = extract_team_aliases()

    # Summarize (depends on all semantic tasks)
    summarize_semantics(aliases_count, zones_count, synonyms_count, teams_count)


# Instantiate the DAG
soccer_semantics_refresh()
