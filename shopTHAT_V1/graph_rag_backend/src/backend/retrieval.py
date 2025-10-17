# src/backend/retrieval.py
from __future__ import annotations

import os
import re
import json
import yaml
import logging
from pathlib import Path
from typing import List, Tuple, Optional, Dict

import numpy as np
import requests
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# -----------------------------------------------------------------------------
# ENV + CONFIG
# -----------------------------------------------------------------------------
THIS = Path(__file__).resolve()
ROOT = THIS.parents[2]

# load .env (cwd first, then project root)
for cand in (Path.cwd() / ".env", ROOT / ".env"):
    if cand.exists():
        load_dotenv(cand, override=True)
        logger.info(f"[env] loaded {cand}")
        break

# config.yaml discovery
CONFIG_CANDIDATES = [
    THIS.parent / "config.yaml",
    ROOT / "backend/app/config.yaml",
]
CONFIG_PATH = next((p for p in CONFIG_CANDIDATES if p.exists()), None)
if not CONFIG_PATH:
    raise FileNotFoundError("config.yaml not found")
cfg = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
logger.info(f"[config] Using {CONFIG_PATH}")

# FAISS artifacts produced by embed_mapping.py
faiss_dir = cfg.get("faiss", {}).get("pickle_path")
if not faiss_dir:
    raise FileNotFoundError("config.yaml missing faiss.pickle_path")
faiss_dir = Path(faiss_dir)
if not faiss_dir.is_absolute():
    faiss_dir = (ROOT / faiss_dir).resolve()

ids_file = faiss_dir / "ids.json"
emb_file = faiss_dir / "embeddings.npy"
index_file = faiss_dir / "index.faiss"

if not ids_file.exists() or not emb_file.exists():
    raise FileNotFoundError(f"Missing ids.json or embeddings.npy in {faiss_dir}")

IDS: List[str] = json.loads(ids_file.read_text(encoding="utf-8"))
EMB: np.ndarray = np.load(emb_file).astype("float32")
# cosine/IP normalize once
EMB_N = EMB / (np.linalg.norm(EMB, axis=1, keepdims=True) + 1e-12)
ROW_FOR_ID: Dict[str, int] = {id_: i for i, id_ in enumerate(IDS)}

# Try to load FAISS index (optional)
INDEX = None
try:
    import faiss  # type: ignore
    if index_file.exists():
        INDEX = faiss.read_index(str(index_file))
        logger.info("[faiss] Loaded index.faiss")
    else:
        logger.warning("[faiss] index.faiss not found; will fall back to NumPy")
except Exception as e:
    logger.warning(f"[faiss] unavailable ({e}); using NumPy fallback")

embedder = SentenceTransformer(cfg["embeddings"]["model_name"])

# Neo4j driver
NEO4J_URI  = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASS = os.getenv("NEO4J_PASSWORD")
NEO4J_DB   = os.getenv("NEO4J_DATABASE", "neo4j")
if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASS]):
    raise RuntimeError("Missing Neo4j env vars (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)")
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))

# -----------------------------------------------------------------------------
# GROQ
# -----------------------------------------------------------------------------
def call_groq(messages: List[dict]) -> str:
    api_env = str(cfg.get("groq", {}).get("api_key_env", "GROQ_API_KEY")).strip()
    api_key = os.getenv(api_env)
    if not api_key:
        raise RuntimeError(f"{api_env} not set")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": cfg["llm"]["primary_model"],
        "messages": messages,
        "temperature": cfg["llm"]["temperature"],
        "max_tokens": 600,
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=45)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()

# -----------------------------------------------------------------------------
# Helpers (keyword resolution)
# -----------------------------------------------------------------------------
def _normalize_kw_text(s: str) -> str:
    t = s.strip()
    # normalize 'lv' → 'louis vuitton' (word-boundary; case-insensitive)
    t = re.sub(r'(?i)\blv\b', 'louis vuitton', t)
    return t

