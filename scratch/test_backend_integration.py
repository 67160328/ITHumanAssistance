import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "documents_count" in data

import time

def test_auth_flow():
    uname = f"testuser_{int(time.time())}"
    # 1. Register
    reg_res = client.post("/api/register", json={
        "username": uname,
        "email": f"{uname}@test.com",
        "password": "Password123"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["success"] is True

    # 2. Login
    login_res = client.post("/api/login", json={
        "username": uname,
        "password": "Password123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    assert token is not None

    # 3. Change password
    chg_res = client.post("/api/change-password", json={
        "username": uname,
        "old_password": "Password123",
        "new_password": "NewPassword456"
    })
    assert chg_res.status_code == 200
    assert chg_res.json()["success"] is True

    # 4. Logout
    logout_res = client.post("/api/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

def test_documents_and_rag():
    # 1. List
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 2

    # 2. Upload
    up_res = client.post("/api/documents", json={
        "title": "Warehouse Logistics Spec",
        "content": "Module `WarehouseService.py` handles package barcode scanning. Table `inventory_lots` stores lot numbers.",
        "doc_type": "markdown",
        "tags": ["Warehouse", "Inventory"]
    })
    assert up_res.status_code == 201
    doc_id = up_res.json()["document"]["id"]

    # 3. RAG Search
    rag_res = client.post("/api/documents/rag-search", json={
        "query": "Warehouse package barcode scanning",
        "top_k": 2
    })
    assert rag_res.status_code == 200
    assert len(rag_res.json()["results"]) > 0

    # 4. Delete
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200

def test_sanitize():
    res = client.post("/api/security/sanitize", json={
        "text": "Call 0812345678 or email admin@company.com with api key sk-live-1234567890abcdef123456"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["has_pii"] is True
    assert "[REDACTED_PHONE]" in data["sanitized_text"]
    assert "[REDACTED_EMAIL]" in data["sanitized_text"]
    assert "[REDACTED_API_KEY]" in data["sanitized_text"]

def test_translate():
    res = client.post("/api/translate", json={
        "input_text": "อยากได้ระบบตัดเงินผ่าน PromptPay และเชื่อมต่อระบบ Order เดิม",
        "mode": "human-to-tech",
        "project_context": "FastAPI + PostgreSQL",
        "use_rag": True,
        "sanitize_pii": True,
        "security_mode": "private-local"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "human-to-tech"
    assert "technicalRequirements" in data["data"]
    assert "impactAnalysis" in data["data"]
    assert len(data["rag_sources"]) > 0

print("Running test assertions directly...")
test_health()
test_auth_flow()
test_documents_and_rag()
test_sanitize()
test_translate()
print("All FastAPI and Phase 2 Integration tests PASSED successfully!")
