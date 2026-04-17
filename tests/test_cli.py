"""CLI smoke tests using Click's test runner."""
import pytest
from click.testing import CliRunner
from uhh_memory.cli import main


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def palace_dir(tmp_path):
    return str(tmp_path / "palace")


def test_cli_help(runner):
    result = runner.invoke(main, ["--help"])
    assert result.exit_code == 0
    assert "memory" in result.output.lower() or "uhh" in result.output.lower()


def test_cli_init(runner, palace_dir):
    result = runner.invoke(main, ["init", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "initialized" in result.output.lower() or "palace" in result.output.lower()


def test_cli_init_default_path(runner, tmp_path, monkeypatch):
    monkeypatch.setenv("UHH_PALACE_PATH", str(tmp_path / "default_palace"))
    result = runner.invoke(main, ["init"])
    assert result.exit_code == 0


def test_cli_status_empty(runner, palace_dir):
    # init first so path exists
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["status", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "Drawers" in result.output


def test_cli_status_wings(runner, palace_dir):
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["status", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "Wings" in result.output


def test_cli_mine(runner, palace_dir, tmp_path):
    # Create a text file to mine
    src = tmp_path / "src"
    src.mkdir()
    (src / "notes.txt").write_text("Some important project notes here.\n\nMore details below.")
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["mine", str(src), "--wing", "work", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "mined" in result.output.lower() or "drawer" in result.output.lower()


def test_cli_search_no_results(runner, palace_dir):
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["search", "totally unique query xyz", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "No results" in result.output


def test_cli_search_with_results(runner, palace_dir):
    runner.invoke(main, ["init", "--palace", palace_dir])
    # Add something via mine
    import tempfile, os
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "api.txt"), "w") as f:
            f.write("FastAPI endpoint for user authentication and registration.")
        runner.invoke(main, ["mine", d, "--wing", "work", "--palace", palace_dir])
    result = runner.invoke(main, ["search", "authentication", "--palace", palace_dir, "--results", "3"])
    assert result.exit_code == 0


def test_cli_search_with_wing_filter(runner, palace_dir):
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["search", "query", "--wing", "work", "--palace", palace_dir])
    assert result.exit_code == 0


def test_cli_wake_up(runner, palace_dir):
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["wake-up", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "L0" in result.output


def test_cli_wake_up_with_wing(runner, palace_dir):
    runner.invoke(main, ["init", "--palace", palace_dir])
    result = runner.invoke(main, ["wake-up", "--wing", "work", "--palace", palace_dir])
    assert result.exit_code == 0
    assert "L0" in result.output


def test_cli_wake_up_with_drawers(runner, palace_dir, tmp_path):
    runner.invoke(main, ["init", "--palace", palace_dir])
    src = tmp_path / "src2"
    src.mkdir()
    (src / "notes.txt").write_text("Project architecture notes.\n\nUses microservices pattern.")
    runner.invoke(main, ["mine", str(src), "--wing", "work", "--palace", palace_dir])
    result = runner.invoke(main, ["wake-up", "--palace", palace_dir])
    assert result.exit_code == 0
