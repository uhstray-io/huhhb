"""Extra MCP server tests covering previously uncovered tool handlers and stdio server."""
import json
import io
import pytest
from uhh_memory.mcp_server import handle_tool_call, run_stdio_server, TOOLS


def test_uhh_get_drawers(palace):
    palace.add_drawer(wing="work", room="auth", content="auth content")
    palace.add_drawer(wing="work", room="billing", content="billing content")
    result = handle_tool_call("uhh_get_drawers", {"wing": "work"}, palace=palace)
    assert "drawers" in result
    assert result["count"] == 2


def test_uhh_get_drawers_filtered_by_room(palace):
    palace.add_drawer(wing="work", room="auth", content="auth content")
    palace.add_drawer(wing="work", room="billing", content="billing content")
    result = handle_tool_call("uhh_get_drawers", {"wing": "work", "room": "auth"}, palace=palace)
    assert result["count"] == 1
    assert result["drawers"][0]["room"] == "auth"


def test_uhh_get_drawer_found(palace):
    drawer_id = palace.add_drawer(wing="work", room="auth", content="specific content")
    result = handle_tool_call("uhh_get_drawer", {"drawer_id": drawer_id}, palace=palace)
    assert result["id"] == drawer_id
    assert result["content"] == "specific content"


def test_uhh_get_drawer_not_found(palace):
    result = handle_tool_call("uhh_get_drawer", {"drawer_id": "nonexistent_id"}, palace=palace)
    assert "error" in result
    assert result["error"] == "not found"


def test_uhh_delete_drawer(palace):
    drawer_id = palace.add_drawer(wing="work", room="auth", content="to delete")
    result = handle_tool_call("uhh_delete_drawer", {"drawer_id": drawer_id}, palace=palace)
    assert result["ok"] is True
    assert palace.count() == 0


def test_uhh_wake_up(palace):
    palace.add_drawer(wing="work", room="auth", content="some context")
    result = handle_tool_call("uhh_wake_up", {}, palace=palace)
    assert "l0" in result
    assert "l1" in result
    assert "total_drawers" in result


def test_uhh_wake_up_with_wing(palace):
    palace.add_drawer(wing="work", room="auth", content="work content")
    palace.add_drawer(wing="personal", room="notes", content="personal content")
    result = handle_tool_call("uhh_wake_up", {"wing": "work"}, palace=palace)
    assert "l0" in result
    assert result["total_drawers"] == 2


def test_uhh_mine_text(palace):
    text = "First chunk of text here.\n\nSecond chunk of text here."
    result = handle_tool_call("uhh_mine_text", {"wing": "work", "room": "docs", "text": text}, palace=palace)
    assert "drawers_created" in result
    assert result["drawers_created"] >= 1
    assert len(result["ids"]) == result["drawers_created"]


def test_uhh_list_rooms(palace):
    palace.add_drawer(wing="work", room="auth", content="auth")
    palace.add_drawer(wing="work", room="billing", content="billing")
    palace.add_drawer(wing="work", room="auth", content="auth2")
    result = handle_tool_call("uhh_list_rooms", {"wing": "work"}, palace=palace)
    assert "rooms" in result
    assert "auth" in result["rooms"]
    assert "billing" in result["rooms"]
    assert result["rooms"] == sorted(result["rooms"])


def test_uhh_list_rooms_empty_wing(palace):
    result = handle_tool_call("uhh_list_rooms", {"wing": "nonexistent"}, palace=palace)
    assert result["rooms"] == []


def test_stdio_server_initialize(palace, monkeypatch, capsys):
    req = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1"}
        }
    })
    import sys
    import io
    monkeypatch.setattr("sys.stdin", io.StringIO(req + "\n"))
    monkeypatch.setattr("uhh_memory.mcp_server.load_config", lambda: {
        "palace_path": str(palace._path),
        "collection_name": "uhh_memory",
    })
    # Patch Palace constructor to return our existing palace
    import uhh_memory.mcp_server as mcp_mod
    monkeypatch.setattr(mcp_mod, "Palace", lambda palace_path: palace)
    captured_output = []
    original_print = print
    def fake_print(msg, flush=False):
        captured_output.append(msg)
    monkeypatch.setattr("builtins.print", fake_print)
    run_stdio_server()
    assert len(captured_output) == 1
    resp = json.loads(captured_output[0])
    assert resp["result"]["serverInfo"]["name"] == "uhh-memory"


