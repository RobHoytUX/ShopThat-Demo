# src/backend/main.py

from __future__ import annotations
import logging
from pathlib import Path
from typing import List, Optional, Union

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Routers & retrieval
from .campaigns import router as campaigns_router
from .keywords import router as keywords_router
from .retrieval import retrieve_and_answer

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Load .env early (CWD first, then project root)
# -----------------------------------------------------------------------------
THIS = Path(__file__).resolve()
ROOT = THIS.parents[2]
for p in (Path.cwd() / ".env", ROOT / ".env"):
    if p.exists():
        load_dotenv(p, override=True)
        logger.info(f"[env] loaded {p}")
        break

# -----------------------------------------------------------------------------
# FastAPI app
# -----------------------------------------------------------------------------
app = FastAPI(title="shopTHAT AI Chatbot")

# CORS (dev-friendly; tighten for prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(campaigns_router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(keywords_router,  prefix="/api/keywords",  tags=["keywords"])

# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    top_k: int = 5
    enabled: Optional[Union[List[str], str]] = None
    disabled: Optional[Union[List[str], str]] = None
    # Identify which keyword was clicked so backend can lock sources
    keyword_id: Optional[str] = None
    keyword_name: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]

class ToggleItem(BaseModel):
    name: str
    enabled: bool

class CampaignConfig(BaseModel):
    keywords: List[ToggleItem]
    internal_sources: List[ToggleItem]
    external_sources: List[ToggleItem]

class CampaignListItem(BaseModel):
    key: str
    display_name: str

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def _to_csv(x: Optional[Union[List[str], str]], default: str) -> str:
    """Normalize enabled/disabled into a CSV string ('all' / 'none' if absent)."""
    if x is None:
        return default
    if isinstance(x, str):
        return x
    return ",".join(x)

def _pretty_name(key: str) -> str:
    return key.replace("_", " ").title()

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/campaigns", response_model=List[CampaignListItem])
def list_campaigns():
    """
    Return a list of campaigns for the frontend switcher.
    Uses the same loader as /api/campaigns/{key}.
    """
    from .campaigns import _load_all_configs
    configs = _load_all_configs()
    items: List[CampaignListItem] = []
    for key, cfg in configs.items():
        display = cfg.get("display_name") or _pretty_name(key)
        items.append(CampaignListItem(key=key, display_name=display))
    return items

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Keyword-locked chat:
    - Uses ONLY resources returned by Neo4j for the provided keyword (and descendants),
      then ranks that subset with FAISS.
    - Adds 2–3 product recs tied to the same keyword.
    - Appends a Sources: section with the exact URLs used.
    """
    try:
        logger.info(f"[chat] q='{req.message[:80]}', kw_id={req.keyword_id}, kw_name={req.keyword_name}")
        enabled_csv  = _to_csv(req.enabled,  "all")
        disabled_csv = _to_csv(req.disabled, "none")

        answer, sources = retrieve_and_answer(
            question=req.message,
            enabled=enabled_csv,
            disabled=disabled_csv,
            top_k=req.top_k,
            keyword_id=req.keyword_id,
            keyword_name=req.keyword_name,
        )
        return ChatResponse(answer=answer, sources=sources)
    except Exception as e:
        logger.exception("chat endpoint failed")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

@app.get("/api/test")
def test_endpoint():
    """Simple test endpoint to verify the server is working"""
    return {"message": "Backend is working!", "status": "ok"}

@app.get("/api/campaigns/{key}", response_model=CampaignConfig)
def get_campaign_config(key: str):
    """Return campaign configuration for the frontend."""
    from .campaigns import _load_all_configs
    configs = _load_all_configs()

    # case-insensitive match
    campaign_key = next((k for k in configs.keys() if k.lower() == key.lower()), None)
    if campaign_key is None:
        raise HTTPException(status_code=404, detail=f"Campaign '{key}' not found")

    raw = configs[campaign_key]

    keywords = [ToggleItem(name=kw.get("name", ""), enabled=True) for kw in raw.get("keywords", [])]

    # extend if/when you add internal/external source toggles to the configs
    return CampaignConfig(keywords=keywords, internal_sources=[], external_sources=[])

# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # Use the full module path when running this file directly.
    uvicorn.run(
        "src.backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
