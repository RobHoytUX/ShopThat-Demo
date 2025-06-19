from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

text_embedder = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
store_path = "faiss_stores/faiss_all_campaigns_text"
store = FAISS.load_local(store_path, text_embedder, allow_dangerous_deserialization=True)


def search_products(query, k=5):
    results = store.similarity_search_with_score(query, k=k)
    for doc, score in results:
        meta = doc.metadata
        print(f"Campaign: {meta.get('campaign', 'unknown')}")
        print(f"Keywords: {meta.get('keywords', 'unknown')}")
        print(f"Product: {meta.get('product_url', 'N/A')}")
        # print(f"Internal Sources: {meta.get('internal_sources', 'N/A')}")
        # print(f"External Sources: {meta.get('external_sources', 'N/A')}")
        print(f"Image: {meta.get('image_url', '')}")
        print(f"Score: {score}")
        print("---")

# Example search
search_products("Roger", k=2)
