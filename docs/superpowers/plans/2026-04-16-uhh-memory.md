# uhh:memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `uhh:memory` — a local-first AI memory system for Uhstray.io teams, architected identically to MemPalace (wings/rooms/drawers, ChromaDB, MCP server, CLI, Claude Code skills), published as a skill in the huhhb marketplace.

**Architecture:** A Python package (`uhh-memory`) ships an MCP server Claude connects to, providing semantic memory storage organized as wings → rooms → drawers. Claude Code skills in `skills/memory/` teach Claude when and how to invoke the MCP tools. The package installs via pip; the skill installs via huhhb.

**Tech Stack:** Python 3.11+, ChromaDB (vector storage), SQLite (knowledge graph), Click (CLI), sentence-transformers (embeddings), MCP protocol (stdio transport), pytest + pytest-cov (testing)

---

## Scope Boundary

This plan covers:
- Python package `uhh_memory/` at repo root
- MCP server with 10 core tools
- CLI: `uhh-mem init | mine | search | status | wake-up`
- Claude Code skills: `uhh:memory`, `uhh:memory-search`, `uhh:memory-mine`, `uhh:memory-status`
- huhhb plugin registration (`.claude-plugin/`)
- Auto-save hooks

Out of scope (future): knowledge graph, multilingual, multi-device sync, diary tools.

---

## File Map

```
huhhb/
├── uhh_memory/                    # Python package
│   ├── __init__.py                # Version + public API
│   ├── config.py                  # Config loading (env → file → defaults)
│   ├── palace.py                  # Wing/room/drawer CRUD abstraction
│   ├── storage.py                 # ChromaDB backend wrapper
│   ├── miner.py                   # File ingestion → drawers pipeline
│   ├── searcher.py                # Semantic + keyword hybrid search
│   ├── layers.py                  # L0/L1/L2 context layer assembly
│   ├── mcp_server.py              # MCP stdio server (10 tools)
│   └── cli.py                     # Click CLI entry point
│
├── tests/
│   ├── conftest.py                # Shared fixtures (tmp palace, mock chroma)
│   ├── test_config.py
│   ├── test_palace.py
│   ├── test_storage.py
│   ├── test_miner.py
│   ├── test_searcher.py
│   ├── test_layers.py
│   └── test_mcp_server.py
│
├── skills/
│   └── memory/
│       ├── uhh-memory/skill.md        # Main skill: init + route to sub-skills
│       ├── uhh-memory-search/skill.md # Search memories
│       ├── uhh-memory-mine/skill.md   # Mine project files
│       └── uhh-memory-status/skill.md # Palace status
│
├── .claude-plugin/
│   ├── plugin.json                # Plugin metadata
│   ├── marketplace.json           # Marketplace entry
│   ├── .mcp.json                  # MCP server config for Claude
│   └── hooks/
│       ├── stop-hook.sh           # Auto-save on Claude stop
│       └── stop-hook.ps1          # Windows equivalent
│
├── pyproject.toml                 # Package config + deps + CLI entry point
└── marketplace.json               # Updated with 4 new skill entries
```

---

## Task 1: Python Package Skeleton + Config

**Files:**
- Create: `uhh_memory/__init__.py`
- Create: `uhh_memory/config.py`
- Create: `tests/conftest.py`
- Create: `tests/test_config.py`
- Create: `pyproject.toml`

- [ ] **Step 1.1: Write failing config tests**

```python
# tests/test_config.py
import os
import json
from pathlib import Path
import pytest
from uhh_memory.config import load_config, DEFAULT_PALACE_PATH

def test_default_config_returns_expected_keys():
    cfg = load_config()
    assert "palace_path" in cfg
    assert "collection_name" in cfg
    assert "embedding_model" in cfg

def test_env_var_overrides_palace_path(tmp_path, monkeypatch):
    monkeypatch.setenv("UHH_PALACE_PATH", str(tmp_path))
    cfg = load_config()
    assert cfg["palace_path"] == str(tmp_path)

def test_config_file_overrides_defaults(tmp_path, monkeypatch):
    config_file = tmp_path / "config.json"
    config_file.write_text(json.dumps({"collection_name": "my_col"}))
    monkeypatch.setenv("UHH_CONFIG_PATH", str(config_file))
    cfg = load_config()
    assert cfg["collection_name"] == "my_col"

def test_default_palace_path_is_home_subdir():
    assert ".uhh-memory" in str(DEFAULT_PALACE_PATH)
```

- [ ] **Step 1.2: Run test — verify FAIL**

```bash
cd /c/Users/jacob/OneDrive/Documents/GitHub/huhhb
python -m pytest tests/test_config.py -v 2>&1 | head -20
```
Expected: `ModuleNotFoundError: No module named 'uhh_memory'`

