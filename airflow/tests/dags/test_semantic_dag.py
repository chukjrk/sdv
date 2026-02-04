from airflow.models import DagBag


def test_dag_loaded():
    """Test that DAG loads without errors"""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    assert "canonical_soccer_semantics" in dagbag.dags
    assert len(dagbag.import_errors) == 0


def test_dag_structure():
    """Test DAG task dependencies"""
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    dag = dagbag.get_dag("canonical_soccer_semantics")

    assert len(dag.tasks) == 5