def _resolve_keyword_id(
    keyword_id: Optional[str],
    keyword_name: Optional[str],
    question: str
) -> tuple[Optional[str], Optional[str]]:
    """
    Resolve to (kw_id, kw_name).
    Priority: explicit id → exact name → fuzzy contains (raw or normalized).
    """
    with driver.session(database=NEO4J_DB) as s:
        if keyword_id:
            rec = s.run(
                "MATCH (k:Keyword {id:$id}) RETURN k.id AS id, k.name AS name",
                id=keyword_id
            ).single()
            if rec:
                return rec["id"], rec["name"]

        for candidate in filter(None, [keyword_name, question]):
            n_raw = candidate.strip()
            # exact name match
            rec = s.run(
                "MATCH (k:Keyword) "
                "WHERE toLower(k.name) = toLower($n) "
                "RETURN k.id AS id, k.name AS name LIMIT 1",
                n=n_raw,
            ).single()
            if rec:
                return rec["id"], rec["name"]

            # fuzzy contains using BOTH raw and normalized forms
            n_norm = _normalize_kw_text(n_raw)
            rec = s.run(
                "MATCH (k:Keyword) "
                "WHERE toLower(k.name) CONTAINS toLower($n_raw) "
                "   OR toLower($n_raw) CONTAINS toLower(k.name) "
                "   OR toLower(k.name) CONTAINS toLower($n_norm) "
                "   OR toLower($n_norm) CONTAINS toLower(k.name) "
                "RETURN k.id AS id, k.name AS name "
                "ORDER BY size(k.name) ASC LIMIT 1",
                n_raw=n_raw,
                n_norm=n_norm,
            ).single()
            if rec:
                return rec["id"], rec["name"]

    return None, None

# -----------------------------------------------------------------------------
# Graph helpers (descendants, hops, resource metadata)
# -----------------------------------------------------------------------------
def _descendant_keyword_ids(kw_id: str, depth: int = 3) -> List[str]:
    """
    Return [kw_id] + descendants up to `depth` hops via :HAS_CHILD.
    (No params inside pattern; we filter with WHERE length(p)<= $d)
    """
    depth = max(0, int(depth))
    with driver.session(database=NEO4J_DB) as s:
        rec = s.run(
            """
            MATCH (root:Keyword {id:$id})
            OPTIONAL MATCH p = (root)-[:HAS_CHILD*1..]->(k:Keyword)
            WHERE length(p) <= $d
            WITH root.id AS rid, collect(DISTINCT k.id) AS kids
            RETURN [rid] + kids AS ids
            """,
            id=kw_id,
            d=depth,
        ).single()
        ids = rec["ids"] if rec else None
        return [i for i in (ids or [kw_id]) if i]

def _graph_resource_hops(kw_id: str, depth: int = 3) -> Dict[str, int]:
    """
    For resources reachable from the keyword within `depth` hops, return {rid: min_hops}.
    """
    depth = max(0, int(depth))
    with driver.session(database=NEO4J_DB) as s:
        rs = s.run(
            """
            MATCH (root:Keyword {id:$id})
            OPTIONAL MATCH p = (root)-[:HAS_CHILD*0..]->(k:Keyword)<-[:TAGGED_WITH]-(r:Resource)
            WHERE length(p) <= $d
            WITH r, min(length(p)) AS hops
            WHERE r IS NOT NULL
            RETURN r.id AS rid, hops
            """,
            id=kw_id,
            d=depth,
        )
        return {rec["rid"]: int(rec["hops"]) for rec in rs}

def _resources_for_keywords(kw_ids: List[str]) -> List[dict]:
    """
    Return resource metadata bound to any of provided keyword ids.
    (Used to identify type partitions & URLs later.)
    """
    if not kw_ids:
        return []
    with driver.session(database=NEO4J_DB) as s:
        q = """
        MATCH (r:Resource)-[:TAGGED_WITH]->(k:Keyword)
        WHERE k.id IN $ids
        RETURN r.id AS id, r.title AS title, r.url AS url, coalesce(r.type,'news') AS type
        """
        return [record.data() for record in s.run(q, ids=kw_ids)]

# -----------------------------------------------------------------------------
# Vector helpers (FAISS + NumPy)
# -----------------------------------------------------------------------------
def _faiss_pool_ids(qv: np.ndarray, pool_k: int = 1000) -> List[str]:
    """
    Get a global semantic pool from FAISS (or NumPy fallback).
    Returns up to pool_k doc IDs in descending similarity order.
    """
    n = len(IDS)
    pool_k = min(pool_k, n)
    if INDEX is not None:
        D, I = INDEX.search(qv, pool_k)
        return [IDS[i] for i in I[0] if 0 <= i < n]
    # NumPy fallback (fast enough for mid-size corpora)
    sims = (EMB_N @ qv[0]).astype("float32")
    idxs = np.argpartition(-sims, min(pool_k - 1, len(sims) - 1))[:pool_k]
    idxs = idxs[np.argsort(sims[idxs])[::-1]]
    return [IDS[i] for i in idxs]

