from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, DefaultDict
from collections import defaultdict
import json

@dataclass(frozen=True)
class Keyword:
    id: str
    name: str
    parent: Optional[str] = None

@dataclass(frozen=True)
class Resource:
    id: str
    url: str
    title: str
    type: str            # news | bio | exhibit | event | shopping | ...
    keywords: List[str]  # keyword ids

class KeywordResourceIndex:
    """
    Loads keyword/resource JSON and provides fast lookups.
    """
    def __init__(self, path: Path):
        raw = json.loads(path.read_text(encoding="utf-8"))

        self.kw_by_id: Dict[str, Keyword] = {}
        self.kw_by_name: Dict[str, str] = {}
        for k in raw["keywords"]:
            kw = Keyword(id=k["id"], name=k["name"], parent=k.get("parent"))
            self.kw_by_id[kw.id] = kw
            self.kw_by_name[kw.name.strip().lower()] = kw.id

        self.res_by_id: Dict[str, Resource] = {}
        self.res_by_kw: DefaultDict[str, List[Resource]] = defaultdict(list)
        for r in raw["resources"]:
            res = Resource(
                id=r["id"],
                url=r["url"],
                title=r["title"],
                type=r["type"],
                keywords=r["keywords"],
            )
            self.res_by_id[res.id] = res
            for kwid in res.keywords:
                self.res_by_kw[kwid].append(res)

        # optional (unused here but available)
        self.talents = raw.get("talents", [])

    def keyword_id_for(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        if value in self.kw_by_id:
            return value
        return self.kw_by_name.get(value.strip().lower())

    def resources_for_kw(self, kw_id: str) -> List[Resource]:
        return list(self.res_by_kw.get(kw_id, []))

    def nonshopping_for_kw(self, kw_id: str) -> List[Resource]:
        return [r for r in self.resources_for_kw(kw_id) if r.type != "shopping"]

    def shopping_for_kw(self, kw_id: str) -> List[Resource]:
        return [r for r in self.resources_for_kw(kw_id) if r.type == "shopping"]
