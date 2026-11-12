import io
import jwt
import pytest
import pymupdf
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)
TEST_SECRET = "test-secret-key-32-bytes-long-123456"


def get_auth_headers(user_id: str, email: str = "student@university.edu") -> dict:
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
    }
    token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def upload_test_document(user_id: str, title: str, text: str) -> str:
    """Helper to upload and process a test PDF for RAG tests."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()

    headers = get_auth_headers(user_id)
    stream = io.BytesIO(pdf_bytes)
    stream.name = f"{title}.pdf"

    res = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": (f"{title}.pdf", stream, "application/pdf")},
    )
    assert res.status_code == 202
    return res.json()["id"]


@pytest.fixture(autouse=True)
def setup_test_settings():
    original_secret = settings.SUPABASE_JWT_SECRET
    original_provider = settings.AI_PROVIDER
    settings.SUPABASE_JWT_SECRET = TEST_SECRET
    settings.AI_PROVIDER = "mock"
    yield
    settings.SUPABASE_JWT_SECRET = original_secret
    settings.AI_PROVIDER = original_provider


def test_tutor_endpoints_require_auth():
    """All tutor endpoints must return 401 when unauthenticated."""
    assert client.get("/api/v1/tutor/sessions").status_code == 401
    assert client.post("/api/v1/tutor/sessions", json={"document_id": "none"}).status_code == 401
    assert client.post("/api/v1/tutor/chat", json={"document_id": "none", "session_id": "none", "message": "hi"}).status_code == 401


def test_tutor_session_and_chat_lifecycle():
    """
    End-to-end RAG chat test:
    1. Upload course PDF
    2. Create study session
    3. Query tutor via /chat
    4. Verify structured response with citations
    5. Verify conversation history persistence
    6. Delete study session
    """
    user_id = "user-tutor-lifecycle"
    headers = get_auth_headers(user_id)

    doc_text = "Thermodynamics: The First Law of Thermodynamics is the law of conservation of energy."
    doc_id = upload_test_document(user_id, "thermodynamics", doc_text)

    # 1. Create Study Session
    sess_res = client.post(
        "/api/v1/tutor/sessions",
        headers=headers,
        json={"document_id": doc_id, "title": "Thermodynamics Exam Prep", "mode": "detailed"},
    )
    assert sess_res.status_code == 201
    session = sess_res.json()
    session_id = session["id"]
    assert session["document_id"] == doc_id
    assert session["title"] == "Thermodynamics Exam Prep"

    # 2. List sessions
    list_res = client.get("/api/v1/tutor/sessions", headers=headers)
    assert list_res.status_code == 200
    assert any(s["id"] == session_id for s in list_res.json())

    # 3. Chat with AI Tutor
    chat_payload = {
        "document_id": doc_id,
        "session_id": session_id,
        "message": "What is the First Law of Thermodynamics?",
        "mode": "detailed",
    }
    chat_res = client.post("/api/v1/tutor/chat", headers=headers, json=chat_payload)
    assert chat_res.status_code == 200
    tutor_data = chat_res.json()

    assert "answer" in tutor_data
    assert "key_points" in tutor_data
    assert isinstance(tutor_data["key_points"], list)
    assert "citations" in tutor_data
    assert tutor_data["grounded"] is True

    # 4. Verify conversation history persistence
    hist_res = client.get(f"/api/v1/tutor/sessions/{session_id}", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history["messages"]) >= 2
    assert history["messages"][0]["role"] == "user"
    assert history["messages"][1]["role"] == "assistant"
    assert "citations" in history["messages"][1]["metadata"]

    # 5. Delete session
    del_res = client.delete(f"/api/v1/tutor/sessions/{session_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    get_del = client.get(f"/api/v1/tutor/sessions/{session_id}", headers=headers)
    assert get_del.status_code == 404


def test_tutor_explanation_modes():
    """Tests all 4 required teaching modes: beginner, detailed, step_by_step, example_based."""
    user_id = "user-modes-test"
    headers = get_auth_headers(user_id)
    doc_id = upload_test_document(user_id, "modes_doc", "Organic chemistry reaction mechanisms.")

    sess_res = client.post(
        "/api/v1/tutor/sessions",
        headers=headers,
        json={"document_id": doc_id, "title": "Mode Session"},
    )
    session_id = sess_res.json()["id"]

    for mode in ["beginner", "detailed", "step_by_step", "example_based"]:
        payload = {
            "document_id": doc_id,
            "session_id": session_id,
            "message": f"Explain this concept in {mode} mode.",
            "mode": mode,
        }
        res = client.post("/api/v1/tutor/chat", headers=headers, json=payload)
        assert res.status_code == 200
        assert "answer" in res.json()


def test_cross_user_tutor_isolation():
    """
    CRITICAL SECURITY TEST:
    User B must NEVER be able to:
    - View User A's study sessions
    - Chat inside User A's study session
    - Read User A's conversation history
    - Delete User A's study session
    """
    user_alice = "user-alice-tutor"
    user_bob = "user-bob-tutor"
    headers_alice = get_auth_headers(user_alice)
    headers_bob = get_auth_headers(user_bob)

    doc_id = upload_test_document(user_alice, "alice_notes", "Discrete mathematics graph theory.")
    sess_res = client.post(
        "/api/v1/tutor/sessions",
        headers=headers_alice,
        json={"document_id": doc_id, "title": "Alice Private Session"},
    )
    session_id = sess_res.json()["id"]

    # Bob tries to view Alice's session -> 404
    assert client.get(f"/api/v1/tutor/sessions/{session_id}", headers=headers_bob).status_code == 404

    # Bob tries to chat in Alice's session -> 404
    bob_chat = client.post(
        "/api/v1/tutor/chat",
        headers=headers_bob,
        json={"document_id": doc_id, "session_id": session_id, "message": "Hi Alice"},
    )
    assert bob_chat.status_code == 404

    # Bob tries to delete Alice's session -> 404
    assert client.delete(f"/api/v1/tutor/sessions/{session_id}", headers=headers_bob).status_code == 404

    # Bob's session list must NOT include Alice's session
    bob_list = client.get("/api/v1/tutor/sessions", headers=headers_bob).json()
    assert not any(s["id"] == session_id for s in bob_list)
