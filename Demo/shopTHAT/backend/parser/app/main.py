import os
import re
from pathlib import Path
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import pickle
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from backend.parser.app.settings import settings
from backend.parser.app.llm import GroqLLM
from backend.parser.app.retrieval import retrieve_context
from backend.parser.app.logger import ConversationLogger
from backend.parser.app.evaluation import evaluate_response

# import your campaigns router
from backend.parser.app.routers.campaigns import router as campaigns_router

app = FastAPI(title="Pangee Chat Inference")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns_router, prefix="/api")

# load system prompt
BASE_DIR    = Path(__file__).parent
PROMPT_PATH = BASE_DIR / "prompts" / "system_prompt.txt"
if not PROMPT_PATH.exists():
    raise FileNotFoundError(f"Could not find prompt file at {PROMPT_PATH}")
SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

# init LLM, embeddings, FAISS, logger
# print("Groq API Key:", settings.GROQ_API_KEY)
client     = Groq(api_key=settings.GROQ_API_KEY)
llm        = GroqLLM(client=client)
embedder   = HuggingFaceEmbeddings(model_name=settings.embedder_model)
store = FAISS.load_local(
    settings.FAISS_PICKLE_PATH,
    embedder,
    allow_dangerous_deserialization=True
)
conv_logger = ConversationLogger()


def format_bot_response(text: str, sources: List[str]) -> str:
    # 1) Strip “You:” prefix
    text = re.sub(r"^You[:\s]+", "", text).strip()

    # 2) Bulletify EVERY block under a “Something:” header
    lines = text.splitlines()
    out = []
    in_block = False

    for line in lines:
        if re.match(r".+:\s*$", line):
            out.append(line)
            in_block = True
            continue

        if in_block:
            if not line.strip():
                in_block = False
                out.append(line)
                continue
            clean = re.sub(r'^[\-\–\s]+', '', line)
            out.append(f"- {clean}")
            continue

        out.append(line)

    text = "\n".join(out)

    # 3) Remove any trailing “Sources:” section (to ensure we append a fresh one)
    text = re.sub(r"(?is)\n*Sources:.*$", "", text).rstrip()

    # 4) (Removed) Inline-cite logic

    # 5) Optionally append sources as a list at the end (not inlined)
    if sources:
        text += "\n\nSources:\n" + "\n".join(f"- {u}" for u in sources)

    return text

# chat endpoint
class ChatRequest(BaseModel):
    message: str
    enabled: List[str] = []
    disabled: List[str] = []

class ChatResponse(BaseModel):
    response:         str
    evaluation:       str
    similarity_score: float
    sources:          List[str]
    image_urls:       List[str]

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # print(">>> User Request:", req.message)
    # print(">>> Enabled Keywords:", req.enabled)
    # print(">>> Disabled Keywords:", req.disabled)
    # print(">>> FAISS Store Path:", store.)
    ctx, sources, image_urls = retrieve_context(
        req.message, store, req.enabled, req.disabled, top_k=1
    )

    print(">>> CONTEXT:\n", ctx)
    print(">>> Img SOURCES\n:", image_urls)
    # print(">>> URL SOURCES\n:", sources)

    enabled_str   = ", ".join(req.enabled)   or  "None"
    disabled_str  = ", ".join(req.disabled)  or  "None"
    sources_str   = ", ".join(sources)       or  "None"
    image_urls_str = ", ".join(image_urls) or "None"
    system_prompt = SYSTEM_PROMPT.format(
        enabled_str=enabled_str,
        disabled_str=disabled_str,
        sources_str=sources_str,
        image_urls_str = image_urls 
    )

    full_prompt = "\n\n".join([
        system_prompt,
        f"User Request: {req.message}",
        "Relevant Context:",
        ctx,
        "Answer:"
    ])
    # print(">>> FULL PROMPT:\n", full_prompt)
    raw_resp = llm._call(full_prompt)
    formatted_resp = format_bot_response(raw_resp, sources)
    print(">>> FINAL BOT TEXT:\n", formatted_resp) 

    evaluation, sim_score = evaluate_response(
        user_request= req.message,
        context=      ctx,
        model_response= raw_resp
    )

    conv_logger.add(
        "Assistant", formatted_resp,
        req.enabled, req.disabled,
        sources, evaluation, sim_score
    )

    return ChatResponse(
        response=         formatted_resp,
        evaluation=       evaluation,
        similarity_score= sim_score,
        sources=          sources,
        image_urls=       image_urls 
    )
