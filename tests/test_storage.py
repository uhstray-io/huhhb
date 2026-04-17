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
    # ChromaDB returns [] (empty list) for documents when the id no longer exists
    assert result["documents"] == [] or result["documents"] == [None]

def test_count_reflects_added_items(storage):
    storage.add(ids=["a", "b"], documents=["doc a", "doc b"], metadatas=[{"wing": "w"}, {"wing": "w"}])
    assert storage.count() == 2

def test_where_filter_narrows_results(storage):
    storage.add(ids=["d1"], documents=["work note"], metadatas=[{"wing": "work"}])
    storage.add(ids=["d2"], documents=["personal note"], metadatas=[{"wing": "personal"}])
    results = storage.query(query_texts=["note"], n_results=5, where={"wing": "work"})
    assert all(meta["wing"] == "work" for meta in results["metadatas"][0])
