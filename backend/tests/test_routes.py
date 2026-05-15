from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_user_and_authority_health():
    r1 = client.get("/api/user/health")
    r2 = client.get("/api/authority/health")
    assert r1.status_code == 200
    assert r2.status_code == 200


def test_auth_login():
    data = {"email": "test@example.com", "password": "password123"}
    response = client.post("/auth/login", json=data)
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body.get("token_type") == "bearer"


def test_grievance_submission():
    data = {
        "title": "Test Complaint",
        "description": "There is a large pothole near the main road causing accidents",
        "channel": "web",
        "citizen_name": "Test Citizen",
        "citizen_phone": "+919876543210",
        "lat": "19.12",
        "lng": "72.85"
    }
    response = client.post("/grievances/", data=data)
    assert response.status_code == 200
    body = response.json()
    assert "grievance_id" in body or "id" in body or "message" in body