def _vector_scores(qv: np.ndarray, ids: List[str]) -> Dict[str, float]:
    """
    Cosine scores for a subset of IDs using pre-normalized embeddings.
    (Correctly preserve alignment between ids and score rows.)
    """
    present_ids = [i for i in ids if i in ROW_FOR_ID]
    if not present_ids:
        return {}
    rows = [ROW_FOR_ID[i] for i in present_ids]
    M = EMB_N[rows]
    sims = (M @ qv[0]).astype("float32")
    return {pid: float(sims[idx]) for idx, pid in enumerate(present_ids)}

# -----------------------------------------------------------------------------
# Sanitizers & utils
# -----------------------------------------------------------------------------
REFUSAL = "It is not associated with exclusive campaigns."

def _norm_list(x, default: List[str]) -> List[str]:
    if x is None:
        return default
    if isinstance(x, str):
        return [s.strip().lower() for s in x.split(",") if s.strip()]
    return [str(s).strip().lower() for s in x]

def _strip_llm_sources(text: str) -> str:
    # remove any trailing Sources section the model might add
    return re.sub(r'(?is)\n+sources\s*:\s*.*$', '', text).strip()

def _strip_llm_headers(text: str) -> str:
    # remove "LV Connection — ..." lines and "Answer — " prefixes
    text = re.sub(r'(?im)^\s*lv connection\s*—.*$', '', text)
    text = re.sub(r'(?im)^\s*answer\s*—\s*', '', text)
    return text.strip()

def _dedupe_urls(urls: List[str]) -> List[str]:
    seen, out = set(), []
    for u in urls:
        if u and u not in seen:
            seen.add(u)
            out.append(u)
    return out

def _ctx_from_ids(res_ids: List[str], limit: int) -> Tuple[str, List[str]]:
    if not res_ids:
        return "", []
    lines, urls = [], []
    with driver.session(database=NEO4J_DB) as s:
        q = """
        UNWIND $ids AS rid
        MATCH (r:Resource {id:rid})
        RETURN r.id AS id, r.title AS title, r.url AS url, coalesce(r.type,'news') AS type
        """
        meta = {}
        for rec in s.run(q, ids=res_ids):
            meta[rec["id"]] = {
                "id": rec["id"],
                "title": rec["title"],
                "url": rec["url"],
                "type": rec["type"],
            }
    for rid in res_ids[:limit]:
        m = meta.get(rid) or {}
        url = m.get("url")
        if url:
            lines.append(f"- [{m.get('type','news')}] {m.get('title', rid)} → {url}")
            urls.append(url)
    return "\n".join(lines), urls

