# Pangee Chat Inference Service  

## Overview  
Pangee Chat is an AI-powered chatbot application featuring a FastAPI backend microservice and a Next.js front-end interface. The chatbot acts as a Louis Vuitton Style Advisor, delivering concise, contextually enriched responses by leveraging a combination of vector-based retrieval and large language model orchestration.

---

## Repository Structure  
```
PANGEE-API/
├── pangeevenv/                      # Python virtual environment
├── backend/                         # Python services
│   └── parser/
│       ├── app/                     # FastAPI application
│       │   ├── prompts/             # System and evaluation prompt templates
│       │   │   ├── system_prompt.txt
│       │   │   └── judge_prompt.txt
│       │   ├── main.py              # FastAPI entry point and routing
│       │   ├── settings.py          # Configuration loader (YAML + .env)
│       │   ├── llm.py               # GroqLLM wrapper for model calls
│       │   ├── retrieval.py         # Context retrieval using FAISS
│       │   ├── logger.py            # Conversation logging utility
│       │   ├── evaluation.py        # Response evaluation and scoring
│       │   └── config.yaml          # Configuration for LLM, FAISS, embeddings
│       ├── data/                    # Data artifacts
│       │   ├── raw_spreadsheets/    # Source campaign data
│       │   └── processed/           # Derived artifacts and pickles
│       └── faiss/                   # FAISS index store and pickle files
└── frontend/                        # Next.js user interface
    ├── pages/                       # Page routes and API proxies
    │   └── api/chat.ts              # Front-end to back-end bridge
    ├── components/                  # React UI components
    ├── public/                      # Static assets
    ├── styles/                      # CSS and design system
    └── package.json                 # Front-end dependencies and scripts
```

---

## Prerequisites  
- **Node.js** v18 or higher  
- **Python** v3.10 or higher  
- **pip** package manager  
- **npm** or **yarn**  

---

## Backend Installation and Setup  
1. **Activate Virtual Environment**  
   ```bash
   cd PANGEE-API
   # Windows PowerShell
   .\pangeevenv\Scripts\Activate.ps1
   # macOS/Linux
   source pangeevenv/bin/activate
   ```
2. **Install Dependencies**  
   ```bash
   cd backend/parser/app
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables**  
   - Create or update `.env` at project root:  
     ```ini
     GROQ_API_KEY=your_api_key_here
     ```
4. **Adjust Configuration**  
   - Edit `config.yaml` to set FAISS paths and embedding model:  
     ```yaml
     faiss:
       store_path: "../faiss/faiss_store_metadata_content"
       pickle_path: "../faiss/faiss_vectorstore_metadata_content.pkl"
     embeddings:
       model_name: all-MiniLM-L6-v2
     ```
5. **Launch FastAPI Server**  
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
6. **Test the API**  
   - Open Swagger UI at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
   - Use the `/chat` endpoint with a payload such as:  
     ```json
     {
       "message": "Who is Roger Federer?",
       "enabled": ["Roger Federer"],
       "disabled": []
     }
     ```

---

## Frontend Development  
1. **Install Front-End Dependencies**  
   ```bash
   cd frontend
   npm install # or yarn install
   ```
2. **Start Development Server**  
   ```bash
   npm run dev # or yarn dev
   ```
3. **Integrate with Backend**  
   - Ensure API proxy (`pages/api/chat.ts`) points to FastAPI backend.  
   - Configure CORS if needed to allow cross-origin requests.  

---

## Development Workflow  
- **Hot Reloading**: Backend uses `--reload`, Frontend uses Next.js hot reload.  
- **Configuration**: Store non-sensitive settings in `config.yaml` and secrets in `.env`.  
- **Data Refresh**: Update raw data in `data/raw_spreadsheets/` and re-run processor scripts to regenerate `data/processed/`.  

---

## Additional Notes  
- **Logging**: Conversation logs are exported to Excel via `ConversationLogger`.  
- **Evaluation**: Responses are scored by a secondary LLM judge and cosine similarity.  
- **Extensibility**: Prompt templates and evaluation logic are modular for easy updates.  

---

## Contact and Support  
For questions or issues, please reach out to the AI Engineering team.

