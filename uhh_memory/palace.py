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

    def get_drawer(self, *, drawer_id: str) -> dict | None:
        result = self._storage.get(ids=[drawer_id])
        if not result["ids"]:
            return None
        meta = result["metadatas"][0] or {} if result.get("metadatas") else {}
        return {"id": result["ids"][0], "content": result["documents"][0], **meta}

    def list_wings(self) -> list[str]:
        result = self._storage.get_all()
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
