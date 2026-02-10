"""
## FIFA World Cup Data Ingest Pipeline

This DAG downloads FIFA World Cup match data from StatsBomb's free open data,
transforms it, and loads it into Supabase. It runs daily and triggers the
semantics pipeline when new data lands.

Pipeline: Extract (StatsBomb API) → Transform → Load (Supabase) → Trigger Semantics

The Asset `worldcup_events_loaded` is declared as an outlet, which triggers
the `soccer_semantics_refresh` DAG to rebuild player aliases, zones, and
event synonyms for the NL query agent.
"""

import os
from datetime import datetime, timedelta

import requests
from airflow.sdk import Asset, dag, task

# from airflow.models.dataset import Dataset

# Asset that triggers semantics refresh when new data is loaded
WORLDCUP_DATA_ASSET = Asset("worldcup_events_loaded")

# StatsBomb open data base URL
STATSBOMB_BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"

# FIFA World Cup competition ID in StatsBomb data
WORLDCUP_COMPETITION_ID = 43


@dag(
    dag_id="worldcup_ingest",
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    doc_md=__doc__,
    default_args={
        "owner": "data-team",
        "retries": 2,
        "retry_delay": timedelta(minutes=5),
    },
    tags=["soccer", "worldcup", "ingest", "etl"],
)
def worldcup_ingest():
    """
    Daily pipeline to ingest FIFA World Cup data from StatsBomb into Supabase.
    Triggers semantics refresh via Asset when complete.
    """

    @task
    def fetch_competitions() -> list[dict]:
        """Fetch all competitions and filter for FIFA World Cup seasons."""
        url = f"{STATSBOMB_BASE_URL}/competitions.json"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        competitions = response.json()

        # Filter for FIFA World Cup only
        worldcup_seasons = [
            {
                "competition_id": c["competition_id"],
                "competition_name": c["competition_name"],
                "season_id": c["season_id"],
                "season_name": c["season_name"],
            }
            for c in competitions
            if c["competition_name"] == "FIFA World Cup"
        ]

        print(f"Found {len(worldcup_seasons)} World Cup seasons")
        for season in worldcup_seasons:
            print(f"  - {season['season_name']}")

        return worldcup_seasons

    @task
    def fetch_matches(competitions: list[dict]) -> list[dict]:
        """Fetch all matches for World Cup seasons."""
        all_matches = []

        for comp in competitions:
            url = f"{STATSBOMB_BASE_URL}/matches/{comp['competition_id']}/{comp['season_id']}.json"
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                matches = response.json()

                for match in matches:
                    match["_competition_id"] = comp["competition_id"]
                    match["_season_name"] = comp["season_name"]

                all_matches.extend(matches)
                print(
                    f"Fetched {len(matches)} matches for {comp['competition_name']} {comp['season_name']}"
                )
            except requests.exceptions.RequestException as e:
                print(
                    f"Warning: Could not fetch matches for {comp['season_name']}: {e}"
                )
                continue

        print(f"Total matches fetched: {len(all_matches)}")
        return all_matches

    @task
    def fetch_lineups(matches: list[dict]) -> list[dict]:
        """Fetch lineups for all matches."""
        all_lineups = []

        for match in matches:
            match_id = match["match_id"]
            url = f"{STATSBOMB_BASE_URL}/lineups/{match_id}.json"
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                lineups = response.json()

                for team in lineups:
                    team["_match_id"] = match_id

                all_lineups.extend(lineups)
            except requests.exceptions.RequestException:
                print(f"Warning: No lineups for match {match_id}")
                continue

        print(f"Fetched lineups for {len(all_lineups)} team-match combinations")
        return all_lineups

    @task
    def fetch_events(matches: list[dict]) -> list[dict]:
        """Fetch events for all matches (batched to avoid memory issues)."""
        all_events = []

        for i, match in enumerate(matches):
            match_id = match["match_id"]
            url = f"{STATSBOMB_BASE_URL}/events/{match_id}.json"
            try:
                response = requests.get(url, timeout=60)
                response.raise_for_status()
                events = response.json()

                for event in events:
                    event["_match_id"] = match_id

                all_events.extend(events)

                if (i + 1) % 10 == 0:
                    print(f"Fetched events for {i + 1}/{len(matches)} matches")

            except requests.exceptions.RequestException as e:
                print(f"Warning: No events for match {match_id}: {e}")
                continue

        print(f"Total events fetched: {len(all_events)}")
        return all_events

    @task
    def load_competitions(competitions: list[dict]) -> int:
        """Load competitions into Supabase."""
        from supabase import create_client

        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

        # Deduplicate by competition_id
        seen = set()
        unique_comps = []
        for c in competitions:
            if c["competition_id"] not in seen:
                seen.add(c["competition_id"])
                unique_comps.append(
                    {
                        "competition_id": c["competition_id"],
                        "competition_name": c["competition_name"],
                        "season_name": c["season_name"],
                    }
                )

        result = (
            supabase.table("competitions")
            .upsert(unique_comps, on_conflict="competition_id")
            .execute()
        )

        print(f"Loaded {len(unique_comps)} competitions")
        return len(unique_comps)

    @task
    def load_matches(matches: list[dict]) -> int:
        """Transform and load matches into Supabase."""
        from supabase import create_client

        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

        transformed = []
        for m in matches:
            kickoff = None
            if m.get("kick_off") and m.get("match_date"):
                kickoff = f"{m['match_date']}T{m['kick_off']}Z"

            transformed.append(
                {
                    "match_id": m["match_id"],
                    "competition_id": m["competition"]["competition_id"],
                    "season_name": m["season"]["season_name"],
                    "match_date": m["match_date"],
                    "kickoff_time": kickoff,
                    "home_team_id": m["home_team"]["home_team_id"],
                    "home_team_name": m["home_team"]["home_team_name"],
                    "away_team_id": m["away_team"]["away_team_id"],
                    "away_team_name": m["away_team"]["away_team_name"],
                    "home_team_score": m.get("home_score", 0),
                    "away_team_score": m.get("away_score", 0),
                    "stadium_name": m.get("stadium", {}).get("name"),
                    "referee_name": m.get("referee", {}).get("name"),
                    "match_status": m.get("match_status", "available"),
                    "last_updated": datetime.utcnow().isoformat(),
                }
            )

        # Batch upsert
        batch_size = 50
        for i in range(0, len(transformed), batch_size):
            batch = transformed[i : i + batch_size]
            supabase.table("matches").upsert(batch, on_conflict="match_id").execute()

        print(f"Loaded {len(transformed)} matches")
        return len(transformed)

    @task
    def load_players_and_lineups(lineups: list[dict]) -> dict:
        """Extract players from lineups and load both into Supabase."""
        from supabase import create_client

        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

        players_map = {}
        lineups_to_insert = []

        for team in lineups:
            match_id = team["_match_id"]
            team_id = team["team_id"]
            team_name = team["team_name"]

            for player in team.get("lineup", []):
                player_id = player["player_id"]

                # Collect unique players
                if player_id not in players_map:
                    players_map[player_id] = {
                        "player_id": player_id,
                        "player_name": player["player_name"],
                        "player_nickname": player.get("player_nickname")
                        or player["player_name"],
                        "jersey_number": player.get("jersey_number", 0),
                        "country": player.get("country", {}).get("name"),
                        "player_age": player.get("player_age"),
                        "player_position": (player.get("positions") or [{}])[0].get(
                            "position", "Unknown"
                        ),
                    }

                lineups_to_insert.append(
                    {
                        "match_id": match_id,
                        "player_id": player_id,
                        "team_id": team_id,
                        "team_name": team_name,
                        "position_name": (player.get("positions") or [{}])[0].get(
                            "position", "Unknown"
                        ),
                        "jersey_number": player.get("jersey_number", 0),
                    }
                )

        # Load players
        players_list = list(players_map.values())
        batch_size = 100
        for i in range(0, len(players_list), batch_size):
            batch = players_list[i : i + batch_size]
            supabase.table("players").upsert(batch, on_conflict="player_id").execute()

        # Load lineups
        for i in range(0, len(lineups_to_insert), batch_size):
            batch = lineups_to_insert[i : i + batch_size]
            supabase.table("lineups").upsert(
                batch, on_conflict="match_id,player_id,team_id"
            ).execute()

        print(
            f"Loaded {len(players_list)} players and {len(lineups_to_insert)} lineups"
        )
        return {"players": len(players_list), "lineups": len(lineups_to_insert)}

    @task(outlets=[WORLDCUP_DATA_ASSET])
    def load_events(events: list[dict]) -> dict:
        """
        Transform and load events into Supabase.
        Declares Asset outlet to trigger semantics refresh.
        """
        from supabase import create_client

        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

        transformed = []
        for e in events:
            # Extract end location from various event types
            end_x = None
            end_y = None
            for key in ["pass", "shot", "carry"]:
                if key in e and "end_location" in e[key]:
                    end_x = e[key]["end_location"][0]
                    end_y = e[key]["end_location"][1]
                    break

            # Extract outcome
            outcome = None
            for key in ["pass", "shot", "carry", "challenge", "foul", "card", "goal"]:
                if key in e and isinstance(e.get(key), dict):
                    outcome = e[key].get("outcome", {}).get("name")
                    if outcome:
                        break

            location = e.get("location", [None, None])

            transformed.append(
                {
                    "event_id": e["id"],
                    "match_id": e["_match_id"],
                    "period": e.get("period", 1),
                    "minute": e.get("minute", 0),
                    "second": e.get("second", 0),
                    "timestamp": e.get("timestamp", "00:00:00.000"),
                    "event_type": e.get("type", {}).get("name", "Unknown"),
                    "event_type_id": e.get("type", {}).get("id", 0),
                    "player_id": e.get("player", {}).get("id"),
                    "player_name": e.get("player", {}).get("name"),
                    "team_id": e.get("team", {}).get("id", 0),
                    "team_name": e.get("team", {}).get("name", "Unknown"),
                    "possession_team_id": e.get("possession_team", {}).get("id"),
                    "possession_team_name": e.get("possession_team", {}).get("name"),
                    "location_x": location[0] if location else None,
                    "location_y": location[1] if len(location) > 1 else None,
                    "end_location_x": end_x,
                    "end_location_y": end_y,
                    "outcome_name": outcome,
                    "event_data": e,
                }
            )

        # Batch upsert with smaller batches for events
        batch_size = 100
        loaded = 0
        for i in range(0, len(transformed), batch_size):
            batch = transformed[i : i + batch_size]
            try:
                supabase.table("events").upsert(
                    batch, on_conflict="event_id,match_id", ignore_duplicates=True
                ).execute()
                loaded += len(batch)
            except Exception as ex:
                print(f"Warning: Batch {i // batch_size} had issues: {ex}")
                continue

            if (i + batch_size) % 1000 == 0:
                print(f"Loaded {i + batch_size}/{len(transformed)} events")

        print(f"Loaded {loaded} events total")
        return {
            "events_loaded": loaded,
            "asset_updated": "worldcup_events_loaded",
            "timestamp": datetime.utcnow().isoformat(),
        }

    @task
    def summarize(
        competitions_count: int,
        matches_count: int,
        players_lineups: dict,
        events_result: dict,
    ) -> dict:
        """Summarize the ingest results."""
        summary = {
            "competitions": competitions_count,
            "matches": matches_count,
            "players": players_lineups["players"],
            "lineups": players_lineups["lineups"],
            "events": events_result["events_loaded"],
            "completed_at": datetime.utcnow().isoformat(),
        }
        print("=" * 50)
        print("WORLD CUP INGEST COMPLETE")
        print("=" * 50)
        for key, value in summary.items():
            print(f"  {key}: {value}")
        print("=" * 50)
        print(
            "Asset 'worldcup_events_loaded' updated - semantics DAG will be triggered"
        )
        return summary

    # DAG flow: Extract → Transform → Load
    competitions = fetch_competitions()
    matches = fetch_matches(competitions)
    lineups = fetch_lineups(matches)
    events = fetch_events(matches)

    # Load in dependency order
    comp_count = load_competitions(competitions)
    match_count = load_matches(matches)
    players_lineups = load_players_and_lineups(lineups)
    events_result = load_events(events)

    # Summarize
    summarize(comp_count, match_count, players_lineups, events_result)


# Instantiate the DAG
worldcup_ingest()