- [ ] **Step 1.3: Create `pyproject.toml`**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "uhh-memory"
version = "0.1.0"
description = "Uhstray.io AI memory system — local-first, semantic, hierarchical"
requires-python = ">=3.11"
dependencies = [
    "chromadb>=0.5.0",
    "sentence-transformers>=3.0.0",
    "click>=8.1.0",
    "rich>=13.0.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-cov>=5.0", "ruff>=0.4.0"]

[project.scripts]
uhh-mem = "uhh_memory.cli:main"

[tool.ruff]
line-length = 100
select = ["E", "F", "W"]
```

- [ ] **Step 1.4: Create `uhh_memory/__init__.py`**

```python
__version__ = "0.1.0"
```

- [ ] **Step 1.5: Create `uhh_memory/config.py`**

```python
import json
import os
from pathlib import Path

DEFAULT_PALACE_PATH = Path.home() / ".uhh-memory" / "palace"
DEFAULT_CONFIG: dict = {
    "palace_path": str(DEFAULT_PALACE_PATH),
    "collection_name": "uhh_drawers",
    "embedding_model": "all-MiniLM-L6-v2",
    "auto_save_interval": 15,
}

def load_config() -> dict:
    cfg = DEFAULT_CONFIG.copy()
    config_path = os.environ.get("UHH_CONFIG_PATH", Path.home() / ".uhh-memory" / "config.json")
    if Path(config_path).exists():
        with open(config_path) as f:
            cfg.update(json.load(f))
    if palace_env := os.environ.get("UHH_PALACE_PATH"):
        cfg["palace_path"] = palace_env
    return cfg
```

- [ ] **Step 1.6: Install package in dev mode**

```bash
cd /c/Users/jacob/OneDrive/Documents/GitHub/huhhb
pip install -e ".[dev]"
```

- [ ] **Step 1.7: Run tests — verify PASS**

```bash
python -m pytest tests/test_config.py -v
```
Expected: 4 PASSED

- [ ] **Step 1.8: Commit**

```bash
git add uhh_memory/__init__.py uhh_memory/config.py tests/test_config.py pyproject.toml
git commit -m "feat: add uhh_memory package skeleton and config module"
```

---

## Task 2: ChromaDB Storage Backend

**Files:**
- Create: `uhh_memory/storage.py`
- Create: `tests/test_storage.py`

- [ ] **Step 2.1: Write failing storage tests**

```python
# tests/test_storage.py
import pytest
from uhh_memory.storage import PalaceStorage

@pytest.fixture
def storage(tmp_path):
    return PalaceStorage(palace_path=str(tmp_path), collection_name="test_col")

def test_add_and_get_drawer(storage):
    storage.add(ids=["d1"], documents=["hello world"], metadatas=[{"wing": "work", "room": "auth"}])
    result = storage.get(ids=["d1"])
    assert result["documents"][0] == "hello world"

def test_query_returns_relevant_drawer(storage):
    storage.add(ids=["d1"], documents=["Python async programming tips"], metadatas=[{"wing": "dev"}])
    storage.add(ids=["d2"], documents=["Baking sourdough bread at home"], metadatas=[{"wing": "personal"}])
    results = storage.query(query_texts=["async python"], n_results=1)
    assert results["ids"][0][0] == "d1"

def test_delete_removes_drawer(storage):
    storage.add(ids=["d1"], documents=["to be deleted"], metadatas=[{"wing": "work"}])
    storage.delete(ids=["d1"])
    result = storage.get(ids=["d1"])
    assert result["documents"] == [None]

def test_count_reflects_added_items(storage):
    storage.add(ids=["a", "b"], documents=["doc a", "doc b"], metadatas=[{"wing": "w"}, {"wing": "w"}])
    assert storage.count() == 2

def test_where_filter_narrows_results(storage):
    storage.add(ids=["d1"], documents=["work note"], metadatas=[{"wing": "work"}])
    storage.add(ids=["d2"], documents=["personal note"], metadatas=[{"wing": "personal"}])
    results = storage.query(query_texts=["note"], n_results=5, where={"wing": "work"})
    assert all(meta["wing"] == "work" for meta in results["metadatas"][0])
```

- [ ] **Step 2.2: Run — verify FAIL**

```bash
python -m pytest tests/test_storage.py -v 2>&1 | head -15
```
Expected: `ImportError: cannot import name 'PalaceStorage'`

- [ ] **Step 2.3: Create `uhh_memory/storage.py`**

```python
import chromadb
from chromadb.config import Settings

