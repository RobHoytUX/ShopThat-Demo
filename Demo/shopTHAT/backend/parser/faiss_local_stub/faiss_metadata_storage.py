#!/usr/bin/env python3
import json
import logging
from pathlib import Path
from tqdm import tqdm

from langchain.docstore.document import Document
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# ─── LOGGING ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s"
)
logger = logging.getLogger(__name__)

# ─── PATHS ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / ".." / "data" / "campaigns"  # Adjust as needed
OUTPUT_DIR = BASE_DIR / "faiss_stores"
OUTPUT_DIR.mkdir(exist_ok=True)

# ─── TEXT EMBEDDER ─────────────────────────────────────────────────────────
text_embedder = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ─── CAMPAIGN FILES ────────────────────────────────────────────────────────
campaigns = {
    "core_values": "Core_Values_Campaign.json",
    "kusama": "Kusama_Campaign.json",
    "murakami": "Murakami_Campaign.json",
}

# ─── LOAD AND COMBINE ALL RECORDS ──────────────────────────────────────────
all_records = []
for campaign_name, fname in tqdm(campaigns.items(), desc="campaigns", unit="camp"):
    logger.info(f"[{campaign_name}] loading {fname}")
    try:
        mapping = json.loads((DATA_DIR / fname).read_text(encoding="utf-8"))
        kws = [kw["name"] for kw in mapping.get("keywords", []) if kw.get("enabled")]
        internal = [s["name"] for s in mapping.get("internal_sources", []) if s.get("enabled")]
        external = [s["name"] for s in mapping.get("external_sources", []) if s.get("enabled")]
        prods = mapping.get("products", [])
        if prods:
            for p in prods:
                all_records.append({
                    "campaign": campaign_name,
                    "keywords": kws,
                    "internal_sources": internal,
                    "external_sources": external,
                    "product_url": p.get("product_url"),
                    "image_url": p.get("image_url"),
                })
        else:
            all_records.append({
                "campaign": campaign_name,
                "keywords": kws,
                "internal_sources": internal,
                "external_sources": external
            })
    except Exception as e:
        logger.error(f"Error processing campaign {campaign_name}: {e}")
        continue
logger.info(f"Total products indexed: {len(all_records)}")

# ─── EMBED AND BUILD FAISS ─────────────────────────────────────────────────
docs = []
for rec in tqdm(all_records, desc="embedding", unit="rec"):
    parts = []
    if rec.get("keywords"): parts.append("Keywords: " + ", ".join(rec["keywords"]))
    if rec.get("internal_sources"): parts.append("Internal: " + ", ".join(rec["internal_sources"]))
    if rec.get("external_sources"): parts.append("External: " + ", ".join(rec["external_sources"]))
    if rec.get("product_url"): parts.append(f"URL: {rec['product_url']}")
    content = " | ".join(parts)
    docs.append(Document(page_content=content, metadata=rec))

store = FAISS.from_documents(docs, text_embedder)
out = OUTPUT_DIR / "faiss_all_campaigns_text"
store.save_local(str(out))
logger.info(f"Saved combined FAISS DB to {out}")
