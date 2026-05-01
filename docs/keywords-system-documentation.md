# Keywords System Documentation

## Overview

The Keywords system is a knowledge graph visualization and management feature that tracks keywords, their relationships (connections), and usage analytics across the shopThat application.

---

## File List

### WebDemo (Frontend)
- WebDemo/keywords.html
- WebDemo/keywords-manage.html
- WebDemo/scripts/keywords.js
- WebDemo/scripts/keywords-manage.js
- WebDemo/scripts/shared-data.js
- api/keywords/graph.js

### Backend (Python)
- shopTHAT_V1/graph_rag_backend/src/backend/keywords.py
- shopTHAT_V1/graph_rag_backend/src/backend/keyword_resources.py

### Archive (Parser/FAISS)
- Archive/pangee-parser/faiss/keyword_extractor.py
- Archive/pangee-parser/faiss/keywords.txt
- Archive/pangee-parser/faiss/Murakami_Campaign_keywords.txt
- Archive/pangee-parser/faiss/Kusama_Campaign_keywords.txt
- Archive/pangee-parser/faiss/Jennifer_Connely_Campaing_keywords.txt
- Archive/pangee-parser/faiss/Core_Values_Campaign_keywords.txt
- Archive/pangee-demo/backend/parser/scripts/source_keyword_mapping.py

---

## How Keywords Work (Current Implementation)

### 1. Data Storage (Frontend - localStorage)

Keyword data is still exposed through synchronous browser APIs, but `WebDemo/scripts/shared-data.js`
now validates the localStorage shape and mirrors the same records into IndexedDB as an interim sync
boundary. The long-term target is backend-owned keyword storage through API routes.

Current browser storage keys:

- `st_keywords_v1` - Array of keyword objects
- `st_connections_v1` - Array of relationship objects (source/target pairs)
- `st_chat_analytics_v1` - Analytics data (usage counts, costs, etc.)
- `st_keyword_usage_v1` - Detailed usage tracking per keyword
- `st_chat_sessions_v1` - Chat session data with keyword usage

### 2. Keyword Data Structure

```javascript
{
  id: "Yayoi Kusama",           // Unique identifier
  name: "Yayoi Kusama",         // Display name
  value: 90,                     // Size/importance (10-90 for bubble size)
  group: 1,                      // Hierarchy level (1-4)
  uses: 5,                       // Usage count
  cost: "1.25",                  // Calculated cost ($0.25 per use)
  totalCost: 20000,              // Base cost value
  lastUsed: "2025-01-01T...",   // Last usage timestamp
  created: "2025-01-01T..."     // Creation timestamp
}
```

### 3. Group/Hierarchy Levels

