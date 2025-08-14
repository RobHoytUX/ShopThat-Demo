# src/backend/campaigns.py

from fastapi import APIRouter, HTTPException
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import json

# Initialize router
router = APIRouter()

# Directory for campaign manifests
BASE_DIR = Path(__file__).resolve().parent.parent
CAMPAIGNS_DIR = BASE_DIR / "campaigns_manifest"


# Pydantic models
class Campaign(BaseModel):
    key: str
    display_name: str

class Keyword(BaseModel):
    id: str
    name: str
    parent: Optional[str] = None

# Utility to load and normalize manifest
def _load_and_normalize(path: Path) -> dict:
    data = json.loads(path.read_text())
    return data

# Load all campaign configs
def _load_all_configs() -> dict:
    """Load each JSON manifest directly under campaigns_manifest as a separate campaign."""
    configs = {}
    if not CAMPAIGNS_DIR.exists():
        return configs
    # Each JSON file in CAMPAIGNS_DIR is a campaign manifest
    for json_file in CAMPAIGNS_DIR.glob("*.json"):
        try:
            data = _load_and_normalize(json_file)
            key = json_file.stem  # filename without .json
            configs[key] = data
        except Exception:
            # skip files that fail to parse
            continue
    return configs
    for folder in CAMPAIGNS_DIR.iterdir():
        if folder.is_dir():
            json_files = list(folder.glob("*.json"))
            if not json_files:
                continue
            cfg = _load_and_normalize(json_files[0])
            configs[folder.name] = cfg
    return configs

@router.get("/", response_model=List[Campaign])
def list_campaigns():
    """Return list of available campaign keys and display names."""
    campaigns = []
    for key in sorted(_load_all_configs().keys()):
        display = key.replace('_', ' ').title()
        campaigns.append(Campaign(key=key, display_name=display))
    return campaigns

@router.get("/{key}/keywords", response_model=List[Keyword])
def get_campaign_keywords(key: str):
    """Return keyword hierarchy for the selected campaign."""
    configs = _load_all_configs()
    
    # Handle case-insensitive matching
    campaign_key = None
    for config_key in configs.keys():
        if config_key.lower() == key.lower():
            campaign_key = config_key
            break
    
    if campaign_key is None:
        raise HTTPException(status_code=404, detail=f"Campaign '{key}' not found")
    
    raw = configs[campaign_key]
    keywords = raw.get("keywords", [])
    return [Keyword(id=kw.get('id'), name=kw.get('name'), parent=kw.get('parent'))
            for kw in keywords]