def test_stdio_server_tools_list(palace, monkeypatch):
    req = json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
    import sys, io
    import uhh_memory.mcp_server as mcp_mod
    monkeypatch.setattr("sys.stdin", io.StringIO(req + "\n"))
    monkeypatch.setattr(mcp_mod, "load_config", lambda: {"palace_path": str(palace._path), "collection_name": "uhh_memory"})
    monkeypatch.setattr(mcp_mod, "Palace", lambda palace_path: palace)
    captured_output = []
    monkeypatch.setattr("builtins.print", lambda msg, flush=False: captured_output.append(msg))
    run_stdio_server()
    resp = json.loads(captured_output[0])
    assert "tools" in resp["result"]
    assert len(resp["result"]["tools"]) == len(TOOLS)


def test_stdio_server_tools_call(palace, monkeypatch):
    req = json.dumps({
        "jsonrpc": "2.0", "id": 3, "method": "tools/call",
        "params": {"name": "uhh_status", "arguments": {}}
    })
    import sys, io
    import uhh_memory.mcp_server as mcp_mod
    monkeypatch.setattr("sys.stdin", io.StringIO(req + "\n"))
    monkeypatch.setattr(mcp_mod, "load_config", lambda: {"palace_path": str(palace._path), "collection_name": "uhh_memory"})
    monkeypatch.setattr(mcp_mod, "Palace", lambda palace_path: palace)
    captured_output = []
    monkeypatch.setattr("builtins.print", lambda msg, flush=False: captured_output.append(msg))
    run_stdio_server()
    resp = json.loads(captured_output[0])
    assert resp["result"]["content"][0]["type"] == "text"


def test_stdio_server_unknown_method(palace, monkeypatch):
    req = json.dumps({"jsonrpc": "2.0", "id": 4, "method": "unknown/method", "params": {}})
    import sys, io
    import uhh_memory.mcp_server as mcp_mod
    monkeypatch.setattr("sys.stdin", io.StringIO(req + "\n"))
    monkeypatch.setattr(mcp_mod, "load_config", lambda: {"palace_path": str(palace._path), "collection_name": "uhh_memory"})
    monkeypatch.setattr(mcp_mod, "Palace", lambda palace_path: palace)
    captured_output = []
    monkeypatch.setattr("builtins.print", lambda msg, flush=False: captured_output.append(msg))
    run_stdio_server()
    resp = json.loads(captured_output[0])
    assert "error" in resp


def test_stdio_server_empty_lines_skipped(palace, monkeypatch):
    import sys, io
    import uhh_memory.mcp_server as mcp_mod
    monkeypatch.setattr("sys.stdin", io.StringIO("\n   \n"))
    monkeypatch.setattr(mcp_mod, "load_config", lambda: {"palace_path": str(palace._path), "collection_name": "uhh_memory"})
    monkeypatch.setattr(mcp_mod, "Palace", lambda palace_path: palace)
    captured_output = []
    monkeypatch.setattr("builtins.print", lambda msg, flush=False: captured_output.append(msg))
    run_stdio_server()
    assert captured_output == []


def test_stdio_server_invalid_json(palace, monkeypatch):
    import sys, io
    import uhh_memory.mcp_server as mcp_mod
    monkeypatch.setattr("sys.stdin", io.StringIO("not valid json\n"))
    monkeypatch.setattr(mcp_mod, "load_config", lambda: {"palace_path": str(palace._path), "collection_name": "uhh_memory"})
    monkeypatch.setattr(mcp_mod, "Palace", lambda palace_path: palace)
    captured_output = []
    monkeypatch.setattr("builtins.print", lambda msg, flush=False: captured_output.append(msg))
    run_stdio_server()
    resp = json.loads(captured_output[0])
    assert "error" in resp