| Group | Color | Description |
|-------|-------|-------------|
| 1 | Purple (#6366F1) | Top Level - Most connected/important keywords |
| 2 | Dark Purple (#5B21B6) | Connected to Top Level |
| 3 | Amber (#F59E0B) | Secondary Connected |
| 4 | Green (#10B981) | Isolated (No Connections) |

### 4. Connection Data Structure

```javascript
{
  source: "Yayoi Kusama",    // Source keyword name
  target: "Louis Vuitton"    // Target keyword name
}
```

---

## Frontend Components

### keywords.html / keywords.js
- **D3.js force-directed graph** visualization
- Displays keywords as bubbles with connections
- Interactive: click to expand, filter, zoom
- Backend-owned graph integration through `api/keywords/graph.js`
- Real-time sync via `shared-data.js` event system

### keywords-manage.html / keywords-manage.js
- CRUD interface for managing keywords
- Add/remove keywords
- Create/remove connections between keywords
- Change hierarchy levels (groups 1-4)
- Search/filter functionality

### shared-data.js (Central Data Manager)
- `window.ShopThatData` global object
- Manages all localStorage operations
- Event system for cross-page synchronization
- Keyword usage tracking
- Chat session integration
- Analytics calculations

---

## Backend Components (Python/FastAPI)

### keywords.py

FastAPI router with these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Get all keywords |
| `/hierarchy` | GET | Get keyword hierarchy with relationships |
| `/hierarchy/{root_id}` | GET | Get subtree from specific keyword |
| `/{keyword_id}/descendants` | GET | Get descendants of keyword |
| `/{keyword_id}/status` | PUT | Enable/disable keyword |
| `/{keyword_id}/resources` | GET | Get resources tagged with keyword |
| `/{keyword_id}/talents` | GET | Get talents tagged with keyword |

### keyword_resources.py
- Additional resource management for keywords
- Links keywords to external resources (articles, images, etc.)

### graphdb.py
- Neo4j database client
- Handles graph database operations

---

## What's Missing for Backend Integration

### 1. API Connection Layer

The frontend currently uses localStorage only. Need to add:

```javascript
// In shared-data.js, add API calls:
async function syncWithBackend() {
  // Fetch keywords from backend
  const response = await fetch('/api/keywords');
  const keywords = await response.json();
  this.saveKeywords(keywords);
}

async function saveKeywordToBackend(keyword) {
  await fetch('/api/keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keyword)
  });
}
```

### 2. Environment Configuration

Need to add:
- API base URL configuration
- Authentication tokens
- Neo4j connection credentials

### 3. Backend Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/keywords` | POST | Create new keyword |
| `PUT /api/keywords/{id}` | PUT | Update keyword |
| `DELETE /api/keywords/{id}` | DELETE | Delete keyword |
| `POST /api/connections` | POST | Create connection |
| `DELETE /api/connections` | DELETE | Delete connection |
| `GET /api/keywords/sync` | GET | Full sync from backend |
| `POST /api/keywords/bulk` | POST | Bulk import keywords |

### 4. Neo4j Schema Required

```cypher
// Keyword node
CREATE (k:Keyword {
  id: string,
  name: string,
  value: integer,
  group: integer,
  uses: integer,
  cost: float
})

// Relationship
CREATE (a:Keyword)-[:RELATED_TO]->(b:Keyword)

// Resources relationship
CREATE (r:Resource)-[:TAGGED_WITH]->(k:Keyword)

// Talents relationship
CREATE (t:Talent)-[:TAGGED_WITH]->(k:Keyword)
```

### 5. Real-time Sync (WebSocket)

For multi-user support, add WebSocket connection:

```javascript
const ws = new WebSocket('wss://api.example.com/keywords/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'keyword_updated') {
    ShopThatData.notifyChange('keywords', data.keywords);
  }
};
```

### 6. Authentication Integration

Keywords endpoints need user authentication:
- JWT token validation
- User-specific keyword permissions
- Campaign-scoped keywords

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ keywords.js  │◄──►│shared-data.js│◄──►│keywords-     │       │
│  │ (D3 Graph)   │    │(Data Manager)│    │manage.js     │       │
│  └──────────────┘    └──────┬───────┘    └──────────────┘       │
│                             │                                    │
│                      localStorage                                │
│                      (current)                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼ (MISSING: API Layer)
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ keywords.py  │◄──►│ graphdb.py   │◄──►│   Neo4j      │       │
│  │ (FastAPI)    │    │(Neo4j Client)│    │  Database    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist for Backend Integration

- [ ] Add API base URL to frontend configuration
- [ ] Create API service layer in shared-data.js
- [ ] Implement POST/PUT/DELETE endpoints in keywords.py
- [ ] Remove mock data from keywords.py, connect to real Neo4j
- [ ] Add authentication middleware to keyword routes
- [ ] Implement WebSocket for real-time sync (optional)
- [ ] Add error handling and offline fallback to localStorage
- [ ] Create database migration scripts for Neo4j schema
- [ ] Add campaign-scoping to keywords (keywords belong to campaigns)
- [ ] Implement keyword import/export functionality

