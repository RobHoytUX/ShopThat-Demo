# src/backend/keywords.py
"""
Keywords router for Neo4j operations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from .graphdb import Neo4jGraphClient
import os

router = APIRouter()

# Pydantic models
class KeywordNode(BaseModel):
    id: str
    name: str
    level: Optional[int] = None
    parent: Optional[str] = None

class KeywordHierarchy(BaseModel):
    keywords: List[KeywordNode]
    relationships: List[dict]

class KeywordStatus(BaseModel):
    enabled: bool

class KeywordDescendants(BaseModel):
    descendants: List[KeywordNode]

# Initialize Neo4j client
def get_neo4j_client():
    return Neo4jGraphClient(
        uri=os.getenv("NEO4J_URI"),
        user=os.getenv("NEO4J_USERNAME"),
        password=os.getenv("NEO4J_PASSWORD"),
        database=os.getenv("NEO4J_DATABASE", "neo4j")
    )

@router.get("/", response_model=List[KeywordNode])
async def get_all_keywords():
    """Get all keywords from Neo4j"""
    try:
        # Mock data for development - remove this when Neo4j is properly configured
        keywords = [
            {"id": "art", "name": "Art"},
            {"id": "fashion", "name": "Fashion"},
            {"id": "technology", "name": "Technology"},
            {"id": "culture", "name": "Culture"},
            {"id": "design", "name": "Design"},
            {"id": "innovation", "name": "Innovation"}
        ]
        return keywords
        
        # Uncomment the following lines when Neo4j is properly configured:
        # client = get_neo4j_client()
        # with client.driver.session(database=client.database) as session:
        #     result = session.run("MATCH (k:Keyword) RETURN k.id AS id, k.name AS name")
        #     keywords = [{"id": record["id"], "name": record["name"]} for record in result]
        # client.close()
        # return keywords
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching keywords: {str(e)}")

@router.get("/hierarchy", response_model=KeywordHierarchy)
async def get_keyword_hierarchy(max_depth: int = 5):
    """Get the complete keyword hierarchy"""
    try:
        # Mock data for development - remove this when Neo4j is properly configured
        keywords = [
            {"id": "art", "name": "Art"},
            {"id": "fashion", "name": "Fashion"},
            {"id": "technology", "name": "Technology"},
            {"id": "culture", "name": "Culture"}
        ]
        relationships = [
            {"parent": "art", "child": "fashion"},
            {"parent": "art", "child": "culture"}
        ]
        
        return KeywordHierarchy(keywords=keywords, relationships=relationships)
        
        # Uncomment the following lines when Neo4j is properly configured:
        # client = get_neo4j_client()
        # with client.driver.session(database=client.database) as session:
        #     # Get all keywords
        #     keywords_result = session.run("MATCH (k:Keyword) RETURN k.id AS id, k.name AS name")
        #     keywords = [{"id": record["id"], "name": record["name"]} for record in keywords_result]
        #     
        #     # Get all relationships
        #     rels_result = session.run("MATCH (p:Keyword)-[:HAS_CHILD]->(c:Keyword) RETURN p.id AS parent, c.id AS child")
        #     relationships = [{"parent": record["parent"], "child": record["child"]} for record in rels_result]
        # 
        # client.close()
        # return KeywordHierarchy(keywords=keywords, relationships=relationships)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching hierarchy: {str(e)}")

@router.get("/hierarchy/{root_id}", response_model=List[KeywordNode])
async def get_keyword_subtree(root_id: str, max_depth: int = 5):
    """Get descendants of a specific keyword"""
    try:
        client = get_neo4j_client()
        descendants = client.get_subtree(root_id, max_depth)
        client.close()
        return descendants
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching descendants: {str(e)}")

@router.get("/{keyword_id}/descendants", response_model=KeywordDescendants)
async def get_keyword_descendants(keyword_id: str, max_depth: int = 3):
    """Get descendants of a specific keyword"""
    try:
        client = get_neo4j_client()
        descendants = client.get_subtree(keyword_id, max_depth)
        client.close()
        return KeywordDescendants(descendants=descendants)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching descendants: {str(e)}")

@router.put("/{keyword_id}/status")
async def update_keyword_status(keyword_id: str, status: KeywordStatus):
    """Update keyword enabled/disabled status"""
    try:
        client = get_neo4j_client()
        with client.driver.session(database=client.database) as session:
            # Add or remove enabled property
            if status.enabled:
                session.run(
                    "MATCH (k:Keyword {id: $id}) REMOVE k.disabled SET k.enabled = true",
                    id=keyword_id
                )
            else:
                session.run(
                    "MATCH (k:Keyword {id: $id}) REMOVE k.enabled SET k.disabled = true",
                    id=keyword_id
                )
        client.close()
        return {"message": f"Keyword {keyword_id} status updated to {'enabled' if status.enabled else 'disabled'}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating keyword status: {str(e)}")

@router.get("/{keyword_id}/resources")
async def get_keyword_resources(keyword_id: str):
    """Get resources tagged with a specific keyword"""
    try:
        client = get_neo4j_client()
        with client.driver.session(database=client.database) as session:
            result = session.run("""
                MATCH (r:Resource)-[:TAGGED_WITH]->(k:Keyword {id: $id})
                RETURN r.id AS id, r.title AS title, r.url AS url, r.type AS type
            """, id=keyword_id)
            resources = [record.data() for record in result]
        client.close()
        return resources
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching resources: {str(e)}")

@router.get("/{keyword_id}/talents")
async def get_keyword_talents(keyword_id: str):
    """Get talents tagged with a specific keyword"""
    try:
        client = get_neo4j_client()
        with client.driver.session(database=client.database) as session:
            result = session.run("""
                MATCH (t:Talent)-[:TAGGED_WITH]->(k:Keyword {id: $id})
                RETURN t.id AS id, t.name AS name, t.role AS role, t.url AS url
            """, id=keyword_id)
            talents = [record.data() for record in result]
        client.close()
        return talents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching talents: {str(e)}") 