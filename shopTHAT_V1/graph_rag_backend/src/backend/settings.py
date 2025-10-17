# src/backend/retrieval.py

import os
import json
import logging
from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np
import requests
import yaml
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# -----------------------------------------------------------------------------
# Resolve project roots
#   Assuming this file lives at .../graph_rag_backend/src/backend/retrieval.py
#   Then ROOT points to .../graph_rag_backend
# -----------------------------------------------------------------------------
THIS_FILE = Path(__file__).resolve()
SRC_DIR   = THIS_FILE.parents[1]         # .../src
ROOT      = THIS_FILE.parents[2]         # .../graph_rag_backend
CWD       = Path.cwd()

# -----------------------------------------------------------------------------
# Load .env (be explicit + log where from)
# You can also set ENV_FILE=/absolute/path/to/.env to force a specific file.
# -----------------------------------------------------------------------------
env_candidates: List[Path] = []
env_from_env = os.getenv("ENV_FILE")
if env_from_env:
    env_candidates.append(Path(env_from_env))

env_candidates += [
    CWD / ".env",           # running dir
    ROOT / ".env",          # graph_rag_backend/.env   <-- your screenshot case
    ROOT.parent / ".env",   # repo root fallback
]

loaded_from = None
for p in env_candidates:
    try:
        if p and p.exists():
            load_dotenv(p, override=True)
            loaded_from = p
    except Exception as e:
        logger.warning(f"Failed loading env from {p}: {e}")

logger.info(f"[env] loaded_from={loaded_from} GROQ_API_KEY?={'yes' if os.getenv('GROQ_API_KEY') else 'no'}")

# -----------------------------------------------------------------------------
# Load config.yaml (support multiple locations)
#   You pasted: backend/app/config.yaml
#   We also check local folder (src/backend/config.yaml) for flexibility.
# -----------------------------------------------------------------------------
CONFIG_CANDIDATES = [
    THIS_FILE.parent / "config.yaml",        # src/backend/config.yaml
    ROOT / "backend/app/config.yaml",        # backend/app/config.yaml (your paste)
]

CONFIG_PATH = next((p for p in CONFIG_CANDIDATES if p.exists()), None)
if not CONFIG_PATH:
    raise FileNotFoundError(
        f"config.yaml not found. Tried: {', '.join(str(p) for p in CONFIG_CANDIDATES)}"
    )

logger.info(f"[config] Using {CONFIG_PATH}")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    cfg = yaml.safe_load(f)

# -----------------------------------------------------------------------------
# FAISS & Embeddings setup
#   Make faiss path relative to ROOT if not absolute
# -----------------------------------------------------------------------------
faiss_dir = Path(cfg["faiss"]["pickle_path"])
if not faiss_dir.is_absolute():
    faiss_dir = (ROOT / faiss_dir).resolve()

ids_file   = faiss_dir / "ids.json"
index_file = faiss_dir / "index.faiss"

if not faiss_dir.exists():
    raise FileNotFoundError(f"FAISS directory not found: {faiss_dir}")

if not ids_file.exists() or not index_file.exists():
    raise FileNotFoundError(f"Missing FAISS files in {faiss_dir} (need ids.json and index.faiss)")

ids   = json.loads(ids_file.read_text(encoding="utf-8"))
index = faiss.read_index(str(index_file))

embedder_name = cfg["embeddings"]["model_name"]
logger.info(f"[embeddings] Loading SentenceTransformer: {embedder_name}")
embedder = SentenceTransformer(embedder_name)

# -----------------------------------------------------------------------------
# Neo4j setup
# -----------------------------------------------------------------------------
neo4j_uri  = os.getenv("NEO4J_URI")
neo4j_user = os.getenv("NEO4J_USERNAME")
neo4j_pass = os.getenv("NEO4J_PASSWORD")
neo4j_db   = os.getenv("NEO4J_DATABASE", "neo4j")

missing_env = [k for k, v in {
    "NEO4J_URI": neo4j_uri, "NEO4J_USERNAME": neo4j_user, "NEO4J_PASSWORD": neo4j_pass
}.items() if not v]
if missing_env:
    raise RuntimeError(f"Missing Neo4j env vars: {', '.join(missing_env)} (loaded_from={loaded_from})")

driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_pass))

