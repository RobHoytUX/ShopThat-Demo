#!/usr/bin/env python3
"""
Startup script for the Graph RAG Backend
This script sets up the Python path correctly and runs the FastAPI server.
"""

import sys
import os
from pathlib import Path

# Add the src directory to Python path
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

# Set up environment variables if .env doesn't exist
if not (project_root / ".env").exists():
    print("Creating .env file with default values...")
    env_content = """# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here
"""
    with open(project_root / ".env", "w") as f:
        f.write(env_content)
    print("Please update the .env file with your actual credentials!")

def main():
    """Main function to start the server"""
    import uvicorn
    from backend.main import app
    
    print("Starting Graph RAG Backend server...")
    print("Make sure you have:")
    print("1. Neo4j running and accessible")
    print("2. GROQ_API_KEY set in your .env file")
    print("3. All dependencies installed (poetry install)")
    
    uvicorn.run(
        app,
        host="localhost",
        port=8000,
        reload=True,
        reload_dirs=[str(project_root)]
    )

# Import and run the FastAPI app
if __name__ == "__main__":
    main() 