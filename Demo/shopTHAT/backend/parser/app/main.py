import os
import re
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from groq import Groq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from .settings import settings
from .llm import GroqLLM
from .retrieval import retrieve_context
from .logger import ConversationLogger
from .evaluation import evaluate_response
from .routers.campaigns import router as campaigns_router

app = FastAPI(title="Pangee Chat Inference")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://5.161.217.209",
    ],
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


@app.on_event("startup")
def startup_event():
    """Initialize heavy resources once at startup."""
    # Optionally skip heavy init in demo
    if os.getenv("DEMO_SKIP_HEAVY") == "1":
        class _DummyLLM:
            def _call(self, prompt: str) -> str:
                return "This is a demo response (LLM disabled)."
        class _DummyStore:
            def similarity_search_with_score(self, query, k=2):
                return []
        app.state.llm = _DummyLLM()
        app.state.embedder = None
        app.state.store = _DummyStore()
        app.state.conv_logger = ConversationLogger()
        print("⚠️  Demo mode: heavy init skipped. Using dummy LLM and empty store.")
        print("✅ Startup complete: demo mode ready.")
        return

    # Groq client & LLM (full init)
    client     = Groq(api_key=settings.GROQ_API_KEY)
    app.state.llm = GroqLLM(client=client)

    # Embeddings & FAISS (with safe fallback)
    app.state.embedder = HuggingFaceEmbeddings(model_name=settings.embedder_model)
    try:
        app.state.store = FAISS.load_local(
            settings.FAISS_STORE_PATH,
            app.state.embedder,
            allow_dangerous_deserialization=True,
        )
    except Exception as e:
        class _DummyStore:
            def similarity_search_with_score(self, query, k=2):
                return []
        app.state.store = _DummyStore()
        print(f"⚠️  FAISS load failed ({e}). Using empty fallback store for demo.")

    # Conversation logger
    app.state.conv_logger = ConversationLogger()

    print("✅ Startup complete: LLM, embeddings, FAISS index, logger ready.")


def format_bot_response(text: str, sources: List[str]) -> str:
    # 0) Normalize newlines
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 1) Cut at the first "sources:" (case-insensitive)
    idx = text.lower().find("sources:")
    if idx != -1:
        text = text[:idx].rstrip()

    # 2) Strip “You:” prefix if present
    text = re.sub(r"^You[:\s]+", "", text).strip()

    # 3) Bulletify blocks under a header
    lines, out, in_block = text.splitlines(), [], False
    for line in lines:
        if re.match(r".+:\s*$", line):
            out.append(line)
            in_block = True
        elif in_block and line.strip():
            clean = re.sub(r"^[\-\–\s]+", "", line)
            out.append(f"- {clean}")
        else:
            in_block = False
            out.append(line)
    text = "\n".join(out).strip()

    return text




class ChatRequest(BaseModel):
    message:  str
    enabled:  List[str] = []
    disabled: List[str] = []


class ChatResponse(BaseModel):
    response:         str
    evaluation:       str
    similarity_score: float
    sources:          List[str]
    image_urls:       List[str]


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    store       = request.app.state.store
    llm         = request.app.state.llm
    conv_logger = request.app.state.conv_logger

    # 1) Retrieval
    ctx, sources, _ = retrieve_context(
        req.message, store, req.enabled, req.disabled, top_k=1
    )

    # 2) Build the prompt
    enabled_str  = ", ".join(req.enabled)  or "None"
    disabled_str = ", ".join(req.disabled) or "None"
    sources_str  = ", ".join(sources)      or "None"

    system_prompt = SYSTEM_PROMPT.format(
        enabled_str   = enabled_str,
        disabled_str  = disabled_str,
        sources_str   = sources_str,
        image_urls_str= ""  # if you need images later
    )

    full_prompt = "\n\n".join([
        system_prompt,
        f"User Request: {req.message}",
        "Relevant Context:",
        ctx,
        "Answer:"
    ])

    # 3) Generate & format
    try:
         raw_resp = llm._call(full_prompt)
    except groq.InternalServerError as e:
        # retry once after a short backoff
         import time
         time.sleep(1)
         try:
             raw_resp = llm._call(full_prompt)
         except groq.InternalServerError:
            # final fallback: return a friendly error to the client
             raise HTTPException(
                status_code=503,
                detail="Our AI backend is temporarily unavailable. Please try again in a few seconds."
             )
    formatted_resp = format_bot_response(raw_resp, sources)

    # 4) Evaluate
    evaluation, sim_score = evaluate_response(
        user_request   = req.message,
        context        = ctx,
        model_response = raw_resp,
    )

    # 5) Log
    conv_logger.add(
        "Assistant", formatted_resp,
        req.enabled, req.disabled,
        sources, evaluation, sim_score
    )

    # 6) Return
    return ChatResponse(
        response         = formatted_resp,
        evaluation       = evaluation,
        similarity_score = sim_score,
        sources          = sources,
        image_urls       = []
    )
