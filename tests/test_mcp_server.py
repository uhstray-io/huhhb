import pytest
from uhh_memory.mcp_server import handle_tool_call, TOOLS

def test_all_tools_registered():
    expected = {
        "uhh_status", "uhh_list_wings", "uhh_add_drawer",
        "uhh_get_drawers", "uhh_delete_drawer", "uhh_search",
        "uhh_wake_up", "uhh_mine_text", "uhh_list_rooms", "uhh_get_drawer"
    }
    assert expected == set(TOOLS.keys())

def test_uhh_status_returns_counts(nexus):
    nexus.add_drawer(wing="work", room="auth", content="content")
    result = handle_tool_call("uhh_status", {}, nexus=nexus)
    assert result["drawer_count"] == 1
    assert result["wing_count"] == 1

def test_uhh_add_drawer_creates_drawer(nexus):
    result = handle_tool_call("uhh_add_drawer", {"wing": "work", "room": "auth", "content": "hello"}, nexus=nexus)
    assert "drawer_id" in result
    assert result["drawer_id"].startswith("work_auth_")

def test_uhh_search_returns_relevant(nexus):
    nexus.add_drawer(wing="work", room="api", content="FastAPI endpoint for user registration")
    result = handle_tool_call("uhh_search", {"query": "user registration api", "n_results": 3}, nexus=nexus)
    assert "results" in result
    assert len(result["results"]) >= 1

def test_uhh_list_wings(nexus):
    nexus.add_drawer(wing="work", room="auth", content="a")
    nexus.add_drawer(wing="personal", room="notes", content="b")
    result = handle_tool_call("uhh_list_wings", {}, nexus=nexus)
    assert "work" in result["wings"]
    assert "personal" in result["wings"]

def test_unknown_tool_raises(nexus):
    with pytest.raises(KeyError):
        handle_tool_call("uhh_nonexistent", {}, nexus=nexus)
