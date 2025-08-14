# Graph RAG Backend Setup Guide
1. **Install dependencies:**
   ```bash
   poetry install
   ```
## Running the Application

### graph_rag_backend
```bash
cd graph_rag_backend
```
### for windows 

```bash
.venv/Scripts/activate.bat 

```
```bash
cd graph_rag_backend
poetry run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```
### Frontend
```bash
cd frontend
npm install 
npm run