# -----------------------------------------------------------------------------
# Groq call helper
# -----------------------------------------------------------------------------
def call_groq(messages: List[dict]) -> str:
    api_env = str(cfg.get("groq", {}).get("api_key_env", "GROQ_API_KEY")).strip()
    api_key = os.getenv(api_env)

    if not api_key:
        tried = "; ".join(str(p) for p in env_candidates)
        raise RuntimeError(
            f"{api_env} not set. "
            f"Checked .env files in order: {tried}. "
            f"Detected loaded_from={loaded_from} (may be None)."
        )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model":       cfg["llm"]["primary_model"],
        "messages":    messages,
        "temperature": cfg["llm"]["temperature"],
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=45)
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        logger.error(f"Groq HTTP {resp.status_code}: {resp.text[:500]}")
        raise

    data = resp.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"Unexpected Groq response structure: {data}")
        raise

# -----------------------------------------------------------------------------
# Retrieval helpers
# -----------------------------------------------------------------------------
def search_context(
    question: str,
    enabled:  List[str],
    disabled: List[str],
    top_k:    int = 5
) -> Tuple[str, List[str]]:
    """
    1) Embed question, search FAISS.
    2) Load matching nodes from Neo4j.
    3) Filter by enabled/disabled keyword types.
    4) Return (markdown_context, list_of_urls).
    """
    # 1) FAISS search
    qv = embedder.encode([question], normalize_embeddings=True)
    distances, indices = index.search(np.asarray(qv, dtype="float32"), top_k)
    hits = [ids[i] for i in indices[0]]
    logger.info(f"[faiss] hits: {hits}")

    # 2) Neo4j metadata
    cypher = """
    MATCH (n)
    WHERE n.id IN $ids
    RETURN n.id AS id,
           labels(n)[0] AS type,
           coalesce(n.title, n.name) AS title,
           coalesce(n.url, '') AS url
    LIMIT $limit
    """
    with driver.session(database=neo4j_db) as sess:
        records = sess.run(cypher, ids=hits, limit=top_k)
        recs = [r.data() for r in records]

    # 3) Filter
    filtered = []
    for r in recs:
        t = r["type"]
        if enabled != ["all"] and t not in enabled:
            continue
        if disabled != ["none"] and t in disabled:
            continue
        filtered.append(r)

    # 4) Format
    context_lines = [f"- [{r['type']}] {r['title']} → {r['url']}" for r in filtered]
    return "\n".join(context_lines), [r["url"] for r in filtered]

def retrieve_and_answer(
    question: str,
    enabled:  str | List[str] = "all",
    disabled: str | List[str] = "none",
    top_k:    int = 5
) -> Tuple[str, List[str]]:
    """
    End-to-end RAG:
      a) search_context(...)
      b) build system/user messages
      c) call Groq
      d) return (answer, sources)
    """
    # normalize enabled/disabled into lists
    if isinstance(enabled, str):
        en = [k.strip() for k in enabled.split(",") if k.strip()] or ["all"]
    else:
        en = enabled or ["all"]

    if isinstance(disabled, str):
        dis = [k.strip() for k in disabled.split(",") if k.strip()] or ["none"]
    else:
        dis = disabled or ["none"]

    # a) get context
    ctx, sources = search_context(question, en, dis, top_k=top_k)

    # b) load & format system prompt
    sp_path = THIS_FILE.parent / "system_prompt.txt"
    if not sp_path.exists():
        raise FileNotFoundError(f"system_prompt.txt not found: {sp_path}")
    sp = sp_path.read_text(encoding="utf-8")
    system_prompt = sp.format(
        enabled_str=",".join(en),
        disabled_str=",".join(dis),
        sources_str="; ".join(sources) or "none",
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": f"Context:\n{ctx}\n\nQuestion: {question}\nAnswer:"}
    ]

    # c) LLM
    answer = call_groq(messages)
    return answer, sources

# -----------------------------------------------------------------------------
# Optional quick sanity run:
#   poetry run python -m src.backend.retrieval
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print(f"Loaded .env from: {loaded_from}")
    print(f"GROQ_API_KEY present? {bool(os.getenv('GROQ_API_KEY'))}")
    print(f"Config path: {CONFIG_PATH}")
    print(f"FAISS dir: {faiss_dir}")
    print("OK.")