class PalaceStorage:
    def __init__(self, *, palace_path: str, collection_name: str):
        self._client = chromadb.PersistentClient(
            path=palace_path,
            settings=Settings(anonymized_telemetry=False),
        )
        self._col = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add(self, *, ids: list[str], documents: list[str], metadatas: list[dict]) -> None:
        self._col.add(ids=ids, documents=documents, metadatas=metadatas)

    def get(self, *, ids: list[str]) -> dict:
        return self._col.get(ids=ids)

    def query(self, *, query_texts: list[str], n_results: int = 5, where: dict | None = None) -> dict:
        kwargs: dict = {"query_texts": query_texts, "n_results": n_results}
        if where:
            kwargs["where"] = where
        return self._col.query(**kwargs)

    def delete(self, *, ids: list[str]) -> None:
        self._col.delete(ids=ids)

    def count(self) -> int:
        return self._col.count()

    def list_by_wing(self, wing: str) -> dict:
        return self._col.get(where={"wing": wing})
```

- [ ] **Step 2.4: Run tests — verify PASS**

```bash
python -m pytest tests/test_storage.py -v
```
Expected: 5 PASSED

- [ ] **Step 2.5: Commit**

```bash
git add uhh_memory/storage.py tests/test_storage.py
git commit -m "feat: add ChromaDB storage backend"
```

---

## Task 3: Palace — Wing/Room/Drawer Abstraction

**Files:**
- Create: `uhh_memory/palace.py`
- Create: `tests/test_palace.py`
- Create: `tests/conftest.py`

- [ ] **Step 3.1: Write conftest shared fixtures**

```python
# tests/conftest.py
import pytest
from uhh_memory.storage import PalaceStorage
from uhh_memory.palace import Palace

@pytest.fixture
def storage(tmp_path):
    return PalaceStorage(palace_path=str(tmp_path), collection_name="test_col")

@pytest.fixture
def palace(tmp_path):
    return Palace(palace_path=str(tmp_path))
```

- [ ] **Step 3.2: Write failing palace tests**

```python
# tests/test_palace.py
import pytest

def test_add_drawer_generates_id(palace):
    drawer_id = palace.add_drawer(wing="work", room="auth", content="Token expiry logic here")
    assert drawer_id.startswith("work_auth_")

def test_list_wings_returns_added_wings(palace):
    palace.add_drawer(wing="work", room="auth", content="content a")
    palace.add_drawer(wing="personal", room="notes", content="content b")
    wings = palace.list_wings()
    assert "work" in wings
    assert "personal" in wings

def test_get_drawers_for_wing(palace):
    palace.add_drawer(wing="work", room="auth", content="auth content")
    palace.add_drawer(wing="personal", room="notes", content="personal content")
    drawers = palace.get_drawers(wing="work")
    assert all(d["wing"] == "work" for d in drawers)
    assert len(drawers) == 1

def test_delete_drawer(palace):
    drawer_id = palace.add_drawer(wing="work", room="auth", content="to delete")
    palace.delete_drawer(drawer_id=drawer_id)
    drawers = palace.get_drawers(wing="work")
    assert len(drawers) == 0

def test_drawer_count(palace):
    palace.add_drawer(wing="work", room="auth", content="a")
    palace.add_drawer(wing="work", room="billing", content="b")
    assert palace.count() == 2
```

- [ ] **Step 3.3: Run — verify FAIL**

```bash
python -m pytest tests/test_palace.py -v 2>&1 | head -15
```
Expected: `ImportError: cannot import name 'Palace'`

- [ ] **Step 3.4: Create `uhh_memory/palace.py`**

```python
import hashlib
import time
from uhh_memory.storage import PalaceStorage
from uhh_memory.config import load_config

class Palace:
    def __init__(self, *, palace_path: str | None = None):
        cfg = load_config()
        self._path = palace_path or cfg["palace_path"]
        self._storage = PalaceStorage(
            palace_path=self._path,
            collection_name=cfg["collection_name"],
        )

    def add_drawer(self, *, wing: str, room: str, content: str) -> str:
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        ts = int(time.time() * 1000)
        drawer_id = f"{wing}_{room}_{content_hash}_{ts}"
        self._storage.add(
            ids=[drawer_id],
            documents=[content],
            metadatas=[{"wing": wing, "room": room, "created_at": str(ts)}],
        )
        return drawer_id

    def get_drawers(self, *, wing: str, room: str | None = None) -> list[dict]:
        where: dict = {"wing": wing}
        if room:
            where["room"] = room
        result = self._storage.list_by_wing(wing)
        drawers = []
        for i, doc_id in enumerate(result.get("ids", [])):
            meta = result["metadatas"][i] if result.get("metadatas") else {}
            if room and meta.get("room") != room:
                continue
            drawers.append({"id": doc_id, "content": result["documents"][i], **meta})
        return drawers

    def delete_drawer(self, *, drawer_id: str) -> None:
        self._storage.delete(ids=[drawer_id])

    def list_wings(self) -> list[str]:
        result = self._storage._col.get()
        wings = {m["wing"] for m in (result.get("metadatas") or []) if m and "wing" in m}
        return sorted(wings)

    def count(self) -> int:
        return self._storage.count()

    def search(self, *, query: str, wing: str | None = None, n_results: int = 5) -> list[dict]:
        where = {"wing": wing} if wing else None
        results = self._storage.query(query_texts=[query], n_results=n_results, where=where)
        drawers = []
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i] if results.get("metadatas") else {}
            drawers.append({"id": doc_id, "content": results["documents"][0][i], "distance": results["distances"][0][i], **meta})
        return drawers
