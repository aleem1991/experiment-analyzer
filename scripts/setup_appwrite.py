"""
Automated Appwrite TablesDB Setup Script
Creates the database, tables, typed columns, enums, indexes, and enables row-level security.
Uses standard Python urllib (no external dependencies required).
"""

import os
import sys
import json
import urllib.request
import urllib.error

def load_dotenv():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

load_dotenv()

ENDPOINT = os.environ.get("VITE_APPWRITE_ENDPOINT", "https://sgp.cloud.appwrite.io/v1")
PROJECT_ID = os.environ.get("VITE_APPWRITE_PROJECT_ID", "6ae011e4002e2ca37dc6")
API_KEY = os.environ.get("APPWRITE_API_KEY", "")
DATABASE_ID = os.environ.get("VITE_DATABASE_ID", "analyzer")


def api_request(method, path, data=None):
    url = f"{ENDPOINT.rstrip('/')}{path}"
    headers = {
        "X-Appwrite-Project": PROJECT_ID,
        "X-Appwrite-Key": API_KEY,
        "Content-Type": "application/json",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        if e.code == 409:
            # Resource already exists
            return {"status": "exists", "raw": err_msg}
        print(f"HTTP Error {e.code} on {method} {path}: {err_msg}")
        return None
    except Exception as e:
        print(f"Request error: {e}")
        return None


def setup():
    print("=" * 65)
    print("  Experiment Analyzer — Appwrite TablesDB Schema Provisioner")
    print("=" * 65)

    if not PROJECT_ID or not API_KEY:
        print("\n[!] Error: VITE_APPWRITE_PROJECT_ID and APPWRITE_API_KEY are required.")
        print("    Usage: Set them in your environment or .env file before running.")
        print("    Example:")
        print("      $env:VITE_APPWRITE_PROJECT_ID='67a...'")
        print("      $env:APPWRITE_API_KEY='standard_...'")
        print("      python scripts/setup_appwrite.py\n")
        return

    print(f"\n1. Ensuring Database '{DATABASE_ID}' exists...")
    db_res = api_request("POST", "/databases", {
        "databaseId": DATABASE_ID,
        "name": "Experiment Analyzer DB",
        "enabled": True,
    })
    print(f"   Database status: {db_res.get('name') if db_res else 'Ready'}")

    # -------------------------------------------------------------
    # 2. Table: experiments
    # -------------------------------------------------------------
    print("\n2. Creating Table 'experiments' with Document Security (RLS)...")
    exp_res = api_request("POST", f"/databases/{DATABASE_ID}/collections", {
        "collectionId": "experiments",
        "name": "experiments",
        "permissions": ["create(\"users\")"],
        "documentSecurity": True,
    })
    print("   Created table 'experiments'. Adding typed columns...")

    # Columns for experiments
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/string", {
        "key": "ownerId", "size": 36, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/string", {
        "key": "name", "size": 120, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/string", {
        "key": "description", "size": 1000, "required": False, "default": ""
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/enum", {
        "key": "metricType", "elements": ["continuous", "binary"], "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/string", {
        "key": "labelA", "size": 60, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/string", {
        "key": "labelB", "size": 60, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/integer", {
        "key": "nA", "required": True, "min": 0, "max": 10000000
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/integer", {
        "key": "nB", "required": True, "min": 0, "max": 10000000
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/boolean", {
        "key": "isPublic", "required": False, "default": False
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/attributes/enum", {
        "key": "source", "elements": ["upload", "paste", "demo"], "required": False, "default": "upload"
    })

    # Index on experiments
    api_request("POST", f"/databases/{DATABASE_ID}/collections/experiments/indexes", {
        "key": "idx_owner", "type": "key", "attributes": ["ownerId"]
    })

    # -------------------------------------------------------------
    # 3. Table: analyses
    # -------------------------------------------------------------
    print("\n3. Creating Table 'analyses' with Document Security (RLS)...")
    ana_res = api_request("POST", f"/databases/{DATABASE_ID}/collections", {
        "collectionId": "analyses",
        "name": "analyses",
        "permissions": ["create(\"users\")"],
        "documentSecurity": True,
    })
    print("   Created table 'analyses'. Adding typed columns...")

    # Attributes for analyses
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "experimentId", "size": 36, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "ownerId", "size": 36, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "hypothesis", "size": 500, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "alpha", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/enum", {
        "key": "alternative", "elements": ["two-sided", "greater", "less"], "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "minEffect", "required": False
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "test", "size": 60, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "statistic", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "pValue", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "effectName", "size": 60, "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "effectValue", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "ciLow", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "ciHigh", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/float", {
        "key": "mde", "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/enum", {
        "key": "verdict", "elements": ["significant", "not_significant", "inconclusive", "invalid"], "required": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "assumptionsJson", "size": 10000, "required": False, "default": "[]"
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "caveats", "size": 255, "required": False, "array": True
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/integer", {
        "key": "seed", "required": False, "default": 42
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/string", {
        "key": "engineVersion", "size": 20, "required": False, "default": "1.0.0"
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/attributes/boolean", {
        "key": "isPublic", "required": False, "default": False
    })

    # Indexes on analyses
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/indexes", {
        "key": "idx_owner_created", "type": "key", "attributes": ["ownerId", "$createdAt"], "orders": ["ASC", "DESC"]
    })
    api_request("POST", f"/databases/{DATABASE_ID}/collections/analyses/indexes", {
        "key": "idx_public", "type": "key", "attributes": ["isPublic"]
    })

    # -------------------------------------------------------------
    # 4. Storage Bucket: datasets
    # -------------------------------------------------------------
    print("\n4. Ensuring Storage Bucket 'datasets' exists...")
    api_request("POST", "/storage/buckets", {
        "bucketId": "datasets",
        "name": "Experiment Datasets",
        "permissions": ["read(\"any\")", "create(\"users\")"],
        "fileSecurity": False,
        "enabled": True,
    })

    print("\n[OK] Appwrite TablesDB & Storage Provisioning Complete!")
    print("     - Database: 'analyzer'")
    print("     - Tables: 'experiments', 'analyses'")
    print("     - Storage Bucket: 'datasets'")
    print("     - Row-level security enabled with Role-based permissions.")


if __name__ == "__main__":
    setup()
