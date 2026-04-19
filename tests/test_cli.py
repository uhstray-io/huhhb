"""CLI smoke tests using Click's test runner."""
import pytest
from click.testing import CliRunner
from memory.cli import main


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def nexus_dir(tmp_path):
    return str(tmp_path / "nexus")


def test_cli_help(runner):
    result = runner.invoke(main, ["--help"])
    assert result.exit_code == 0
    assert "memory" in result.output.lower() or "uhh" in result.output.lower()


def test_cli_init(runner, nexus_dir):
    result = runner.invoke(main, ["init", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "initialized" in result.output.lower() or "nexus" in result.output.lower()


def test_cli_init_default_path(runner, tmp_path, monkeypatch):
    monkeypatch.setenv("MEMORY_NEXUS_PATH", str(tmp_path / "default_nexus"))
    result = runner.invoke(main, ["init"])
    assert result.exit_code == 0


def test_cli_status_empty(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["status", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "Drawers" in result.output


def test_cli_status_wings(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["status", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "Wings" in result.output


def test_cli_mine(runner, nexus_dir, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "notes.txt").write_text("Some important project notes here.\n\nMore details below.")
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["mine", str(src), "--wing", "work", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "mined" in result.output.lower() or "drawer" in result.output.lower()


def test_cli_search_no_results(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["search", "totally unique query xyz", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "No results" in result.output


def test_cli_search_with_results(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    import tempfile, os
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "api.txt"), "w") as f:
            f.write("FastAPI endpoint for user authentication and registration.")
        runner.invoke(main, ["mine", d, "--wing", "work", "--nexus", nexus_dir])
    result = runner.invoke(main, ["search", "authentication", "--nexus", nexus_dir, "--results", "3"])
    assert result.exit_code == 0


def test_cli_search_with_wing_filter(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["search", "query", "--wing", "work", "--nexus", nexus_dir])
    assert result.exit_code == 0


def test_cli_wake_up(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["wake-up", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "L0" in result.output


def test_cli_wake_up_with_wing(runner, nexus_dir):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    result = runner.invoke(main, ["wake-up", "--wing", "work", "--nexus", nexus_dir])
    assert result.exit_code == 0
    assert "L0" in result.output


def test_cli_wake_up_with_drawers(runner, nexus_dir, tmp_path):
    runner.invoke(main, ["init", "--nexus", nexus_dir])
    src = tmp_path / "src2"
    src.mkdir()
    (src / "notes.txt").write_text("Project architecture notes.\n\nUses microservices pattern.")
    runner.invoke(main, ["mine", str(src), "--wing", "work", "--nexus", nexus_dir])
    result = runner.invoke(main, ["wake-up", "--nexus", nexus_dir])
    assert result.exit_code == 0
