# settings.py

import os
import yaml
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
print(f"[settings] BASE_DIR is: {BASE_DIR}")
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    def __init__(self, config_path: Path):
        print(ENV_PATH)
        # 1) Load the YAML
        raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))

        # 2) LLM config
        llm_cfg    = raw["llm"]
        retry_cfg  = llm_cfg["retry"]
        self.primary_model           = llm_cfg["primary_model"]
        self.fallback_model          = llm_cfg["fallback_model"]
        self.temperature             = llm_cfg["temperature"]
        self.retry_attempts          = retry_cfg["attempts"]
        self.retry_backoff_multiplier= retry_cfg["backoff_multiplier"]
        self.retry_backoff_min       = retry_cfg["backoff_min"]
        self.retry_backoff_max       = retry_cfg["backoff_max"]

        # ————— FAISS section —————
        faiss_cfg = raw["faiss"]
        rel = faiss_cfg["store_path"]               # e.g. "backend/parser/faiss_stores/…"
        
        self.FAISS_STORE_PATH = BASE_DIR / rel      # absolute Path to that folder


        # 4) GROQ API key from env var name in config
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if not self.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is missing from .env")

                # ————— EMBEDDINGS —————
        emb_cfg = raw.get("embeddings", {})
        self.embedder_model = emb_cfg.get("model_name")
        if not self.embedder_model:
            raise ValueError("`embeddings.model_name` missing from config.yaml")


# instantiate a singleton
CONFIG_PATH = Path(__file__).parent / "config.yaml"
settings    = Settings(CONFIG_PATH)

