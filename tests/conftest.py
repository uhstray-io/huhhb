import pytest
from memory.storage import NexusStorage
from memory.nexus import Nexus

@pytest.fixture
def storage(tmp_path):
    return NexusStorage(nexus_path=str(tmp_path), collection_name="test_col")

@pytest.fixture
def nexus(tmp_path):
    return Nexus(nexus_path=str(tmp_path))