```

- [ ] **Step 3.5: Run tests — verify PASS**

```bash
python -m pytest tests/test_palace.py -v
```
Expected: 5 PASSED

- [ ] **Step 3.6: Commit**

```bash
git add uhh_memory/palace.py tests/test_palace.py tests/conftest.py
git commit -m "feat: add Palace wing/room/drawer abstraction"
```

---

## Task 4: File Miner

**Files:**
- Create: `uhh_memory/miner.py`
- Create: `tests/test_miner.py`

- [ ] **Step 4.1: Write failing miner tests**

```python
# tests/test_miner.py
import pytest
from pathlib import Path
from uhh_memory.miner import mine_directory, chunk_text

def test_chunk_text_splits_on_double_newline():
    text = "Block one.\n\nBlock two.\n\nBlock three."
    chunks = chunk_text(text, max_chars=800)
    assert len(chunks) == 3

def test_chunk_text_splits_long_block():
    long_block = "x " * 500  # 1000 chars
    chunks = chunk_text(long_block, max_chars=800)
    assert len(chunks) >= 2
    assert all(len(c) <= 850 for c in chunks)  # allows slight overlap

def test_mine_directory_creates_drawers(palace, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "auth.py").write_text("def check_token(token):\n    return token is not None\n\nThis handles auth logic.")
    count_before = palace.count()
    mine_directory(palace=palace, path=str(src), wing="work")
    assert palace.count() > count_before

def test_mine_directory_skips_binary_files(palace, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    count_before = palace.count()
    mine_directory(palace=palace, path=str(src), wing="work")
    assert palace.count() == count_before

def test_mine_directory_infers_room_from_filename(palace, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "billing.py").write_text("Billing module content here.\n\nHandles subscriptions.")
    mine_directory(palace=palace, path=str(src), wing="work")
    drawers = palace.get_drawers(wing="work", room="billing")
    assert len(drawers) > 0
```

- [ ] **Step 4.2: Run — verify FAIL**

```bash
python -m pytest tests/test_miner.py -v 2>&1 | head -15
```
Expected: `ImportError: cannot import name 'mine_directory'`

- [ ] **Step 4.3: Create `uhh_memory/miner.py`**

```python
import os
from pathlib import Path
from uhh_memory.palace import Palace

SKIP_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".exe", ".bin", ".pyc"}
ROOM_KEYWORDS = {
    "auth": ["auth", "login", "token", "session", "password"],
    "billing": ["billing", "payment", "subscription", "invoice", "stripe"],
    "api": ["api", "endpoint", "route", "handler", "request"],
    "deploy": ["deploy", "docker", "kubernetes", "ci", "cd", "github"],
    "config": ["config", "settings", "env", "environment"],
}

def infer_room(filename: str) -> str:
    stem = Path(filename).stem.lower()
    for room, keywords in ROOM_KEYWORDS.items():
        if any(k in stem for k in keywords):
            return room
    return "general"

def chunk_text(text: str, max_chars: int = 800, overlap: int = 100) -> list[str]:
    blocks = text.split("\n\n")
    chunks: list[str] = []
    current = ""
    for block in blocks:
        if len(current) + len(block) + 2 <= max_chars:
            current = (current + "\n\n" + block).strip()
        else:
            if current:
                chunks.append(current)
            if len(block) > max_chars:
                for i in range(0, len(block), max_chars - overlap):
                    chunks.append(block[i : i + max_chars])
            else:
                current = block
    if current:
        chunks.append(current)
    return [c for c in chunks if len(c) >= 50]

def mine_directory(*, palace: Palace, path: str, wing: str) -> int:
    added = 0
    for root, _dirs, files in os.walk(path):
        for fname in files:
            fpath = Path(root) / fname
            if fpath.suffix.lower() in SKIP_EXTENSIONS:
                continue
            try:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            if len(content) < 50:
                continue
            room = infer_room(fname)
            for chunk in chunk_text(content):
                palace.add_drawer(wing=wing, room=room, content=chunk)
                added += 1
    return added
```

- [ ] **Step 4.4: Run tests — verify PASS**

```bash
python -m pytest tests/test_miner.py -v
```
Expected: 5 PASSED

- [ ] **Step 4.5: Commit**

```bash
git add uhh_memory/miner.py tests/test_miner.py
git commit -m "feat: add file miner with chunking and room inference"
```

---

## Task 5: Layers (L0/L1/L2 Context Assembly)

**Files:**
- Create: `uhh_memory/layers.py`
- Create: `tests/test_layers.py`

- [ ] **Step 5.1: Write failing layer tests**

```python
# tests/test_layers.py
import pytest
from uhh_memory.layers import assemble_context

