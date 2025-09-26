#!/usr/bin/env python3
"""
embed_mapping.py

Loads config from config.yaml:
  mapping.manifest: JSON with `keywords`, `resources`, `talents`
  faiss.pickle_path: output directory for embeddings
  embeddings.model_name: sentence-transformer model

Outputs:
  - embeddings.npy   (unnormalized, float32; same order as ids.json)
  - ids.json         (IDs aligned with embeddings rows)
  - index.faiss      (FAISS IndexFlatIP over L2-normalized float32 vectors)
"""

import os
import json
import yaml
import logging
import numpy as np
from pathlib import Path
from typing import List, Tuple
from sentence_transformers import SentenceTransformer
import faiss

# ---------------- Logging ----------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("embed_mapping")

# ---------------- Config discovery ----------------
THIS = Path(__file__).resolve()
# Assume repo root 2 levels up (same assumption as retrieval.py)
ROOT = THIS.parents[2]

CANDIDATES = [
    THIS.parent / "config.yaml",
    ROOT / "backend" / "app" / "config.yaml",
    ROOT / "config.yaml",
]
CONFIG_PATH = next((p for p in CANDIDATES if p.exists()), None)
if not CONFIG_PATH:
    raise FileNotFoundError("config.yaml not found next to this script or in repo candidates.")
logger.info(f"Loading configuration from: {CONFIG_PATH}")

with CONFIG_PATH.open("r", encoding="utf-8") as f:
    cfg = yaml.safe_load(f) or {}

manifest_path = cfg.get("mapping", {}).get("manifest")
output_dir = cfg.get("faiss", {}).get("pickle_path")
model_name = cfg.get("embeddings", {}).get("model_name")
# Optional behavior toggles
index_scope = (cfg.get("mapping", {}).get("index_scope") or "all").lower()
# If False, we won’t inject resource URL strings into embeddings to reduce noise
include_url_in_resource_text = bool(cfg.get("mapping", {}).get("include_url_in_resource_text", False))

logger.info(f"Manifest path (raw): {manifest_path}")
logger.info(f"Output directory (raw): {output_dir}")
logger.info(f"Embedding model: {model_name}")
logger.info(f"Index scope: {index_scope}  (all|resources|keywords|talents)")
logger.info(f"Include URL in resource text: {include_url_in_resource_text}")

# ---------------- Path resolution ----------------
def _resolve_path(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    # try relative to CWD first
    if p.exists():
        return p
    # then relative to repo root
    cand = (ROOT / p).resolve()
    if cand.exists():
        return cand
    return p  # will error later

if not manifest_path:
    raise FileNotFoundError("config.yaml missing mapping.manifest")

manifest_path = _resolve_path(manifest_path)
if not manifest_path.exists():
    raise FileNotFoundError(f"Manifest not found: {manifest_path}")

if not output_dir:
    raise FileNotFoundError("config.yaml missing faiss.pickle_path")

output_dir = Path(output_dir)
if not output_dir.is_absolute():
    output_dir = (ROOT / output_dir).resolve()
output_dir.mkdir(parents=True, exist_ok=True)
logger.info(f"Resolved output directory: {output_dir}")

# ---------------- Parse manifest ----------------
def parse_mapping(path: Path) -> List[Tuple[str, str]]:
    """
    Returns a list of (id, text) docs to embed.
    Scope control:
      - "all": keywords + resources + talents (original behavior)
      - "resources": only resources (recommended for cleaner retrieval)
      - "keywords": only keywords
      - "talents": only talents
    """
    logger.info(f"Parsing manifest: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    docs: List[Tuple[str, str]] = []

    def add_keywords():
        kws = data.get("keywords", [])
        logger.info(f"Found {len(kws)} keywords")
        for kw in kws:
            kid = kw.get("id")
            name = kw.get("name", "") or ""
            if kid and name:
                docs.append((kid, name))

    def add_resources():
        res = data.get("resources", [])
        logger.info(f"Found {len(res)} resources")
        for r in res:
            rid = r.get("id")
            title = r.get("title", "") or ""
            rtype = r.get("type", "") or ""
            parts = [title, rtype]
            if include_url_in_resource_text:
                url = r.get("url", "") or ""
                if url:
                    parts.append(url)
            text = " | ".join([p for p in parts if p])
            if rid and text:
                docs.append((rid, text))

    def add_talents():
        tal = data.get("talents", [])
        logger.info(f"Found {len(tal)} talents")
        for t in tal:
            tid = t.get("id")
            name = t.get("name", "") or ""
            role = t.get("role", "") or ""
            parts = [name, role]
            url = t.get("url", "") or ""
            if include_url_in_resource_text and url:
                parts.append(url)
            text = " | ".join([p for p in parts if p])
            if tid and text:
                docs.append((tid, text))

    if index_scope == "all":
        add_keywords(); add_resources(); add_talents()
    elif index_scope == "resources":
        add_resources()
    elif index_scope == "keywords":
        add_keywords()
    elif index_scope == "talents":
        add_talents()
    else:
        logger.warning(f"Unknown index_scope={index_scope}; defaulting to 'all'")
        add_keywords(); add_resources(); add_talents()

    # De-dupe IDs while preserving first occurrence/order
    seen = set()
    deduped: List[Tuple[str, str]] = []
    for id_, text in docs:
        if id_ not in seen:
            seen.add(id_)
            deduped.append((id_, text))
    if len(deduped) != len(docs):
        logger.info(f"De-duplicated docs: {len(docs)} → {len(deduped)}")

    logger.info(f"Total docs to embed: {len(deduped)}")
    return deduped

# ---------------- Main ----------------
def main():
    docs = parse_mapping(manifest_path)
    if not docs:
        raise RuntimeError("No documents to embed. Check manifest and index_scope.")

    ids, texts = zip(*docs)
    ids = list(ids)
    texts = list(texts)

    logger.info(f"Loading embedder: {model_name}")
    embedder = SentenceTransformer(model_name)

    logger.info(f"Encoding {len(texts)} documents...")
    embeddings = embedder.encode(
        texts,
        show_progress_bar=True,
        batch_size=64,
        convert_to_numpy=True,
        normalize_embeddings=False,  # we will keep raw, and normalize a copy for FAISS
    )

    # Ensure float32 for FAISS and saving
    embeddings = np.asarray(embeddings, dtype="float32")
    logger.info(f"Embeddings shape: {embeddings.shape} (dtype={embeddings.dtype})")

    # Save raw (unnormalized) embeddings + ids (aligns with retrieval.py behavior)
    emb_file = output_dir / "embeddings.npy"
    ids_file = output_dir / "ids.json"
    np.save(emb_file, embeddings)
    ids_file.write_text(json.dumps(ids, ensure_ascii=False, indent=0), encoding="utf-8")
    logger.info(f"Wrote {emb_file} and {ids_file}")

    # Build FAISS index over L2-normalized vectors with inner product search
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    emb_norm = embeddings.copy()
    faiss.normalize_L2(emb_norm)  # in-place, float32
    index.add(emb_norm)
    index_file = output_dir / "index.faiss"
    faiss.write_index(index, str(index_file))
    logger.info(f"Wrote FAISS index: {index_file}")

    # Sanity checks
    assert len(ids) == embeddings.shape[0], "ids.json length must match embeddings rows"
    logger.info("Embed mapping pipeline completed successfully.")

if __name__ == "__main__":
    main()
