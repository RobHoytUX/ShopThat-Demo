from langchain_community.vectorstores import FAISS
from typing import Tuple, List

MAX_CONTEXT_WORDS = 0

def retrieve_context(query, vectorstore, enabled=None, disabled=None, top_k=2):
    cands = vectorstore.similarity_search(query, k=top_k*2)
    docs, sources = [], []
    for d in cands:
        kws = [kw.lower() for kw in d.metadata.get("keywords",[])]
        if enabled and not any(e.lower() in kws for e in enabled): continue
        if disabled and any(dk.lower() in kws for dk in disabled): continue
        docs.append(d.page_content)
        sources.append(d.metadata.get("url",""))
        if len(docs) >= top_k: break
    if not docs:
        return "No matching campaign information found.", []
    ctx = "\n\n".join(docs)
    words = ctx.split()
    if len(words) > MAX_CONTEXT_WORDS:
        ctx = " ".join(words[:MAX_CONTEXT_WORDS]) + " …"
    return ctx, sources