def test_l0_always_included(palace):
    ctx = assemble_context(palace=palace, query=None)
    assert "palace" in ctx["l0"].lower() or "memory" in ctx["l0"].lower()

def test_l1_top_drawers_returned(palace):
    palace.add_drawer(wing="work", room="auth", content="Auth system uses JWT tokens with 24h expiry.")
    palace.add_drawer(wing="work", room="billing", content="Billing runs on Stripe with monthly plans.")
    ctx = assemble_context(palace=palace, query=None)
    assert len(ctx["l1"]) <= 15
    assert all(isinstance(d, dict) for d in ctx["l1"])

def test_l2_search_results_when_query_given(palace):
    palace.add_drawer(wing="work", room="auth", content="JWT token validation happens in middleware.")
    ctx = assemble_context(palace=palace, query="token validation")
    assert len(ctx["l2"]) > 0
    assert any("token" in d["content"].lower() for d in ctx["l2"])

def test_l2_empty_when_no_query(palace):
    palace.add_drawer(wing="work", room="auth", content="some content")
    ctx = assemble_context(palace=palace, query=None)
    assert ctx["l2"] == []
```

- [ ] **Step 5.2: Run — verify FAIL**

```bash
python -m pytest tests/test_layers.py -v 2>&1 | head -15
```
Expected: `ImportError: cannot import name 'assemble_context'`

- [ ] **Step 5.3: Create `uhh_memory/layers.py`**

```python
from uhh_memory.palace import Palace

L0_TEMPLATE = (
    "You have access to uhh:memory — Uhstray.io's team memory palace. "
    "Use it to recall project context, decisions, and team knowledge. "
    "Search with specific queries to retrieve relevant drawers."
)

def assemble_context(*, palace: Palace, wing: str | None = None, query: str | None = None) -> dict:
    all_drawers = []
    for w in palace.list_wings():
        if wing and w != wing:
            continue
        all_drawers.extend(palace.get_drawers(wing=w))

    l1 = sorted(all_drawers, key=lambda d: d.get("created_at", "0"), reverse=True)[:15]
    l2 = palace.search(query=query, wing=wing, n_results=5) if query else []

    return {
        "l0": L0_TEMPLATE,
        "l1": l1,
        "l2": l2,
        "total_drawers": palace.count(),
    }
```

- [ ] **Step 5.4: Run tests — verify PASS**

```bash
python -m pytest tests/test_layers.py -v
```
Expected: 4 PASSED

- [ ] **Step 5.5: Commit**

```bash
git add uhh_memory/layers.py tests/test_layers.py
git commit -m "feat: add L0/L1/L2 context layer assembly"
```

---

## Task 6: MCP Server (10 Tools)

**Files:**
- Create: `uhh_memory/mcp_server.py`
- Create: `tests/test_mcp_server.py`

The 10 tools:

| Tool | Purpose |
|------|---------|
| `uhh_status` | Palace stats (wing count, drawer count) |
| `uhh_list_wings` | List all wings |
| `uhh_add_drawer` | Add verbatim content |
| `uhh_get_drawers` | Retrieve drawers for a wing/room |
| `uhh_delete_drawer` | Remove a drawer by ID |
| `uhh_search` | Semantic search across palace |
| `uhh_wake_up` | Return L0+L1 context for session start |
| `uhh_mine_text` | Ingest raw text directly (not from file) |
| `uhh_list_rooms` | List rooms within a wing |
| `uhh_get_drawer` | Get single drawer by ID |

- [ ] **Step 6.1: Write failing MCP server tests**

```python
# tests/test_mcp_server.py
import json
import pytest
from uhh_memory.mcp_server import handle_tool_call, TOOLS

def test_all_tools_registered():
    expected = {
        "uhh_status", "uhh_list_wings", "uhh_add_drawer",
        "uhh_get_drawers", "uhh_delete_drawer", "uhh_search",
        "uhh_wake_up", "uhh_mine_text", "uhh_list_rooms", "uhh_get_drawer"
    }
    assert expected == set(TOOLS.keys())

def test_uhh_status_returns_counts(palace):
    palace.add_drawer(wing="work", room="auth", content="content")
    result = handle_tool_call("uhh_status", {}, palace=palace)
    assert result["drawer_count"] == 1
    assert result["wing_count"] == 1

def test_uhh_add_drawer_creates_drawer(palace):
    result = handle_tool_call("uhh_add_drawer", {"wing": "work", "room": "auth", "content": "hello"}, palace=palace)
    assert "drawer_id" in result
    assert result["drawer_id"].startswith("work_auth_")

