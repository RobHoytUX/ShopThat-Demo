import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

BASE = Path(__file__).parent.parent.parent
CAMPAIGNS_DIR = BASE / "data" / "campaigns"

#  ── Pydantic models ────────────────────────────────────────────────────────────

class ToggleItem(BaseModel):
    name: str
    enabled: bool

class SourceConfig(BaseModel):
    internal_sources: List[ToggleItem]
    external_sources: List[ToggleItem]

class CampaignConfig(BaseModel):
    keywords: List[ToggleItem]
    internal_sources: List[ToggleItem]
    external_sources: List[ToggleItem]

class ProductItem(BaseModel):
    product_url: str
    image_url: str

#  ── Router setup ───────────────────────────────────────────────────────────────

router = APIRouter()

def _load_and_normalize(path: Path) -> Dict:
    raw = json.loads(path.read_text())
    for kw in raw.get("keywords", []):
        if "term" in kw:
            kw["name"] = kw.pop("term")
    return raw

def _load_all_configs() -> Dict[str, Dict]:
    out = {}
    for p in CAMPAIGNS_DIR.glob("*.json"):
        out[p.stem] = _load_and_normalize(p)
    return out

#  ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/campaigns", response_model=List[str])
def list_campaigns():
    return sorted(_load_all_configs().keys())

@router.get("/campaigns/{key}/keywords", response_model=List[str])
def get_enabled_keywords(key: str):
    path = CAMPAIGNS_DIR / f"{key}.json"
    if not path.exists():
        raise HTTPException(404, f"Campaign '{key}' not found")
    cfg = _load_and_normalize(path)
    return [kw["name"] for kw in cfg.get("keywords", []) if kw.get("enabled")]

@router.get("/campaigns/{key}/internal_sources", response_model=List[ToggleItem])
def get_internal_sources(key: str):
    path = CAMPAIGNS_DIR / f"{key}.json"
    if not path.exists():
        raise HTTPException(404, f"Campaign '{key}' not found")
    cfg = _load_and_normalize(path)
    return [ToggleItem(name=s["name"], enabled=s.get("enabled", False))
            for s in cfg.get("internal_sources", [])]

@router.get("/campaigns/{key}/external_sources", response_model=List[ToggleItem])
def get_external_sources(key: str):
    path = CAMPAIGNS_DIR / f"{key}.json"
    if not path.exists():
        raise HTTPException(404, f"Campaign '{key}' not found")
    cfg = _load_and_normalize(path)
    return [ToggleItem(name=s["name"], enabled=s.get("enabled", False))
            for s in cfg.get("external_sources", [])]

@router.get("/campaigns/{key}/products", response_model=List[ProductItem])
def get_products(key: str):
    path = CAMPAIGNS_DIR / f"{key}.json"
    if not path.exists():
        raise HTTPException(404, f"Campaign '{key}' not found")
    cfg = _load_and_normalize(path)
    return [ProductItem(product_url=p["product_url"], image_url=p["image_url"])
            for p in cfg.get("products", [])]

@router.get("/campaigns/{key}", response_model=CampaignConfig)
def get_campaign(key: str):
    """
    Return ALL keywords & sources across every campaign file,
    marking enabled=true only for those in the selected `key`,
    and enabled=false otherwise.
    """
    all_cfgs = _load_all_configs()
    if key not in all_cfgs:
        raise HTTPException(404, f"Campaign '{key}' not found")

    # gather unique names
    all_keywords = {
      kw["name"]
      for cfg in all_cfgs.values()
      for kw in cfg.get("keywords", [])
    }
    all_internal = {
      src["name"]
      for cfg in all_cfgs.values()
      for src in cfg.get("internal_sources", [])
    }
    all_external = {
      src["name"]
      for cfg in all_cfgs.values()
      for src in cfg.get("external_sources", [])
    }

    selected = all_cfgs[key]

    # build toggles
    keywords = [
      ToggleItem(
        name=name,
        enabled=any(kw["name"] == name and kw.get("enabled", False)
                    for kw in selected.get("keywords", []))
      )
      for name in sorted(all_keywords)
    ]
    internal = [
      ToggleItem(
        name=name,
        enabled=any(src["name"] == name and src.get("enabled", False)
                    for src in selected.get("internal_sources", []))
      )
      for name in sorted(all_internal)
    ]
    external = [
      ToggleItem(
        name=name,
        enabled=any(src["name"] == name and src.get("enabled", False)
                    for src in selected.get("external_sources", []))
      )
      for name in sorted(all_external)
    ]

    return CampaignConfig(
      keywords=keywords,
      internal_sources=internal,
      external_sources=external
    )

@router.patch("/campaigns/{key}", response_model=None)
def update_campaign(key: str, config: CampaignConfig):
    path = CAMPAIGNS_DIR / f"{key}.json"
    if not path.exists():
        raise HTTPException(404, f"Campaign '{key}' not found")

    # write back using `name` for keywords and flat sources
    out = {
      "keywords": [
        {"name": kw.name, "enabled": kw.enabled}
        for kw in config.keywords
      ],
      "internal_sources": [
        {"name": s.name, "enabled": s.enabled}
        for s in config.internal_sources
      ],
      "external_sources": [
        {"name": s.name, "enabled": s.enabled}
        for s in config.external_sources
      ],
      # products are not updated here; add if you want to support editing products
    }
    path.write_text(json.dumps(out, indent=2))
    return
