from datetime import datetime

import pandas as pd
from airflow.decorators import dag, task
from airflow.providers.postgres.hooks.postgres import PostgresHook


@dag(
    dag_id="canonical_soccer_semantics",
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["soccer", "semantic", "nlp"],
)
def canonical_soccer_semantics():
    @task
    def extract_players():
        """Extract unique players from the database"""
        pg_hook = PostgresHook(postgres_conn_id="soccer_db")

        query = """
          SELECT DISTINCT 
          player_name,
          player_id,
          team_name,
          FROM players
          WHERE player_name IS NOT NULL
          GROUP BY player_name, player_id, team_name
          ORDER BY player_name DESC
        """

        df = pg_hook.get_pandas_df(query)
        return df.to_json()

    @task
    def build_player_aliases(players_json: str):
        """Build player aliases with one canonical name per cluster (longest = most full form)."""
        from fuzzywuzzy import process

        players = pd.read_json(players_json)
        all_names = list(dict.fromkeys(players["player_name"].tolist()))

        # Union-find: cluster names that fuzzy-match each other
        parent = {n: n for n in all_names}

        def find(x):
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py

        for name in all_names:
            similar = process.extract(
                name, all_names, limit=len(all_names), score_cutoff=80
            )
            for match_name, _ in similar:
                union(name, match_name)

        # One canonical per cluster: longest name (e.g. "Lionel Messi" over "L. Messi")
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

        pg_hook = PostgresHook(postgres_conn_id="soccer_db")
        rows_inserted = 0
        for alias_name, canonical_name in canonical_for.items():
            if alias_name == canonical_name:
                continue
            query = """
              INSERT INTO player_aliases (canonical_name, alias)
              VALUES (%s, %s)
              ON CONFLICT (canonical_name, alias) DO NOTHING
            """
            pg_hook.run(query, parameters=(canonical_name, alias_name))
            rows_inserted += 1

        return rows_inserted

    @task
    def build_zones():
        """Build pitch zones for filtering"""
        import json

        zones = {
            "defensive_third": {"x_min": 0, "x_max": 40},
            "middle_third": {"x_min": 40, "x_max": 80},
            "final_third": {"x_min": 80, "x_max": 120},
            "left_wing": {"y_min": 0, "y_max": 26},
            "right_wing": {"y_min": 54, "y_max": 80},
            "center": {"y_min": 27, "y_max": 53},
            "penalty_box": {"x_min": 102, "x_max": 120, "y_min": 18, "y_max": 62},
            "six_yard_box": {"x_min": 114, "x_max": 120, "y_min": 30, "y_max": 50},
        }
        pg_hook = PostgresHook(postgres_conn_id="soccer_db")

        for zone_name, coords in zones.items():
            query = """
              INSERT INTO pitch_zones (zone_name, coordinates)
              VALUES (%s, %s)
              ON CONFLICT (zone_name) DO UPDATE
              SET coordinates = EXCLUDED.coordinates
            """
            pg_hook.run(query, parameters=(zone_name, json.dumps(coords)))

        return len(zones)

    @task
    def build_event_synonyms():
        """natural language to event types"""
        synonyms = {
            "Pass": ["pass", "passing", "ball distribution", "distribution"],
            "Shot": ["shot", "shots", "strike", "attempt", "shooting"],
            "Carry": ["carry", "run with ball", "dribbling run"],
            "Pressure": ["pressure", "press", "harass"],
            "Interception": ["interception", "cut off pass", "break up play"],
            "Tackle": ["tackle", "dispossess", "win ball"],
            "Clearance": ["clearance", "clearances", "cleared", "kick out"],
            "Foul Committed": ["foul", "fouls", "foul outcome", "foul winner"],
        }

        pg_hook = PostgresHook(postgres_conn_id="soccer_db")

        for event_type, synonym_list in synonyms.items():
            for synonym in synonym_list:
                query = """
                  INSERT INTO event_canon (phrase, event_type)
                  VALUES (%s, %s)
                  ON CONFLICT (phrase, event_type) DO NOTHING
                """
                pg_hook.run(query, parameters=(synonym, event_type))

        return sum(len(v) for v in synonyms.values())

    # @task
    # def build_intents():
    #   """Define intent patterns for query agent"""
    #   intents = {
    #     "visualization": {
    #       "type": "visualization",
    #       "description": "Visualize data in a chart or graph",
    #       "examples": ["Show me the data in a chart", "Create a chart", "Plot the data"],
    #     },
    #   }

    players = extract_players()
    player_aliases_count = build_player_aliases(players)
    # zones_count = build_zones()
    # event_synonyms_count = build_event_synonyms()
    # intents = build_intents()

    [player_aliases_count]  # [zones_count, event_synonyms_count, player_aliases_count]


canonical_soccer_semantics()
