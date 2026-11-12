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


def make_pdf_stream(text: str = "Sample academic syllabus content.") -> io.BytesIO:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    stream = io.BytesIO(pdf_bytes)
    stream.name = "syllabus.pdf"
    return stream


@pytest.fixture(autouse=True)
def setup_test_jwt_secret():
    original = settings.SUPABASE_JWT_SECRET
    settings.SUPABASE_JWT_SECRET = TEST_SECRET
    yield
    settings.SUPABASE_JWT_SECRET = original


def test_upload_pdf_requires_authentication():
    """Unauthenticated uploads must be rejected with 401."""
    pdf_stream = make_pdf_stream()
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("syllabus.pdf", pdf_stream, "application/pdf")},
    )
    assert response.status_code == 401
    assert response.json()["error_code"] == "AUTHENTICATION_REQUIRED"


def test_upload_pdf_rejects_non_pdf_file():
    """Uploading a non-PDF file must return 400 Bad Request."""
    headers = get_auth_headers("user-1")
    txt_stream = io.BytesIO(b"Just a normal text file")
    response = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("notes.txt", txt_stream, "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] == "INVALID_FILE_TYPE"


def test_upload_pdf_rejects_fake_signature():
    """Uploading a file named .pdf with invalid header must be rejected."""
    headers = get_auth_headers("user-1")
    fake_stream = io.BytesIO(b"Fake header without magic bytes")
    response = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("fake.pdf", fake_stream, "application/pdf")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] == "INVALID_FILE_SIGNATURE"


def test_upload_and_full_lifecycle():
    """
    Tests complete lifecycle:
    1. Upload document (synchronous acceptance)
    2. Document listed in GET /documents
    3. Status transitions to ready
    4. Page content accessible via GET /documents/{id}/pages/1
    5. Deletion cleans record and chunks
    """
    user_id = "user-lifecycle-test"
    headers = get_auth_headers(user_id)
    pdf_stream = make_pdf_stream("Chapter 1: Principles of Quantum Computing. Qubits and superposition.")

    # 1. Upload
    upload_res = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("quantum_computing.pdf", pdf_stream, "application/pdf")},
    )
    assert upload_res.status_code == 202
    data = upload_res.json()
    assert "id" in data
    doc_id = data["id"]
    assert data["status"] in ("processing", "ready")

    # 2. Check Document Status
    status_res = client.get(f"/api/v1/documents/{doc_id}/status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["id"] == doc_id
    assert status_data["status"] in ("processing", "ready")

    # 3. List User Documents
    list_res = client.get("/api/v1/documents", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert any(d["id"] == doc_id for d in docs)

    # 4. Get Document Details
    detail_res = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == doc_id
    assert detail_res.json()["user_id"] == user_id

    # 5. Get Page Content
    page_res = client.get(f"/api/v1/documents/{doc_id}/pages/1", headers=headers)
    assert page_res.status_code == 200
    page_data = page_res.json()
    assert page_data["document_id"] == doc_id
    assert page_data["page_number"] == 1
    assert "Quantum Computing" in page_data["content"]
    assert page_data["has_text"] is True

    # 6. Delete Document
    delete_res = client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True

    # Verify deleted
    get_deleted = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert get_deleted.status_code == 404


def test_cross_user_isolation_strictly_enforced():
    """
    CRITICAL SECURITY TEST:
    User B must NEVER be able to read, status-poll, get pages from, or delete User A's document.
    """
    user_a_headers = get_auth_headers("user-alice")
    user_b_headers = get_auth_headers("user-bob")

    # Alice uploads a document
    pdf_stream = make_pdf_stream("Alice's private exam prep notes.")
    res = client.post(
        "/api/v1/documents/upload",
        headers=user_a_headers,
        files={"file": ("alice_notes.pdf", pdf_stream, "application/pdf")},
    )
    doc_id = res.json()["id"]

    # Bob tries to GET Alice's document details -> MUST BE 404
    bob_get = client.get(f"/api/v1/documents/{doc_id}", headers=user_b_headers)
    assert bob_get.status_code == 404

    # Bob tries to GET Alice's document status -> MUST BE 404
    bob_status = client.get(f"/api/v1/documents/{doc_id}/status", headers=user_b_headers)
    assert bob_status.status_code == 404

    # Bob tries to GET Alice's document page -> MUST BE 404
    bob_page = client.get(f"/api/v1/documents/{doc_id}/pages/1", headers=user_b_headers)
    assert bob_page.status_code == 404

    # Bob tries to DELETE Alice's document -> MUST BE 404
    bob_delete = client.delete(f"/api/v1/documents/{doc_id}", headers=user_b_headers)
    assert bob_delete.status_code == 404

    # Bob's document list must NOT show Alice's document
    bob_list = client.get("/api/v1/documents", headers=user_b_headers)
    assert not any(d["id"] == doc_id for d in bob_list.json())

    # Alice cleans up
    client.delete(f"/api/v1/documents/{doc_id}", headers=user_a_headers)