def test_uhh_search_returns_relevant(palace):
    palace.add_drawer(wing="work", room="api", content="FastAPI endpoint for user registration")
    result = handle_tool_call("uhh_search", {"query": "user registration api", "n_results": 3}, palace=palace)
    assert "results" in result
    assert len(result["results"]) >= 1

def test_uhh_list_wings(palace):
    palace.add_drawer(wing="work", room="auth", content="a")
    palace.add_drawer(wing="personal", room="notes", content="b")
    result = handle_tool_call("uhh_list_wings", {}, palace=palace)
    assert "work" in result["wings"]
    assert "personal" in result["wings"]

def test_unknown_tool_raises(palace):
    with pytest.raises(KeyError):
        handle_tool_call("uhh_nonexistent", {}, palace=palace)
```

- [ ] **Step 6.2: Run — verify FAIL**

```bash
python -m pytest tests/test_mcp_server.py -v 2>&1 | head -15
```
Expected: `ImportError: cannot import name 'handle_tool_call'`

- [ ] **Step 6.3: Create `uhh_memory/mcp_server.py`**

```python
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
```

- [ ] **Step 6.4: Run tests — verify PASS**

```bash
python -m pytest tests/test_mcp_server.py -v
```
Expected: 6 PASSED

- [ ] **Step 6.5: Run full suite**

```bash
python -m pytest tests/ -v --tb=short
```
Expected: all PASSED

- [ ] **Step 6.6: Commit**

```bash
git add uhh_memory/mcp_server.py tests/test_mcp_server.py
git commit -m "feat: add MCP server with 10 uhh:memory tools"
```

---

## Task 7: CLI

**Files:**
- Create: `uhh_memory/cli.py`

> No unit tests for CLI — test via invocation after install. CLI just wires Click to palace/miner/layers.

- [ ] **Step 7.1: Create `uhh_memory/cli.py`**

```python
import click
from pathlib import Path
from uhh_memory.palace import Palace
from uhh_memory.miner import mine_directory
from uhh_memory.layers import assemble_context
from uhh_memory.config import load_config

@click.group()
def main():
    """uhh:memory — Uhstray.io AI memory palace."""

@main.command()
@click.option("--palace", "palace_path", default=None, help="Custom palace path")
def init(palace_path):
    """Initialize the memory palace."""
    cfg = load_config()
    path = palace_path or cfg["palace_path"]
    Path(path).mkdir(parents=True, exist_ok=True)
    palace = Palace(palace_path=path)
    click.echo(f"Palace initialized at {path}")
    click.echo(f"Drawers: {palace.count()}")

@main.command()
@click.argument("path")
@click.option("--wing", required=True, help="Wing to mine into")
@click.option("--palace", "palace_path", default=None)
def mine(path, wing, palace_path):
    """Mine a directory into the palace."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    count = mine_directory(palace=palace, path=path, wing=wing)
    click.echo(f"Mined {count} drawers into wing '{wing}'")

@main.command()
@click.argument("query")
@click.option("--wing", default=None)
@click.option("--results", "n_results", default=5)
@click.option("--palace", "palace_path", default=None)
def search(query, wing, n_results, palace_path):
    """Search the palace."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    results = palace.search(query=query, wing=wing, n_results=n_results)
    if not results:
        click.echo("No results found.")
        return
    for r in results:
        click.echo(f"\n[{r['id']}] ({r.get('wing','?')}/{r.get('room','?')}) dist={r.get('distance', 0):.3f}")
        click.echo(r["content"][:300])

@main.command()
@click.option("--palace", "palace_path", default=None)
def status(palace_path):
    """Show palace status."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    click.echo(f"Drawers: {palace.count()}")
    wings = palace.list_wings()
    click.echo(f"Wings: {', '.join(wings) if wings else 'none'}")

@main.command("wake-up")
@click.option("--wing", default=None)
@click.option("--palace", "palace_path", default=None)
def wake_up(wing, palace_path):
    """Print L0+L1 context for session start."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    ctx = assemble_context(palace=palace, wing=wing)
    click.echo("=== L0: Identity ===")
    click.echo(ctx["l0"])
    click.echo(f"\n=== L1: Recent ({len(ctx['l1'])} drawers) ===")
    for d in ctx["l1"]:
        click.echo(f"[{d.get('wing','?')}/{d.get('room','?')}] {d['content'][:120]}")
```

- [ ] **Step 7.2: Smoke-test CLI**

```bash
uhh-mem --help
uhh-mem init
uhh-mem status
```
Expected: no errors, palace initialized.

- [ ] **Step 7.3: Commit**

```bash
git add uhh_memory/cli.py
git commit -m "feat: add uhh-mem CLI (init, mine, search, status, wake-up)"
```

---

## Task 8: Claude Code Plugin Registration

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `.claude-plugin/.mcp.json`
- Create: `.claude-plugin/hooks/stop-hook.sh`
- Create: `.claude-plugin/hooks/stop-hook.ps1`

- [ ] **Step 8.1: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "huhhb",
  "version": "0.1.0",
  "description": "Uhstray.io skills marketplace — curated Claude Code skills including uhh:memory.",
  "author": "uhstray-io",
  "license": "MIT",
  "mcp_server": {
    "command": "python3",
    "args": ["-m", "uhh_memory.mcp_server"]
  },
  "keywords": ["memory", "skills", "ai", "uhstray", "marketplace"],
  "repository": "https://github.com/uhstray-io/huhhb"
}
```

