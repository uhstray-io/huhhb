import pytest
from uhh_memory.storage import PalaceStorage
from uhh_memory.palace import Palace

@pytest.fixture
def storage(tmp_path):
    return PalaceStorage(palace_path=str(tmp_path), collection_name="test_col")

@pytest.fixture
def palace(tmp_path):
    return Palace(palace_path=str(tmp_path))
