from __future__ import annotations

from typing import List, Optional, Union

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    top_k: int = 5
    enabled: Optional[Union[List[str], str]] = None
    disabled: Optional[Union[List[str], str]] = None
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


class KeywordNode(BaseModel):
    id: str
    name: str
    level: Optional[int] = None
    parent: Optional[str] = None


class KeywordRelationship(BaseModel):
    parent: str
    child: str


class KeywordHierarchy(BaseModel):
    keywords: List[KeywordNode]
    relationships: List[KeywordRelationship]


class KeywordStatus(BaseModel):
    enabled: bool


class KeywordDescendants(BaseModel):
    descendants: List[KeywordNode]
