# build_faiss_store.py  ▸ metadata-only → embed concatenated metadata as content
import logging
import pickle
import pandas as pd
from langchain.docstore.document import Document
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from pathlib import Path


#import settings

# ───────────────────────────────────────────────────────────────
# Configure logging
# ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    logging.info("START build_faiss_store.py (metadata-based content)")
    # resolve project root (two levels up from this script file)
    BASE_DIR = Path(__file__).resolve().parent.parent

    # build the path to your processed pickles
    processed_dir = BASE_DIR / "data" / "processed"
    mapped_pickle = processed_dir / "mapped_metadata_processed.pkl"
    # 1) Load mapped metadata
    df = pd.read_pickle(mapped_pickle)
    logging.info(f"Loaded {len(df)} rows from mapped_metadata.pkl")

    # 2) Create Documents with concatenated metadata as page_content
    docs = []
    for _, row in df.iterrows():
        campaign = row.get("campaign", "")
        mapping  = row.get("mapping", "")
        keywords = row.get("keywords") or []
        section  = row.get("section") or ""
        question = row.get("question") or ""
        url       = row.get("url", "")

        # Build a short content string from metadata
        parts = [
            f"Campaign: {campaign}",
            f"Type: {mapping}",
        ]
        if keywords:
            parts.append("Keywords: " + ", ".join(keywords))
        if section:
            parts.append(f"Section: {section}")
        if question:
            parts.append(f"Question: {question}")
        parts.append(f"URL: {url}")

        content = " | ".join(parts)

        meta = {
            "campaign": campaign,
            "mapping":  mapping,
            "keywords": keywords,
            "section":  section,
            "question": question,
            "url":      url,
        }

        docs.append(Document(page_content=content, metadata=meta))
    logging.info(f"Converted to {len(docs)} Document objects with metadata-based content")

    # 3) Embed & build FAISS
    embedder = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    logging.info("Embedding documents and creating FAISS vector store…")
    store = FAISS.from_documents(docs, embedder)
    logging.info("FAISS vector store built in memory")

    # 4) Persist to disk
    store.save_local("faiss_store_metadata_content")
    with open("faiss_vectorstore_metadata_content.pkl", "wb") as f:
        pickle.dump(store, f)
    logging.info("Saved vector store to ./faiss_store_metadata_content/ and faiss_vectorstore_metadata_content.pkl")

    logging.info("END build_faiss_store.py")
