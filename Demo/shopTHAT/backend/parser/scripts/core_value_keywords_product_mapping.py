#!/usr/bin/env python3
import os
import pandas as pd
import json
from urllib.parse import urlparse

# ── PATHS ───────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH  = os.path.join(BASE_DIR, "..", "data", "raw",
                           "spreadsheets", "keywords_articles_and_products.xlsx")
OUTPUT_JSON = os.path.join(BASE_DIR, "..", "data", "campaigns",
                           "core_values_campaign.json")

if not os.path.exists(EXCEL_PATH):
    raise FileNotFoundError(f"Excel not found: {EXCEL_PATH!r}")

# ── HARD‐CODED SHEETS ─────────────────────────────────────────────────────────
KW_SHEET = "Core Values Campaign & Keywords"
PI_SHEET = "Core Values Product & Images"

# ── 1) LOAD & NORMALIZE KEYWORDS SHEET ───────────────────────────────────────
df_kw = pd.read_excel(EXCEL_PATH, sheet_name=KW_SHEET)
df_kw.columns = [c.strip().lower() for c in df_kw.columns]
kw_col  = next(c for c in df_kw.columns if "keyword" in c)
src_col = next(c for c in df_kw.columns if "source"  in c)

# build keyword‐objects
raw_keywords = df_kw[kw_col].dropna().astype(str).str.strip().unique().tolist()
keywords = [{"name": k, "enabled": True} for k in raw_keywords]

# split sources
raw_sources = df_kw[src_col].dropna().astype(str).str.strip().tolist()
internal_sources, external_sources = [], []
for url in raw_sources:
    entry = {"name": url, "enabled": True}
    host  = urlparse(url).netloc.lower()
    if host.endswith("lvmh.com") or host.endswith("louisvuitton.com"):
        internal_sources.append(entry)
    else:
        external_sources.append(entry)

# ── 2) LOAD & NORMALIZE PRODUCTS SHEET ───────────────────────────────────────
df_pi = pd.read_excel(EXCEL_PATH, sheet_name=PI_SHEET)
df_pi.columns = [c.strip().lower() for c in df_pi.columns]
prod_col  = next(c for c in df_pi.columns if "product" in c)
image_col = next((c for c in df_pi.columns if "image" in c), None)

# ── 3) BUILD OUTPUT STRUCTURE ───────────────────────────────────────────────
output = {
    "keywords":         keywords,
    "internal_sources": internal_sources,
    "external_sources": external_sources,
    "products":         []
}

for _, row in df_pi.iterrows():
    p = row.get(prod_col)
    if pd.isna(p):
        continue
    output["products"].append({
        "product_url": str(p).strip(),
        "image_url":   str(row[image_col]).strip() if image_col and pd.notna(row[image_col]) else None
    })

# ── 4) WRITE IT OUT ─────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(output['products'])} products to '{OUTPUT_JSON}'")
