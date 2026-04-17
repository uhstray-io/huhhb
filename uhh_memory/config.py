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
