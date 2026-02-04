"""Tests for the soccer semantics refresh DAG."""

from airflow.models import DagBag


def test_semantics_dag_loaded():
    """Test that semantics DAG loads without errors."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    assert "soccer_semantics_refresh" in dagbag.dags
    assert len(dagbag.import_errors) == 0


def test_semantics_dag_structure():
    """Test semantics DAG has expected tasks."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    dag = dagbag.get_dag("soccer_semantics_refresh")

    task_ids = [task.task_id for task in dag.tasks]

    # Check core semantic tasks exist
    assert "extract_players" in task_ids
    assert "build_player_aliases" in task_ids
    assert "build_pitch_zones" in task_ids
    assert "build_event_synonyms" in task_ids
    assert "summarize_semantics" in task_ids


def test_semantics_dag_tags():
    """Test semantics DAG has correct tags."""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    dag = dagbag.get_dag("soccer_semantics_refresh")

    assert "soccer" in dag.tags
    assert "semantics" in dag.tags
    assert "data-aware" in dag.tags