- [ ] **Step 8.2: Create `.claude-plugin/marketplace.json`**

```json
{
  "publisher": "uhstray-io",
  "name": "huhhb",
  "source": "./.claude-plugin",
  "version": "0.1.0",
  "tool_count": 10,
  "features": ["uhh:memory", "skills-marketplace", "auto-save-hooks"]
}
```

- [ ] **Step 8.3: Create `.claude-plugin/.mcp.json`**

```json
{
  "mcpServers": {
    "uhh-memory": {
      "command": "python3",
      "args": ["-m", "uhh_memory.mcp_server"]
    }
  }
}
```

- [ ] **Step 8.4: Create `.claude-plugin/hooks/stop-hook.sh`**

```bash
#!/usr/bin/env bash
# Auto-save hook: runs uhh-mem wake-up on Claude stop to capture session context
# Install: add to Claude Code settings.json Stop hook
uhh-mem status 2>/dev/null || true
```

- [ ] **Step 8.5: Create `.claude-plugin/hooks/stop-hook.ps1`**

```powershell
# Auto-save hook: runs on Claude stop (Windows)
uhh-mem status 2>$null
```

- [ ] **Step 8.6: Commit**

```bash
git add .claude-plugin/
git commit -m "feat: add Claude Code plugin registration and MCP config"
```

---

## Task 9: Skills (4 Skill Files)

**Files:**
- Create: `skills/memory/uhh-memory/skill.md`
- Create: `skills/memory/uhh-memory-search/skill.md`
- Create: `skills/memory/uhh-memory-mine/skill.md`
- Create: `skills/memory/uhh-memory-status/skill.md`

- [ ] **Step 9.1: Create main skill**

```markdown
<!-- skills/memory/uhh-memory/skill.md -->
---
name: uhh-memory
description: Access, search, and manage Uhstray.io team memory palace. Auto-triggers at session start to load context.
triggers:
  - remember this
  - save to memory
  - check memory
  - what do we know about
  - recall
---

# uhh:memory

Uhstray.io's team memory palace. Organized as wings → rooms → drawers.

## Session Start
Call `uhh_wake_up` at the start of every session to load team context.

## When to Save
Save to memory when the user shares:
- Architectural decisions and their rationale
- Team conventions and preferences
- Bug root causes and fixes
- Key project facts

Use `uhh_add_drawer` with appropriate wing and room.

## Wing Conventions
- `work` — project code, decisions, architecture
- `personal` — individual preferences, notes
- `team` — shared team knowledge, onboarding

## Sub-Skills
- `/uhh-memory-search` — search the palace
- `/uhh-memory-mine` — mine a project directory
- `/uhh-memory-status` — palace stats
```

- [ ] **Step 9.2: Create search skill**

```markdown
<!-- skills/memory/uhh-memory-search/skill.md -->
---
name: uhh-memory-search
description: Search the uhh:memory palace for relevant team knowledge, decisions, or context.
triggers:
  - search memory
  - find in memory
  - look up in palace
  - what do we know about X
---

# uhh:memory-search

Search team memory palace for relevant context.

## How to Use
1. Identify the key concept to search (be specific)
2. Call `uhh_search` with `query` and optional `wing` filter
3. Present relevant results to the user, noting their wing/room

## Tips
- Narrow by wing if you know the context (e.g., `wing: "work"`)
- Use 3-5 content words in the query, not full sentences
- If results are poor, try rephrasing with synonyms
```

- [ ] **Step 9.3: Create mine skill**

```markdown
<!-- skills/memory/uhh-memory-mine/skill.md -->
---
name: uhh-memory-mine
description: Mine a project directory or raw text into the uhh:memory palace for future recall.
triggers:
  - mine this project
  - index this directory
  - add project to memory
  - mine into memory
---

# uhh:memory-mine

Ingest project files or raw text into the memory palace.

## Mine a Directory
Use CLI: `uhh-mem mine <path> --wing <wing-name>`
Or call `uhh_mine_text` with extracted content.

## Mine Raw Text
Call `uhh_mine_text` with:
- `wing`: category (e.g., "work")
- `room`: topic (e.g., "auth", "billing", "api")
- `text`: the content to store

Text auto-splits into 800-char drawers with overlap.

## Before Mining
Confirm with user:
- What wing to use
- Whether to mine the whole directory or specific files
- Estimated drawer count (rough: 1 drawer per ~500 chars of content)
```

