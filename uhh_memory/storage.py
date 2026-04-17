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
