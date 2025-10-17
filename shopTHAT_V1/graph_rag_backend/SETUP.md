# Graph RAG Backend Setup Guide

## Prerequisites

1. **Python 3.10+** installed
2. **Poetry** installed for dependency management
3. **Neo4j** database running (local or remote)
4. **Groq API key** for LLM inference

## Installation

1. **Install dependencies:**
   ```bash
   poetry install
   ```

2. **Create environment file:**
   Create a `.env` file in the project root with:
   ```env
   # Neo4j Configuration
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   NEO4J_DATABASE=neo4j

   # Groq API Configuration
   GROQ_API_KEY=your_groq_api_key_here
   ```

## Running the Application

### Method 1: Using the startup script (Recommended)
```bash
cd graph_rag_backend
python run_server.py
```

### Method 2: Using Poetry directly
```bash
cd graph_rag_backend
poetry run python run_server.py
```

### Method 3: Using uvicorn directly
```bash
cd graph_rag_backend
poetry run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Data Setup

1. **Load campaign data into Neo4j:**
   ```bash
   poetry run python src/backend/graphdb.py --manifest src/campaigns_manifest/kusama_campaign.json
   ```

2. **Generate embeddings:**
   ```bash
   poetry run python src/backend/embed_mapping.py
   ```

## API Endpoints

- `GET /api/campaigns` - List available campaigns
- `GET /api/campaigns/{key}/keywords` - Get campaign keywords
- `GET /api/keywords` - Get all keywords
- `GET /api/keywords/hierarchy` - Get keyword hierarchy
- `POST /api/chat` - Chat endpoint

## Troubleshooting

### Import Errors
If you get "No module named 'backend'" errors:
1. Make sure you're running from the `graph_rag_backend` directory
2. Use the `run_server.py` script which sets up the Python path correctly
3. Or set the PYTHONPATH: `export PYTHONPATH=$PYTHONPATH:./src`

### Neo4j Connection Issues
1. Ensure Neo4j is running and accessible
2. Check your `.env` file has correct credentials
3. Test connection: `poetry run python -c "from backend.graphdb import Neo4jGraphClient; print('Connected!')"`

### Missing Dependencies
1. Run `poetry install` to install all dependencies
2. If using a different Python version, ensure it's compatible (3.10+)

## Development

The application structure:
```
graph_rag_backend/
├── src/
│   ├── backend/          # Main application code
│   └── campaigns_manifest/ # Campaign data files
├── faiss_stores/         # Vector embeddings
├── pyproject.toml        # Poetry configuration
├── run_server.py         # Startup script
└── .env                  # Environment variables
``` 