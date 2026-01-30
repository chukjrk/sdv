from datetime import datetime

from airflow.operators.python import PythonOperator

from airflow import DAG

with DAG(
    dag_id="canonical_soccer_semantics",
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:
    extract_players = PythonOperator(
        task_id="extract_players",
        python_callable=extract_players_fn,
    )

    build_player_aliases = PythonOperator(
        task_id="build_event_aliases",
        python_callable=build_player_aliases_fn,
    )

    build_zones = PythonOperator(
        task_id="build_zones",
        python_callable=build_zones_fn,
    )

    build_event_synonyms = PythonOperator(
        task_id="build_event_synonyms",
        python_callable=build_event_synonyms_fn,
    )

    build_intents = PythonOperator(
        task_id="build_intents",
        python_callable=build_intents_fn,
    )

    (
        extract_players
        >> build_player_aliases
        >> [build_zones, build_event_synonyms, build_intents]
    )
