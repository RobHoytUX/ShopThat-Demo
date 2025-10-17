# src/backend/graphdb.py
"""
Standalone script to ingest a JSON manifest and store campaign data in Neo4j,
replicating the JSON keyword hierarchy and mappings used by retrieval.py.

Usage:
    poetry run graphdb --manifest path/to/manifest.json \
        [--uri URI --user USER --password PASS --database DB] \
        [--wipe] \
        [--propagate-from kw_louis_vuitton kw_kusama] \
        [--types shopping news bio exhibit event]

Notes:
- Creates unique constraints and helpful indexes (id, name).
- Keeps original links; can optionally propagate tags downward from chosen roots.
"""

import os
import json
import argparse
import logging
from typing import Dict, Any, List, Optional, Iterable
from neo4j import GraphDatabase, Driver
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("graphdb")

class Neo4jGraphClient:
    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None
    ):
        # use CLI args or fallback to environment
        self.uri      = uri      or os.getenv("NEO4J_URI")
        self.user     = user     or os.getenv("NEO4J_USERNAME")
        self.password = password or os.getenv("NEO4J_PASSWORD")
        self.database = database or os.getenv("NEO4J_DATABASE", "neo4j")

        if not (self.uri and self.user and self.password):
            raise ValueError("NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD must be set via CLI or .env")

        self.driver: Driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
        logger.info(f"Connected to Neo4j at {self.uri}, database={self.database}")

    def close(self) -> None:
        self.driver.close()
        logger.info("Neo4j driver closed")

    # --------------------------- Schema --------------------------------------

    def ensure_schema(self) -> None:
        """
        Create uniqueness constraints & indexes used by retrieval.py.
        Safe to re-run (IF NOT EXISTS).
        """
        stmts = [
            # Uniqueness on ids
            "CREATE CONSTRAINT keyword_id IF NOT EXISTS FOR (k:Keyword) REQUIRE k.id IS UNIQUE",
            "CREATE CONSTRAINT resource_id IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT talent_id IF NOT EXISTS FOR (t:Talent) REQUIRE t.id IS UNIQUE",
            # Helpful indexes
            "CREATE INDEX keyword_name IF NOT EXISTS FOR (k:Keyword) ON (k.name)",
            # Optional lowercase helper for faster case-insensitive lookups (retrieval can keep using toLower).
            "CREATE INDEX keyword_name_lc IF NOT EXISTS FOR (k:Keyword) ON (k.name_lc)"
        ]
        with self.driver.session(database=self.database) as s:
            for q in stmts:
                s.run(q)
        logger.info("Schema ensured (constraints & indexes).")

    # ------------------------- Wipe helpers ----------------------------------

    def wipe_labels(self, labels: Iterable[str]) -> None:
        """
        Remove nodes (and relationships) for the provided labels.
        """
        with self.driver.session(database=self.database) as s:
            for lab in labels:
                logger.info(f"Wiping label :{lab}")
                s.run(f"MATCH (n:{lab}) DETACH DELETE n")
        logger.info("Wipe complete.")

    # ---------------------- Ingestion: Keywords -------------------------------

    def create_keyword_hierarchy(self, keywords: Dict[str, Dict[str, Any]]) -> None:
        """
        Create/Upsert Keyword nodes and HAS_CHILD relationships.
        """
        def _create_nodes(tx):
            nodes = [{"id": kw['id'], "name": kw['name']} for kw in keywords.values()]
            tx.run(
                """
                UNWIND $nodes AS node
                MERGE (k:Keyword {id: node.id})
                SET  k.name = node.name,
                     k.name_lc = toLower(node.name)
                """,
                nodes=nodes
            )

        def _create_rels(tx):
            rels = [{"pid": kw['parent'], "cid": kw['id']}
                    for kw in keywords.values() if kw.get('parent')]
            if rels:
                tx.run(
                    """
                    UNWIND $rels AS pair
                    MERGE (p:Keyword {id: pair.pid})
                    MERGE (c:Keyword {id: pair.cid})
                    MERGE (p)-[:HAS_CHILD]->(c)
                    """,
                    rels=rels
                )

        with self.driver.session(database=self.database) as s:
            s.execute_write(_create_nodes)
            s.execute_write(_create_rels)
        logger.info("Keyword hierarchy ingested.")

    # ---------------------- Ingestion: Resources ------------------------------

    def create_resources(self, resources: Dict[str, Dict[str, Any]], keywords: Dict[str, Dict[str, Any]]) -> None:
        """
        Create/Upsert Resource nodes and TAGGED_WITH relationships to Keywords.
        If a resource references a keyword id that doesn't exist in `keywords`,
        we still create a placeholder Keyword node (id-only) so mappings don't break.
        """
        def _create_res_nodes(tx):
            nodes = [
                {"id": r['id'], "title": r['title'], "url": r['url'], "type": r['type']}
                for r in resources.values()
            ]
            tx.run(
                """
                UNWIND $nodes AS res
                MERGE (n:Resource {id: res.id})
                SET n.title = res.title, n.url = res.url, n.type = res.type
                """,
                nodes=nodes
            )

        def _create_missing_keywords(tx):
            # Any keyword ids referenced by resources but not in keywords map
            # get created as placeholder Keyword nodes so relationships succeed.
            refs = []
            for r in resources.values():
                for kid in r.get("keywords", []):
                    if kid not in keywords:
                        refs.append({"id": kid})
            if refs:
                tx.run(
                    """
                    UNWIND $refs AS row
                    MERGE (k:Keyword {id: row.id})
                    ON CREATE SET k.name = row.id, k.name_lc = toLower(row.id)
                    """,
                    refs=refs
                )

        def _create_res_tags(tx):
            tags = []
            for r in resources.values():
                for kw in r.get('keywords', []):
                    tags.append({"rid": r['id'], "kw": kw})
            if tags:
                tx.run(
                    """
                    UNWIND $tags AS tag
                    MATCH (r:Resource {id: tag.rid})
                    MERGE (k:Keyword  {id: tag.kw})
                    MERGE (r)-[:TAGGED_WITH]->(k)
                    """,
                    tags=tags
                )

        with self.driver.session(database=self.database) as s:
            s.execute_write(_create_res_nodes)
            s.execute_write(_create_missing_keywords)
            s.execute_write(_create_res_tags)
        logger.info("Resources ingested.")

    # ----------------------- Ingestion: Talents -------------------------------

    def create_talents(self, talents: Dict[str, Dict[str, Any]], keywords: Dict[str, Dict[str, Any]]) -> None:
        """
        Create/Upsert Talent nodes and TAGGED_WITH relationships to Keywords.
        Creates placeholder Keywords for any missing references (like resources).
        """
        def _create_tal_nodes(tx):
            nodes = [
                {"id": t['id'], "name": t['name'], "role": t['role'], "url": t['url']}
                for t in talents.values()
            ]
            tx.run(
                """
                UNWIND $nodes AS tal
                MERGE (n:Talent {id: tal.id})
                SET n.name = tal.name, n.role = tal.role, n.url = tal.url
                """,
                nodes=nodes
            )

        def _create_missing_keywords(tx):
            refs = []
            for t in talents.values():
                for kid in t.get("keywords", []):
                    if kid not in keywords:
                        refs.append({"id": kid})
            if refs:
                tx.run(
                    """
                    UNWIND $refs AS row
                    MERGE (k:Keyword {id: row.id})
                    ON CREATE SET k.name = row.id, k.name_lc = toLower(row.id)
                    """,
                    refs=refs
                )

        def _create_tal_tags(tx):
            tags = []
            for t in talents.values():
                for kw in t.get('keywords', []):
                    tags.append({"tid": t['id'], "kw": kw})
            if tags:
                tx.run(
                    """
                    UNWIND $tags AS tag
                    MATCH (t:Talent  {id: tag.tid})
                    MERGE (k:Keyword {id: tag.kw})
                    MERGE (t)-[:TAGGED_WITH]->(k)
                    """,
                    tags=tags
                )

        with self.driver.session(database=self.database) as s:
            s.execute_write(_create_tal_nodes)
            s.execute_write(_create_missing_keywords)
            s.execute_write(_create_tal_tags)
        logger.info("Talents ingested.")

    # ----------------------- Helpers & Queries --------------------------------

    def get_subtree(self, root_id: str, max_depth: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch descendant keywords up to max_depth.
        """
        query = (
            f"MATCH (r:Keyword {{id: $root}})-[:HAS_CHILD*1..{max_depth}]->(d:Keyword) "
            f"RETURN d.id AS id, d.name AS name ORDER BY d.name"
        )
        with self.driver.session(database=self.database) as s:
            result = s.run(query, root=root_id)
            return [rec.data() for rec in result]

    # ----------------------- Downward Inheritance -----------------------------

    def propagate_downward(
        self,
        roots: Iterable[str],
        types: Iterable[str] = ("shopping",),
        include_root: bool = True
    ) -> None:
        """
        For each root keyword:
          - Find the root's subtree (root + descendants if include_root)
          - For every Resource of the given types that is already TAGGED_WITH any keyword in that subtree,
            add TAGGED_WITH edges to *all* keywords in that subtree (downward inheritance).
        Keeps original tags; creates missing ones; avoids duplicates via MERGE.
        """
        roots = list(roots or [])
        types = [t.lower() for t in types or []]
        if not roots or not types:
            logger.info("Propagation skipped (no roots or no types).")
            return

        with self.driver.session(database=self.database) as s:
            for root in roots:
                logger.info(f"Propagating downward from root={root} for types={types}")
                s.run(
                    """
                    // Collect the scope (root + descendants)
                    MATCH (root:Keyword {id: $root})
                    MATCH (root)-[:HAS_CHILD*0..]->(d:Keyword)
                    WITH collect(DISTINCT d) AS scope, $types AS tlist
                    // For each resource of selected types already inside scope, add tags to every keyword in scope
                    UNWIND tlist AS t
                    MATCH (r:Resource {type: t})-[:TAGGED_WITH]->(k:Keyword)
                    WHERE k IN scope
                    WITH DISTINCT r, scope
                    UNWIND scope AS trg
                    MERGE (r)-[:TAGGED_WITH]->(trg)
                    """,
                    root=root, types=types
                )
        logger.info("Propagation completed.")

# ------------------------------------------------------------------------------
# Manifest loader
# ------------------------------------------------------------------------------

def load_manifest(path: str) -> Dict[str, Any]:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

# ------------------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest JSON manifest into Neo4j")
    parser.add_argument('--manifest', required=True, help='Path to campaign JSON manifest')
    parser.add_argument('--uri', help='Neo4j Bolt URI (overrides NEO4J_URI)')
    parser.add_argument('--user', help='Neo4j username (overrides NEO4J_USERNAME)')
    parser.add_argument('--password', help='Neo4j password (overrides NEO4J_PASSWORD)')
    parser.add_argument('--database', help='Neo4j database name (overrides NEO4J_DATABASE)')
    parser.add_argument('--wipe', action='store_true', help='Wipe existing :Keyword, :Resource, :Talent before ingest')
    parser.add_argument('--propagate-from', nargs='*', default=[], help='Keyword IDs to propagate downward from (e.g. kw_louis_vuitton kw_kusama)')
    parser.add_argument('--types', nargs='*', default=['shopping'], help='Resource types to propagate (default: shopping)')
    args = parser.parse_args()

    data = load_manifest(args.manifest)
    keywords  = {kw['id']: kw for kw in data.get('keywords', [])}
    resources = {r['id']: r for r in data.get('resources', [])}
    talents   = {t['id']: t for t in data.get('talents', [])}

    client = Neo4jGraphClient(
        uri=args.uri,
        user=args.user,
        password=args.password,
        database=args.database
    )
    try:
        client.ensure_schema()
        if args.wipe:
            client.wipe_labels(["Keyword", "Resource", "Talent"])

        client.create_keyword_hierarchy(keywords)
        client.create_resources(resources, keywords)
        client.create_talents(talents, keywords)

        # Optional propagation (e.g., from kw_louis_vuitton → all descendants, products only)
        if args.propagate_from:
            client.propagate_downward(roots=args.propagate_from, types=args.types, include_root=True)

        # Sample subtree for verification
        first = next(iter(keywords)) if keywords else None
        if first:
            subtree = client.get_subtree(first)
            logger.info("Sample subtree for %s (%d kids): %s", first, len(subtree), subtree[:10])
    finally:
        client.close()

if __name__ == "__main__":
    main()
