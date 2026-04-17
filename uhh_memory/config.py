import json
import os
from pathlib import Path
from typing import Any

DEFAULT_NEXUS_PATH = Path.home() / ".uhh-memory" / "nexus"
DEFAULT_CONFIG: dict[str, Any] = {
    "nexus_path": str(DEFAULT_NEXUS_PATH),
    "collection_name": "uhh_drawers",
    "embedding_model": "all-MiniLM-L6-v2",
    "auto_save_interval": 15,
}

def load_config() -> dict[str, Any]:
    cfg = DEFAULT_CONFIG.copy()
    config_path = Path(os.environ.get("UHH_CONFIG_PATH", Path.home() / ".uhh-memory" / "config.json"))
    if Path(config_path).exists():
        with open(config_path) as f:
            cfg.update(json.load(f))
    if nexus_env := os.environ.get("UHH_NEXUS_PATH"):
        cfg["nexus_path"] = nexus_env
    return cfg
