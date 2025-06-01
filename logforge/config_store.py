import os
from pathlib import Path

import yaml

from . import runner  # logforge's internal runner you reload config into

CONFIG_PATH = Path(os.getenv("CONFIG_PATH", "/app/data/config.yml"))


def load_config() -> dict:
    """
    Read and return the full YAML configuration.
    """
    if CONFIG_PATH.exists():
        return yaml.safe_load(CONFIG_PATH.read_text()) or {}
    return {}


def save_config(cfg: dict):
    """
    Persist the YAML and reload into the running process.
    """
    CONFIG_PATH.write_text(yaml.safe_dump(cfg))
    # This should call logforge's dynamic reload hook
    runner.reload_config(cfg)
