#!/usr/bin/env python3
# src/backend/chat_session.py

import os
import logging
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

from retrieval import retrieve_and_answer

# ── logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s")
logger = logging.getLogger(__name__)

# ── load env ───────────────────────────────────────────────────────────────
load_dotenv()

def sanitize(name: str) -> str:
    """Lowercase, replace non-alphanum with underscores."""
    return "".join(c.lower() if c.isalnum() else "_" for c in name).strip("_")

def main():
    print("🔎 RAG-driven CLI chat")
    print("Type `quit` or `exit` at any prompt to end and save log.\n")

    # step 1) pick keywords once:
    enabled_raw  = input("Enable keywords (comma-sep; blank=ALL): ").strip()
    if enabled_raw.lower() in ("exit","quit"): return
    disabled_raw = input("Disable keywords (comma-sep; blank=NONE): ").strip()
    if disabled_raw.lower() in ("exit","quit"): return

    enabled_list  = [k.strip() for k in enabled_raw.split(",") if k.strip()] or ["all"]
    disabled_list = [k.strip() for k in disabled_raw.split(",") if k.strip()] or ["none"]

    enabled_str  = "_".join(sanitize(k) for k in enabled_list)
    disabled_str = "_".join(sanitize(k) for k in disabled_list)

    print(f"\n✔️ Using ENABLED={enabled_list}  DISABLED={disabled_list}\n")

    # prepare log accumulator
    sessions = []

    # chat loop
    while True:
        question = input("Question: ").strip()
        if question.lower() in ("exit", "quit"):
            break

        try:
            answer, sources = retrieve_and_answer(
                question,
                enabled=enabled_list,
                disabled=disabled_list,
                top_k=5,
            )
        except Exception as e:
            logger.exception("Retrieval error")
            print("❌ Error:", e)
            continue

        # echo
        print("\n=== Answer ===")
        print(answer)
        # print("\nSources:")
        # for url in sources:
        #     print(" -", url)
        print("\n" + ("─"*40) + "\n")

        # record this turn
        sessions.append({
            "enabled":  "|".join(enabled_list),
            "disabled": "|".join(disabled_list),
            "question": question,
            "answer":   answer,
            "sources":  ";".join(sources),
        })

    # on exit, dump to Excel
    if sessions:
        df = pd.DataFrame(sessions)
        fname = f"{enabled_str}_{disabled_str}_chat_logs.xlsx"
        out_path = Path.cwd() / fname
        df.to_excel(out_path, index=False)
        print(f"\n💾 Saved chat log to {out_path}")

    print("Goodbye!")

if __name__ == "__main__":
    main()
