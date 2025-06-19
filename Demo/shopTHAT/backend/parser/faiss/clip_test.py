import os
import numpy as np
from PIL import Image
import pillow_avif
import torch
from transformers import CLIPProcessor, CLIPModel
import faiss

# 1. Load CLIP model and processor
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def embed_image(image_path):
    # Load image from disk
    image = Image.open(image_path).convert("RGB")
    # Preprocess image for CLIP
    inputs = clip_processor(images=image, return_tensors="pt").to(device)
    # Get image features
    with torch.no_grad():
        embedding = clip_model.get_image_features(**inputs)
    # Normalize to unit vector (important for cosine similarity)
    embedding = embedding / embedding.norm(p=2, dim=-1, keepdim=True)
    return embedding.cpu().numpy().astype(np.float32)

def main():
    image_path = "./downloaded_images/louis-vuitton-christopher-mm--M45419_PM2_Front view.png"  # change this to your image filename
    embedding = embed_image(image_path)

    # 2. Create FAISS index and add embedding
    dim = embedding.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner product (cosine similarity)
    index.add(embedding)

    # 3. Save FAISS index to disk
    faiss.write_index(index, "clip_image.index")
    print(f"Image embedding stored in FAISS index (clip_image.index).")

if __name__ == "__main__":
    main()
