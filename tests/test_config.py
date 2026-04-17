import os
import json
from pathlib import Path
import pytest
from uhh_memory.config import load_config, DEFAULT_NEXUS_PATH

def test_default_config_returns_expected_keys():
    cfg = load_config()
    assert "nexus_path" in cfg
    assert "collection_name" in cfg
    assert "embedding_model" in cfg

def test_env_var_overrides_nexus_path(tmp_path, monkeypatch):
    monkeypatch.setenv("UHH_NEXUS_PATH", str(tmp_path))
    cfg = load_config()
    assert cfg["nexus_path"] == str(tmp_path)

def test_config_file_overrides_defaults(tmp_path, monkeypatch):
    config_file = tmp_path / "config.json"
    config_file.write_text(json.dumps({"collection_name": "my_col"}))
    monkeypatch.setenv("UHH_CONFIG_PATH", str(config_file))
    cfg = load_config()
    assert cfg["collection_name"] == "my_col"

def test_default_nexus_path_is_home_subdir():
    assert ".uhh-memory" in str(DEFAULT_NEXUS_PATH)