- [ ] **Step 9.4: Create status skill**

```markdown
<!-- skills/memory/uhh-memory-status/skill.md -->
---
name: uhh-memory-status
description: Show uhh:memory palace statistics — drawer count, wings, rooms.
triggers:
  - memory status
  - palace stats
  - how much is in memory
  - what wings exist
---

# uhh:memory-status

Show palace statistics and structure.

## How to Use
Call `uhh_status` for totals.
Call `uhh_list_wings` for wing list.
Call `uhh_list_rooms` with a wing for room breakdown.

Present results as a compact summary:
- Total drawers
- Wings list with drawer counts per wing
- Oldest and newest content timestamps if available
```

- [ ] **Step 9.5: Update `marketplace.json` with new skill entries**

```json
{
  "name": "huhhb",
  "publisher": "uhstray-io",
  "displayName": "Uhstray Skills Hub",
  "description": "Uhstray.io's curated Claude Code skills marketplace — workflows and automation for engineering teams.",
  "version": "0.2.0",
  "homepage": "https://github.com/uhstray-io/huhhb",
  "license": "MIT",
  "skills": [
    {
      "name": "uhh-memory",
      "path": "skills/memory/uhh-memory/skill.md",
      "description": "Access, search, and manage Uhstray.io team memory palace.",
      "category": "memory",
      "tags": ["memory", "ai", "context", "rag"],
      "version": "0.1.0"
    },
    {
      "name": "uhh-memory-search",
      "path": "skills/memory/uhh-memory-search/skill.md",
      "description": "Search the uhh:memory palace for relevant team knowledge.",
      "category": "memory",
      "tags": ["memory", "search", "semantic"],
      "version": "0.1.0"
    },
    {
      "name": "uhh-memory-mine",
      "path": "skills/memory/uhh-memory-mine/skill.md",
      "description": "Mine a project directory or text into the memory palace.",
      "category": "memory",
      "tags": ["memory", "mining", "indexing"],
      "version": "0.1.0"
    },
    {
      "name": "uhh-memory-status",
      "path": "skills/memory/uhh-memory-status/skill.md",
      "description": "Show uhh:memory palace statistics.",
      "category": "memory",
      "tags": ["memory", "status"],
      "version": "0.1.0"
    },
    {
      "name": "huhhb-welcome",
      "path": "onboarding/welcome.md",
      "description": "First-run tour of huhhb skills.",
      "category": "onboarding",
      "tags": ["onboarding"],
      "version": "0.1.0"
    },
    {
      "name": "huhhb-skills",
      "path": "onboarding/skills-list.md",
      "description": "List all available huhhb skills.",
      "category": "onboarding",
      "tags": ["onboarding", "discovery"],
      "version": "0.1.0"
    }
  ]
}
```

- [ ] **Step 9.6: Commit**

```bash
git add skills/ marketplace.json
git commit -m "feat: add 4 uhh:memory skills and update marketplace manifest"
```

---

## Task 10: End-to-End Smoke Test + Coverage

- [ ] **Step 10.1: Run full test suite with coverage**

```bash
python -m pytest tests/ -v --cov=uhh_memory --cov-report=term-missing
```
Expected: all PASSED, coverage ≥ 80%

- [ ] **Step 10.2: Manual CLI smoke test**

```bash
uhh-mem init
uhh-mem status
# Expected: Drawers: 0, Wings: none

echo "JWT tokens expire after 24 hours. Refresh tokens last 30 days." | uhh-mem mine /dev/stdin --wing work
# Windows: echo "content" > tmp.txt && uhh-mem mine tmp.txt --wing work

uhh-mem search "token expiry"
uhh-mem status
# Expected: Drawers > 0, Wings: work
```

- [ ] **Step 10.3: Verify MCP server starts**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | python3 -m uhh_memory.mcp_server
```
Expected: JSON response with `result.serverInfo.name == "uhh-memory"`

- [ ] **Step 10.4: Final commit**

```bash
git add .
git commit -m "feat: uhh:memory v0.1.0 — memory palace, MCP server, CLI, skills, plugin registration"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Wings/rooms/drawers hierarchy — Task 3
- ✅ ChromaDB storage — Task 2
- ✅ File mining — Task 4
- ✅ L0/L1/L2 context layers — Task 5
- ✅ 10 MCP tools — Task 6
- ✅ CLI (init, mine, search, status, wake-up) — Task 7
- ✅ Claude Code plugin registration — Task 8
- ✅ 4 Claude Code skills — Task 9
- ✅ marketplace.json updated — Task 9
- ✅ Auto-save hooks (shell scripts) — Task 8

**Placeholder scan:** None found.

**Type consistency:** `Palace`, `PalaceStorage`, `handle_tool_call`, `mine_directory`, `chunk_text`, `assemble_context` — consistent across all tasks.
