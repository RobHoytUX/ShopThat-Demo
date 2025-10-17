import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from groq import Groq
import pickle
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# ← add these imports
from pathlib import Path
from settings import settings
from llm import GroqLLM
from retrieval import retrieve_context
from logger import ConversationLogger
from evaluation import evaluate_response


app = FastAPI(title="Pangee Chat Inference")

# Load your system prompt from disk
BASE_DIR = Path(__file__).parent  # points to backend/parser/app
PROMPT_PATH = BASE_DIR / "prompts" / "system_prompt.txt"

if not PROMPT_PATH.exists():
    raise FileNotFoundError(f"Could not find prompt file at {PROMPT_PATH}")

with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

# Initialize everything else…
print(settings.GROQ_API_KEY)
client    = Groq(api_key=settings.GROQ_API_KEY)
llm       = GroqLLM(client=client)
embedder  = HuggingFaceEmbeddings(model_name=settings.embedder_model)

# load or unpickle your FAISS store…
with open(settings.FAISS_PICKLE_PATH, "rb") as f:
        store = pickle.load(f)

conv_logger = ConversationLogger()

class ChatRequest(BaseModel):
    message: str
    enabled: List[str] = []
    disabled: List[str] = []

class ChatResponse(BaseModel):
    response: str
    evaluation: str
    similarity_score: float
    sources: List[str]

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # 1) retrieve context
    ctx, sources = retrieve_context(req.message,
                                    store,
                                    req.enabled,
                                    req.disabled,
                                    top_k=1)
    
    # 2) build your enabled/disabled strings
    enabled_str  = ", ".join(req.enabled)  or "None"
    disabled_str = ", ".join(req.disabled) or "None"


    # 3) render a full prompt by appending the user + context
    full_prompt = (
        SYSTEM_PROMPT
        + "\n\nUser Request: "
        + req.message
        + "\n\nRelevant Context:\n"
        + ctx
        + "\n\nAnswer:"
    )

    # 4) get your response
    resp = llm._call(full_prompt)

    # 5) now evaluate
    evaluation, sim_score = evaluate_response(
        user_request=req.message,
        context=ctx,
        model_response=resp
    )

    # log to your in-memory logger
    conv_logger.add(
        "Assistant",
        resp,
        req.enabled,
        req.disabled,
        sources,
        evaluation,
        sim_score
    )


    return ChatResponse(
        response=resp,
        evaluation=evaluation,
        similarity_score=sim_score,
        sources=sources
    )
