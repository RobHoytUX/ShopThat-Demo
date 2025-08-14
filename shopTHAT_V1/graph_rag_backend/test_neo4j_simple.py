from neo4j import GraphDatabase
import os

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

print("🔍 Testing Neo4j Connection")
print("=" * 40)

try:
    URI      = os.environ["NEO4J_URI"]
    USER     = os.environ["NEO4J_USERNAME"]
    PASSWORD = os.environ["NEO4J_PASSWORD"]
    DATABASE = os.environ.get("NEO4J_DATABASE", "neo4j")

    print(f"URI: {URI}")
    print(f"USER: {USER}")
    print(f"DATABASE: {DATABASE}")
    print(f"PASSWORD: {'*' * len(PASSWORD) if PASSWORD else 'Not set'}")

    # create driver
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    # verify network connectivity
    driver.verify_connectivity()  
    print("✅ Connected successfully to Neo4j!")

    # open a session and run a trivial query
    with driver.session(database=DATABASE) as session:
        result = session.run("RETURN 1 AS n")
        print("Neo4j says:", result.single()["n"])
        
    driver.close()
    print("✅ Test completed successfully!")

except KeyError as e:
    print(f"❌ Missing environment variable: {e}")
    print("Please check your .env file")
except Exception as e:
    print(f"❌ Connection failed: {e}") 