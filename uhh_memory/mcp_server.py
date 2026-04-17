import json
import sys
from uhh_memory.palace import Palace
from uhh_memory.miner import chunk_text
from uhh_memory.layers import assemble_context
from uhh_memory.config import load_config

TOOLS: dict[str, dict] = {
    "uhh_status": {
        "description": "Get uhh:memory palace stats — drawer count, wing count, total size.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    "uhh_list_wings": {
        "description": "List all wings (top-level categories) in the memory palace.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    "uhh_add_drawer": {
        "description": "Add verbatim text as a drawer to the memory palace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "wing": {"type": "string"},
                "room": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["wing", "room", "content"],
        },
    },
    "uhh_get_drawers": {
        "description": "Retrieve all drawers for a wing, optionally filtered by room.",
        "input_schema": {
            "type": "object",
            "properties": {
                "wing": {"type": "string"},
                "room": {"type": "string"},
            },
            "required": ["wing"],
        },
    },
    "uhh_get_drawer": {
        "description": "Retrieve a single drawer by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {"drawer_id": {"type": "string"}},
            "required": ["drawer_id"],
        },
    },
    "uhh_delete_drawer": {
        "description": "Remove a drawer from the palace by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {"drawer_id": {"type": "string"}},
            "required": ["drawer_id"],
        },
    },
    "uhh_search": {
        "description": "Semantic search across the palace. Returns most relevant drawers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "wing": {"type": "string"},
                "n_results": {"type": "integer"},
            },
            "required": ["query"],
        },
    },
    "uhh_wake_up": {
        "description": "Get L0 identity + L1 recent context for session start. Call at conversation start.",
        "input_schema": {
            "type": "object",
            "properties": {"wing": {"type": "string"}},
            "required": [],
        },
    },
    "uhh_mine_text": {
        "description": "Ingest raw text directly into the palace — splits into drawers automatically.",
        "input_schema": {
            "type": "object",
            "properties": {
                "wing": {"type": "string"},
                "room": {"type": "string"},
                "text": {"type": "string"},
            },
            "required": ["wing", "room", "text"],
        },
    },
    "uhh_list_rooms": {
        "description": "List all rooms within a specific wing.",
        "input_schema": {
            "type": "object",
            "properties": {"wing": {"type": "string"}},
            "required": ["wing"],
        },
    },
}


def handle_tool_call(name: str, args: dict, *, palace: Palace) -> dict:
    if name not in TOOLS:
        raise KeyError(f"Unknown tool: {name}")

    if name == "uhh_status":
        return {"drawer_count": palace.count(), "wing_count": len(palace.list_wings()), "wings": palace.list_wings()}

    if name == "uhh_list_wings":
        return {"wings": palace.list_wings()}

    if name == "uhh_add_drawer":
        drawer_id = palace.add_drawer(wing=args["wing"], room=args["room"], content=args["content"])
        return {"drawer_id": drawer_id, "ok": True}

    if name == "uhh_get_drawers":
        drawers = palace.get_drawers(wing=args["wing"], room=args.get("room"))
        return {"drawers": drawers, "count": len(drawers)}

    if name == "uhh_get_drawer":
        result = palace._storage.get(ids=[args["drawer_id"]])
        if not result["ids"]:
            return {"error": "not found"}
        return {"id": result["ids"][0], "content": result["documents"][0], **(result["metadatas"][0] or {})}

    if name == "uhh_delete_drawer":
        palace.delete_drawer(drawer_id=args["drawer_id"])
        return {"ok": True}

    if name == "uhh_search":
        results = palace.search(query=args["query"], wing=args.get("wing"), n_results=args.get("n_results", 5))
        return {"results": results, "count": len(results)}

    if name == "uhh_wake_up":
        ctx = assemble_context(palace=palace, wing=args.get("wing"))
        return {"l0": ctx["l0"], "l1": ctx["l1"], "total_drawers": ctx["total_drawers"]}

    if name == "uhh_mine_text":
        chunks = chunk_text(args["text"])
        ids = [palace.add_drawer(wing=args["wing"], room=args["room"], content=c) for c in chunks]
        return {"drawers_created": len(ids), "ids": ids}

    if name == "uhh_list_rooms":
        drawers = palace.get_drawers(wing=args["wing"])
        rooms = sorted({d["room"] for d in drawers if "room" in d})
        return {"wing": args["wing"], "rooms": rooms}

    raise KeyError(f"Handler missing for tool: {name}")


def run_stdio_server() -> None:
    cfg = load_config()
    palace = Palace(palace_path=cfg["palace_path"])

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            method = req.get("method", "")
            req_id = req.get("id")

            if method == "initialize":
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {"name": "uhh-memory", "version": "0.1.0"}}}
            elif method == "tools/list":
                tools_list = [{"name": n, "description": t["description"], "inputSchema": t["input_schema"]} for n, t in TOOLS.items()]
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools_list}}
            elif method == "tools/call":
                name = req["params"]["name"]
                args = req["params"].get("arguments", {})
                result = handle_tool_call(name, args, palace=palace)
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result)}]}}
            else:
                resp = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}
        except Exception as exc:
            resp = {"jsonrpc": "2.0", "id": req.get("id"), "error": {"code": -32603, "message": str(exc)}}

        print(json.dumps(resp), flush=True)


if __name__ == "__main__":
    run_stdio_server()
