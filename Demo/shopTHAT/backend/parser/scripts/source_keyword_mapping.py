import pandas as pd
import logging
from pathlib import Path

# ───────────────────────────────────────────────────────────────
# Logging
# ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)

# ───────────────────────────────────────────────────────────────
# 1a) Keyword sheets (unchanged)
# ───────────────────────────────────────────────────────────────
def load_keyword_sheets(excel_path: str):
    xls = pd.ExcelFile(excel_path, engine="openpyxl")
    rows = []
    processed = []

    for sheet in xls.sheet_names:
        col = (xls.parse(sheet, header=None, usecols=[0])
                  .iloc[:,0].fillna("").astype(str).str.strip())
        blanks = col[col==""].index
        if blanks.empty: 
            continue
        split = blanks[0]
        kws   = col.iloc[1:split].tolist()
        urls  = [u for u in col.iloc[split+1:].tolist() if u.lower().startswith("http")]
        if not urls:
            continue

        logging.info(f"[KWS] {sheet}: {len(kws)} keywords → {len(urls)} URLs")
        processed.append(sheet)
        for u in urls:
            rows.append({
                "campaign": sheet,
                "mapping":  "keyword",
                "keywords": kws,
                "section":  None,
                "question": None,
                "url":      u
            })

    return pd.DataFrame(rows), processed

# ───────────────────────────────────────────────────────────────
# 1b) Questions & Products sheets
# ───────────────────────────────────────────────────────────────
def load_qp_sheets(excel_path: str):
    xls = pd.ExcelFile(excel_path, engine="openpyxl")
    rows = []
    processed = []

    for sheet in xls.sheet_names:
        # peek cell A1
        df0 = xls.parse(sheet, header=None, usecols=[0]).iloc[:,0].fillna("").astype(str)
        if not df0.iloc[0].lower().startswith("questions"):
            continue

        logging.info(f"[Q&P] parsing sheet {sheet}")
        processed.append(sheet)
        df = xls.parse(sheet, header=None, engine="openpyxl")
        section = None

        # start at row index 1 (second row)
        for _, row in df.iterrows():
            a = str(row.iloc[0]).strip()
            if not a:
                continue
            # section header (person name) if no "?" at end
            if not a.endswith("?"):
                section = a
                continue
            # question row
            question = a
            # product URLs live in columns 2 onward
            for u in row.iloc[2:]:
                if pd.isna(u): 
                    continue
                url = str(u).strip()
                if url.lower().startswith("http"):
                    rows.append({
                        "campaign": sheet,
                        "mapping":  "question",
                        "keywords": None,
                        "section":  section,
                        "question": question,
                        "url":      url
                    })

    return pd.DataFrame(rows), processed

# ───────────────────────────────────────────────────────────────
# Single purpose: map Excel → tidy DataFrame
# ───────────────────────────────────────────────────────────────
def get_mapped_data_excel(excel_path: str) -> pd.DataFrame:
    """
    Parse the Excel workbook and return a DataFrame that lists
      • campaign
      • mapping  (keyword|question)
      • keywords (list | None)
      • section  (str  | None)
      • question (str  | None)
      • url      (str)
    No scraping is performed.
    """
    xls = pd.ExcelFile(excel_path, engine="openpyxl")
    all_sheets = xls.sheet_names

    df_kw, kw_sheets = load_keyword_sheets(excel_path)
    df_qp, qp_sheets = load_qp_sheets(excel_path)
    df = pd.concat([df_kw, df_qp], ignore_index=True)

    mapped   = kw_sheets + qp_sheets
    skipped  = [s for s in all_sheets if s not in mapped]

    logging.info(f"Mapped sheets:  {mapped}")
    logging.info(f"Skipped sheets: {skipped}")
    if df.empty:
        raise RuntimeError("No mappings found in any sheet!")

    return df


# ───────────────────────────────────────────────────────────────
# CLI helper
# ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Resolve base project dir two levels up from this file:
    base_dir   = Path(__file__).resolve().parent.parent

    # Define input & output paths relative to project root:
    infile     = base_dir / "data" / "raw"/"spreadsheets" / "keywords_articles_and_products.xlsx"
    output_dir = base_dir / "data" / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)
    outfile    = output_dir / "mapped_metadata_processed.pkl"
    outfile_excel = output_dir / "mapped_metadata_processed.xlsx"

    # Run your mapping function
    df = get_mapped_data_excel(infile)

    # Persist to the processed folder
    df.to_pickle(outfile)
    df.to_excel(outfile_excel)

    logging.info(f"Saved {outfile} with {len(df)} rows")