
import os
import gradio as gr
from opensearchpy import OpenSearch
from langchain_huggingface import HuggingFaceEmbeddings
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# Setup
# -----------------------------
OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST")
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER")
OPENSEARCH_PASS = os.getenv("OPENSEARCH_PASS")
INDEX_NAME = "articles_updated"

EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
embedder = HuggingFaceEmbeddings(model_name=EMBED_MODEL_NAME)

llm_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

client = OpenSearch(
    hosts=[OPENSEARCH_HOST],
    http_auth=(OPENSEARCH_USER, OPENSEARCH_PASS),
    use_ssl=True,
    verify_certs=True,
    ssl_assert_hostname=False,
    ssl_show_warn=False,
)

# -----------------------------
# Helper function
# -----------------------------
def chatbot_fn(message, history):
    # Greeting handling
    greetings = ["hi", "hello", "hey", "thanks", "thank you", "good morning", "good evening"]
    if message.strip().lower() in greetings:
        answer = "Hello 👋 Welcome to our fashion and luxury brand assistant. How can I help you today?"
        return history + [[message, answer]], None

    # Embed query and search
    query_vec = embedder.embed_query(message)
    body = {
        "size": 3,
        "query": {
            "knn": {"embedding": {"vector": query_vec, "k": 3}}
        },
        "_source": ["url", "title", "body", "image_url"],
    }
    try:
        res = client.search(index=INDEX_NAME, body=body)
        hits = res.get("hits", {}).get("hits", [])
    except Exception as e:
        return history + [[message, f"⚠️ Error fetching results: {e}"]], None

    if not hits:
        return history + [[message, "No results found in database."]], None

    # Build context
    context = "\n\n".join(
        [hit["_source"].get("body", "") for hit in hits if hit["_source"].get("body")]
    )

    prompt = f"""
You are a fashion and luxury brand assistant. 
Use only the context below to answer the question. 
If context is insufficient, say so politely.

Context:
{context}

User Question: {message}

Answer:
"""

    # Call Groq LLM
    try:
        completion = llm_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=250,
            temperature=0.7,
        )
        answer = completion.choices[0].message.content
    except Exception as e:
        answer = f"⚠️ Error from LLM: {e}"

    # Take only the first hit’s image
    image_url = hits[0]["_source"].get("image_url")

    return history + [[message, answer]], image_url


# -----------------------------
# Gradio UI
# -----------------------------
with gr.Blocks() as demo:
    gr.Markdown("## 👜 shopTHAT Chatbot — Fashion & Luxury Q&A")

    chatbot = gr.Chatbot(label="Conversation")
    image_output = gr.Image(label="Related Image", type="filepath")

    msg = gr.Textbox(placeholder="Ask me about Louis Vuitton, Kusama, or other brands...")
    clear = gr.ClearButton([msg, chatbot, image_output])

    msg.submit(chatbot_fn, [msg, chatbot], [chatbot, image_output])

demo.launch()
