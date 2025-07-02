# backend/parser/app/evaluation.py

import mlflow
from groq import Groq
from .settings import settings
from .llm import GroqLLM
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from pathlib import Path

# ——— Load judge‐prompt from file ———
PROMPT_PATH = Path(__file__).parent / "prompts" / "judge_prompt.txt"
JUDGE_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

judge_template = PromptTemplate(
    input_variables=["user_request", "context", "model_response"],
    template=JUDGE_PROMPT
)

# ——— Instantiate a “judge” LLMChain ———
_judge_llm = GroqLLM(
    client=Groq(api_key=settings.GROQ_API_KEY),
    primary_model=settings.primary_model,
    fallback_model=settings.fallback_model,
    temperature=settings.temperature
)
_judge_chain = LLMChain(llm=_judge_llm, prompt=judge_template)

# ——— Embedding model for similarity ———
_embedder = HuggingFaceEmbeddings(model_name=settings.embedder_model)

def evaluate_response(user_request: str, context: str, model_response: str):
    """
    Returns (evaluation_text, similarity_score) and logs both to MLflow.
    """
    # 1) Log the assistant response
    mlflow.log_text(model_response, artifact_file="assistant_response.txt")

    # 2) Judge with LLMChain
    eval_txt = _judge_chain.predict(
        user_request=user_request,
        context=context,
        model_response=model_response
    ).strip()
    mlflow.log_text(eval_txt, artifact_file="evaluation.txt")

    # 3) Compute embedding‐based similarity
    embeddings = _embedder.embed_documents([model_response, eval_txt])
    sim_score = float(cosine_similarity(np.array(embeddings))[0,1])
    mlflow.log_metric("similarity_score", sim_score)

    return eval_txt, sim_score
