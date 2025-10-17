import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from opensearchpy import OpenSearch
from langchain_huggingface import HuggingFaceEmbeddings
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ----------------------------- 
# FastAPI App Setup
# -----------------------------
app = FastAPI(
    title="ShopTHAT Fashion Chatbot API",
    description="Fashion and luxury brand assistant API with vector search",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------- 
# Configuration
# -----------------------------
OPENSEARCH_HOST = "https://search-shopthat-dev-ec6a22ktl674bj5excnzjpck4e.us-east-1.es.amazonaws.com"
OPENSEARCH_USER = "sai"
OPENSEARCH_PASS = "Saiprudvi_09$1234"
INDEX_NAME = "articles_updated"

EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Initialize components
embedder = HuggingFaceEmbeddings(model_name=EMBED_MODEL_NAME)
llm_client = Groq(api_key="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")

client = OpenSearch(
    hosts=[OPENSEARCH_HOST],
    http_auth=(OPENSEARCH_USER, OPENSEARCH_PASS),
    use_ssl=True,
    verify_certs=True,
    ssl_assert_hostname=False,
    ssl_show_warn=False,
)

# ----------------------------- 
# Pydantic Models
# -----------------------------
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    image_urls: List[str] = []

class HealthResponse(BaseModel):
    status: str
    message: str

# ----------------------------- 
# Helper Functions
# -----------------------------
def is_greeting(message: str) -> bool:
    """Check if message is a greeting"""
    greetings = ["hi", "hello", "hey", "thanks", "thank you", "good morning", "good evening"]
    return message.strip().lower() in greetings

def search_opensearch(query: str, size: int = 3) -> List[Dict[str, Any]]:
    """Search OpenSearch with vector similarity"""
    try:
        query_vec = embedder.embed_query(query)
        body = {
            "size": size,
            "query": {
                "knn": {"embedding": {"vector": query_vec, "k": size}}
            },
            "_source": ["url", "title", "body", "image_url"],
        }
        
        res = client.search(index=INDEX_NAME, body=body)
        hits = res.get("hits", {}).get("hits", [])
        return hits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenSearch error: {str(e)}")

def generate_answer(context: str, question: str) -> str:
    """Generate answer using Groq LLM"""
    prompt = f"""You are a fashion and luxury brand assistant.

Use only the context below to answer the question.

If context is insufficient, say so politely.

Context: {context}

User Question: {question}

Answer:"""
    
    try:
        completion = llm_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=250,
            temperature=0.7,
        )
        return completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

# ----------------------------- 
# API Endpoints
# -----------------------------
@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="ShopTHAT Fashion Chatbot API is running"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check"""
    try:
        # Test OpenSearch connection
        client.cluster.health()
        return HealthResponse(
            status="healthy",
            message="All services are operational"
        )
    except Exception as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Service unhealthy: {str(e)}"
        )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatMessage):
    """Main chat endpoint"""
    message = request.message.strip()
    
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Handle greetings
    if is_greeting(message):
        return ChatResponse(
            answer="Hello 👋 Welcome to our fashion and luxury brand assistant. How can I help you today?",
            image_urls=[]
        )
    
    # Search for relevant documents
    hits = search_opensearch(message)
    
    if not hits:
        return ChatResponse(
            answer="No results found in database. Please try a different question about fashion and luxury brands.",
            image_urls=[]
        )
    
    # Build context from search results
    context = "\n\n".join([
        hit["_source"].get("body", "") 
        for hit in hits 
        if hit["_source"].get("body")
    ])
    
    if not context:
        return ChatResponse(
            answer="I found some results but couldn't extract relevant information. Please try rephrasing your question.",
            image_urls=[]
        )
    
    # Generate answer
    answer = generate_answer(context, message)
    
    # Extract top 3 image URLs
    image_urls = []
    for hit in hits[:3]:  # Limit to top 3
        img_url = hit["_source"].get("image_url")
        if img_url and img_url not in image_urls:  # Avoid duplicates
            image_urls.append(img_url)
    
    return ChatResponse(
        answer=answer,
        image_urls=image_urls
    )

@app.get("/search", response_model=Dict[str, Any])
async def search_endpoint(q: str, size: int = 3):
    """Direct search endpoint for testing"""
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' cannot be empty")
    
    hits = search_opensearch(q, size)
    
    return {
        "query": q,
        "total_hits": len(hits),
        "results": [hit["_source"] for hit in hits]
    }

# ----------------------------- 
# Run the app
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",  # Assuming this file is named main.py
        host="0.0.0.0",
        port=8000,
        reload=True
    )