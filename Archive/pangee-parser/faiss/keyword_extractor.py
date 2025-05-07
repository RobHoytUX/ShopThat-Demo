import os
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
import yake

INPUT_DIR = '/data/html'
OUTPUT_FILE = '/data/keywords.txt'

model = SentenceTransformer('all-MiniLM-L6-v2')
kw_extractor = yake.KeywordExtractor(lan="en", n=1, top=15)

def extract_text(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        html = file.read()
    soup = BeautifulSoup(html, 'html.parser')
    for s in soup(['script', 'style']):
        s.decompose()
    return ' '.join(soup.get_text(separator=' ').split())

def extract_keywords(text, num_keywords=15):
    keywords = kw_extractor.extract_keywords(text)
    keywords = sorted(keywords, key=lambda x: x[1])
    return [kw for kw, _ in keywords[:num_keywords]]

def main():
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.html')]
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_file:
        for filename in files:
            text = extract_text(os.path.join(INPUT_DIR, filename))
            keywords = extract_keywords(text)
            out_file.write(f"{filename}:\n")
            out_file.write(", ".join(keywords) + "\n\n")

if __name__ == "__main__":
    main()
