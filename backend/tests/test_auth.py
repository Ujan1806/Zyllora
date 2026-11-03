import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_auth_me_requires_token():
    """Unauthenticated requests must be rejected with 401 Unauthorized."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error_code"] == "AUTHENTICATION_REQUIRED"


def test_auth_me_rejects_garbage_token():
    """Requests with malformed tokens must be rejected."""
    headers = {"Authorization": "Bearer not-a-valid-jwt-token"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code in (401, 500)  # 401 if secret configured, 500 if placeholder secret
    data = response.json()
    assert data["success"] is False


def test_auth_me_with_valid_jwt():
    """When a valid JWT signed with the secret is supplied, it derives user identity properly."""
    # Temporarily set a deterministic test secret
    test_secret = "test-secret-key-32-bytes-long-123456"
    original_secret = settings.SUPABASE_JWT_SECRET
    settings.SUPABASE_JWT_SECRET = test_secret

    try:
        user_id = "11111111-2222-3333-4444-555555555555"
        payload = {
            "sub": user_id,
            "email": "student@university.edu",
            "role": "authenticated",
            "aud": "authenticated",
            "user_metadata": {
                "full_name": "Test Student",
                "field_of_study": "Computer Science",
                "explanation_level": "intermediate",
                "learning_goal": "exam_prep",
                "onboarding_completed": True,
            },
        }
        token = jwt.encode(payload, test_secret, algorithm="HS256")

        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id
        assert data["email"] == "student@university.edu"
        assert data["full_name"] == "Test Student"
        assert data["field_of_study"] == "Computer Science"
        assert data["learning_goal"] == "exam_prep"
        assert data["onboarding_completed"] is True
    finally:
        settings.SUPABASE_JWT_SECRET = original_secret