# -----------------------------------------------------------------------------
# Main entry (Hybrid: Graph + FAISS)
# -----------------------------------------------------------------------------
def retrieve_and_answer(
    question: str,
    enabled:  str | List[str] = "all",
    disabled: str | List[str] = "none",
    top_k:    int = 5,
    keyword_id: Optional[str] = None,
    keyword_name: Optional[str] = None,
    resource_types: str | List[str] = "all",   # NEW: type chips like ["hotel","restaurant","store"]
    # lv_only: bool = False,                   # OPTIONAL: keep if you still want an LV-only mode
) -> Tuple[str, List[str]]:
    en = _norm_list(enabled, ["all"])
    dis = _norm_list(disabled, ["none"])
    type_en = _norm_list(resource_types, ["all"])

    # 1) Resolve keyword
    kw_id, kw_name = _resolve_keyword_id(keyword_id, keyword_name, question)
    if not kw_id:
        return REFUSAL, []

    # enforce enabled/disabled by KEYWORD NAME only (reject unrelated keywords)
    kw_name_lc = (kw_name or "").strip().lower()
    if dis != ["none"] and kw_name_lc in dis:
        return REFUSAL, []
    if en != ["all"] and kw_name_lc not in en:
        return REFUSAL, []

    # 2) Graph: descendants + allowed resources + hops
    kw_ids = _descendant_keyword_ids(kw_id, depth=3)
    res_meta = _resources_for_keywords(kw_ids)
    if not res_meta:
        return REFUSAL, []

    type_by_id = {r["id"]: r.get("type", "news").lower() for r in res_meta}
    allowed_res_ids = set(type_by_id.keys())

    # Apply resource-type chips (Hotel/Restaurant/Store) if provided
    if type_en != ["all"]:
        allowed_res_ids = {rid for rid in allowed_res_ids if type_by_id.get(rid, "") in type_en}

    # If nothing survives the type filter, reject (unrelated to selected chips / no content)
    if not allowed_res_ids:
        return REFUSAL, []

    hops = _graph_resource_hops(kw_id, depth=3)  # {rid: hops}
    if not hops:
        return REFUSAL, []

    # 3) Vector: FAISS global pool, then intersect with graph-allowed (+ present in embeddings)
    qv = embedder.encode([question], normalize_embeddings=True).astype("float32").reshape(1, -1)

    pool_ids = _faiss_pool_ids(qv, pool_k=1000)
    inter_ids = [rid for rid in pool_ids if rid in allowed_res_ids and rid in ROW_FOR_ID]

    # if FAISS didn't surface any allowed items, fall back to all allowed (respecting types)
    if not inter_ids:
        inter_ids = [rid for rid in allowed_res_ids if rid in ROW_FOR_ID]
    if not inter_ids:
        return REFUSAL, []

    # 4) Score = α * vector + β * graph_prior, graph_prior = 1/(1+hops)
    ALPHA, BETA = 0.7, 0.3
    vec_scores = _vector_scores(qv, inter_ids)
    final_scores: List[tuple[str, float]] = []
    for rid in inter_ids:
        v = vec_scores.get(rid, 0.0)
        prior = 1.0 / (1.0 + float(hops.get(rid, 3)))
        final_scores.append((rid, ALPHA * v + BETA * prior))

    final_scores.sort(key=lambda x: x[1], reverse=True)
    ranked_ids = [rid for rid, _ in final_scores]

    # 5) Top-k (no refusal if only shopping remains)
    ranked_main = ranked_ids[:top_k]
    if not ranked_main:
        return REFUSAL, []

    # 6) Build context & call LLM
    ctx, sources = _ctx_from_ids(ranked_main, limit=top_k)
    if not ctx.strip():
        return REFUSAL, []

    sp_path = THIS.parent / "system_prompt.txt"
    system_prompt = (sp_path.read_text(encoding="utf-8") if sp_path.exists() else "").format(
        enabled_str=", ".join(en),
        disabled_str=", ".join(dis),
        sources_str="; ".join(sources) or "none",
    )

    # Generic, keyword-scoped prompt (no LV-only hard requirement)
    user_prompt = (
        f"Context:\n{ctx}\n\n"
        f"User keyword or question: {kw_name or question}\n\n"
        "Write 2–3 factual sentences strictly using the provided context. "
        "Do not fabricate facts. Do not include a sources list."
    )

    # If you still want an LV-only mode sometimes, gate it with a flag:
    # if lv_only:
    #     user_prompt += (
    #         " Focus only on Louis Vuitton connections. "
    #         "If the context does not establish a tie to Louis Vuitton, reply exactly: "
    #         "\"It is not associated with exclusive campaigns.\""
    #     )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_prompt},
    ]
    body = call_groq(messages)

    # sanitize LLM output (no headers, no model-added Sources)
    body = _strip_llm_sources(body)
    body = _strip_llm_headers(body)

    # 7) Optional: featured shopping from leftovers within same scope
    leftover_shop = [rid for rid in ranked_ids[top_k:] if type_by_id.get(rid) == "shopping"][:3]
    if leftover_shop:
        ctx2, _ = _ctx_from_ids(leftover_shop, limit=3)
        if ctx2.strip():
            body += "\n\n**Featured pieces**\n"
            for line in ctx2.splitlines()[:3]:
                try:
                    # line format: "- [type] Title → URL"
                    title = line.split("] ", 1)[1].split(" → ", 1)[0]
                    url   = line.rsplit(" → ", 1)[1]
                    body += f"- **{title}** — curated for this topic. ({url})\n"
                except Exception:
                    continue

    # de-dupe canonical sources and append once
    sources = _dedupe_urls(sources)
    if sources:
        body += "\n\nSources:\n" + "\n".join(sources)

    return body.strip(), sources
