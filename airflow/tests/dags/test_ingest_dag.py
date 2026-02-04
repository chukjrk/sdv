"""Tests for the World Cup ingest DAG."""

from airflow.models import DagBag


def test_ingest_dag_loaded():
    """Test that ingest DAG loads without errors."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    assert "worldcup_ingest" in dagbag.dags
    assert len(dagbag.import_errors) == 0


def test_ingest_dag_structure():
    """Test ingest DAG has expected tasks."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    dag = dagbag.get_dag("worldcup_ingest")

    task_ids = [task.task_id for task in dag.tasks]

    # Check extract tasks
    assert "fetch_competitions" in task_ids
    assert "fetch_matches" in task_ids
    assert "fetch_lineups" in task_ids
    assert "fetch_events" in task_ids

    # Check load tasks
    assert "load_competitions" in task_ids
    assert "load_matches" in task_ids
    assert "load_players_and_lineups" in task_ids
    assert "load_events" in task_ids

    # Check summary task
    assert "summarize" in task_ids


def test_ingest_dag_schedule():
    """Test ingest DAG runs daily."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    dag = dagbag.get_dag("worldcup_ingest")

    assert dag.schedule_interval == "@daily"


def test_ingest_dag_tags():
    """Test ingest DAG has correct tags."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    dag = dagbag.get_dag("worldcup_ingest")

    assert "soccer" in dag.tags
    assert "worldcup" in dag.tags
    assert "ingest" in dag.tags
    assert "etl" in dag.tags
