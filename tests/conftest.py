import pytest
from uhh_memory.storage import NexusStorage
from uhh_memory.nexus import Nexus

@pytest.fixture
def storage(tmp_path):
    return NexusStorage(nexus_path=str(tmp_path), collection_name="test_col")

@pytest.fixture
def nexus(tmp_path):
    return Nexus(nexus_path=str(tmp_path))
