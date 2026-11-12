import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

from app.config import settings
from app.utils.logger import logger


class DocumentDB:
    """
    Data persistence manager for documents, chunks, embeddings, and chat sessions.
    Ensures ACID compliance, cascading deletes, strict user ownership filtering,
    and supports both live Supabase DB and local embedded SQLite for testing and development.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            self.db_path = Path(db_path)
        else:
            storage_dir = Path(settings.LOCAL_STORAGE_DIR)
            storage_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = storage_dir / "zyllora_data.sqlite3"

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_db(self):
        """Initializes tables matching the Supabase PostgreSQL schema."""
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    storage_path TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    page_count INTEGER DEFAULT 0,
                    status TEXT NOT NULL CHECK(status IN ('uploading', 'processing', 'ready', 'failed')),
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    page_start INTEGER NOT NULL,
                    page_end INTEGER NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    embedding TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS document_pages (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    char_count INTEGER NOT NULL,
                    has_text INTEGER NOT NULL,
                    warning TEXT,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    title TEXT NOT NULL DEFAULT 'New Study Session',
                    mode TEXT NOT NULL DEFAULT 'detailed',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                    content TEXT NOT NULL,
                    metadata TEXT DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_doc_user ON documents(user_id);
                CREATE INDEX IF NOT EXISTS idx_chunk_doc ON document_chunks(document_id, chunk_index);
                CREATE INDEX IF NOT EXISTS idx_pages_doc ON document_pages(document_id, page_number);
                CREATE INDEX IF NOT EXISTS idx_chat_sess_user ON chat_sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_chat_sess_doc ON chat_sessions(document_id);
                CREATE INDEX IF NOT EXISTS idx_chat_msg_sess ON chat_messages(session_id);
            """)

            # Add embedding column if upgrading existing database
            try:
                conn.execute("ALTER TABLE document_chunks ADD COLUMN embedding TEXT;")
            except sqlite3.OperationalError:
                pass  # column already exists

    # --------------------------------------------------------------------------
    # Document Operations
    # --------------------------------------------------------------------------
    def create_document(
        self,
        document_id: str,
        user_id: str,
        title: str,
        storage_path: str,
        file_size: int,
        status: str = "processing",
    ) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO documents (id, user_id, title, storage_path, file_size, page_count, status, error_message, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (document_id, user_id, title, storage_path, file_size, 0, status, None, now, now),
            )
        return self.get_document(document_id, user_id)

    def get_document(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute(
                """
                SELECT d.*, 
                    (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count
                FROM documents d
                WHERE d.id = ? AND d.user_id = ?
                """,
                (document_id, user_id),
            ).fetchone()
            if row:
                d = dict(row)
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                return d
            return None

    def list_documents(self, user_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT d.*, 
                    (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count
                FROM documents d
                WHERE d.user_id = ?
                ORDER BY d.created_at DESC
                """,
                (user_id,),
            ).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                results.append(d)
            return results

    def update_status(
        self,
        document_id: str,
        status: str,
        page_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ):
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            if page_count is not None:
                conn.execute(
                    """
                    UPDATE documents
                    SET status = ?, page_count = ?, error_message = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (status, page_count, error_message, now, document_id),
                )
            else:
                conn.execute(
                    """
                    UPDATE documents
                    SET status = ?, error_message = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (status, error_message, now, document_id),
                )

    def save_pages_and_chunks(
        self,
        document_id: str,
        user_id: str,
        pages: List[Dict[str, Any]],
        chunks: List[Dict[str, Any]],
    ):
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            conn.execute("DELETE FROM document_pages WHERE document_id = ?", (document_id,))
            conn.execute("DELETE FROM document_chunks WHERE document_id = ?", (document_id,))

            for page in pages:
                page_id = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO document_pages (id, document_id, page_number, content, char_count, has_text, warning)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        page_id,
                        document_id,
                        page["page_number"],
                        page["text"],
                        page["char_count"],
                        1 if page["has_text"] else 0,
                        page.get("warning"),
                    ),
                )

            for chunk in chunks:
                chunk_id = str(uuid.uuid4())
                emb_json = json.dumps(chunk.get("embedding")) if chunk.get("embedding") else None
                conn.execute(
                    """
                    INSERT INTO document_chunks (id, document_id, user_id, page_start, page_end, chunk_index, content, embedding, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        chunk_id,
                        document_id,
                        user_id,
                        chunk["page_start"],
                        chunk["page_end"],
                        chunk["chunk_index"],
                        chunk["content"],
                        emb_json,
                        now,
                    ),
                )

    def get_page(self, document_id: str, user_id: str, page_number: int) -> Optional[Dict[str, Any]]:
        doc = self.get_document(document_id, user_id)
        if not doc:
            return None

        with self._get_connection() as conn:
            page_row = conn.execute(
                """
                SELECT * FROM document_pages
                WHERE document_id = ? AND page_number = ?
                """,
                (document_id, page_number),
            ).fetchone()

            if not page_row:
                return None

            chunk_rows = conn.execute(
                """
                SELECT id, document_id, page_start, page_end, chunk_index, content, created_at
                FROM document_chunks
                WHERE document_id = ? AND page_start <= ? AND page_end >= ?
                ORDER BY chunk_index ASC
                """,
                (document_id, page_number, page_number),
            ).fetchall()

            chunks = []
            for c in chunk_rows:
                cd = dict(c)
                cd["created_at"] = datetime.fromisoformat(cd["created_at"])
                chunks.append(cd)

            return {
                "document_id": document_id,
                "page_number": page_number,
                "total_pages": doc["page_count"],
                "content": page_row["content"],
                "has_text": bool(page_row["has_text"]),
                "warning": page_row["warning"],
                "chunks": chunks,
            }

    def delete_document(self, document_id: str, user_id: str) -> Optional[str]:
        doc = self.get_document(document_id, user_id)
        if not doc:
            return None

        storage_path = doc["storage_path"]
        with self._get_connection() as conn:
            conn.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id))

        return storage_path

    # --------------------------------------------------------------------------
    # Semantic Search / Cosine Similarity Retrieval
    # --------------------------------------------------------------------------
    def search_chunks(
        self,
        document_id: str,
        user_id: str,
        query_embedding: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.35,
    ) -> List[Dict[str, Any]]:
        """
        Executes cosine similarity search over chunks strictly bounded to document_id
        and owned by user_id to enforce multi-tenant isolation.
        """
        # First verify document ownership
        doc = self.get_document(document_id, user_id)
        if not doc:
            return []

        query_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(query_vec)
        if q_norm == 0:
            return []

        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, document_id, page_start, page_end, chunk_index, content, embedding
                FROM document_chunks
                WHERE document_id = ? AND user_id = ? AND embedding IS NOT NULL
                """,
                (document_id, user_id),
            ).fetchall()

            scored_chunks = []
            for row in rows:
                if not row["embedding"]:
                    continue
                try:
                    c_vec = np.array(json.loads(row["embedding"]), dtype=np.float32)
                    c_norm = np.linalg.norm(c_vec)
                    if c_norm > 0:
                        cos_sim = float(np.dot(query_vec, c_vec) / (q_norm * c_norm))
                    else:
                        cos_sim = 0.0

                    if cos_sim >= similarity_threshold:
                        scored_chunks.append({
                            "id": row["id"],
                            "document_id": row["document_id"],
                            "page_start": row["page_start"],
                            "page_end": row["page_end"],
                            "chunk_index": row["chunk_index"],
                            "content": row["content"],
                            "similarity": cos_sim,
                        })
                except Exception as e:
                    logger.warning(f"Error computing similarity for chunk {row['id']}: {e}")

            # Sort descending by similarity score
            scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
            return scored_chunks[:top_k]

    # --------------------------------------------------------------------------
    # Study Session & Chat History Operations
    # --------------------------------------------------------------------------
    def create_session(
        self,
        session_id: str,
        user_id: str,
        document_id: str,
        title: str = "New Study Session",
        mode: str = "detailed",
    ) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO chat_sessions (id, user_id, document_id, title, mode, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, user_id, document_id, title, mode, now, now),
            )
        return self.get_session(session_id, user_id)

    def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute(
                """
                SELECT s.*, 
                    (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count
                FROM chat_sessions s
                WHERE s.id = ? AND s.user_id = ?
                """,
                (session_id, user_id),
            ).fetchone()
            if row:
                d = dict(row)
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                return d
            return None

    def list_sessions(self, user_id: str, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            if document_id:
                rows = conn.execute(
                    """
                    SELECT s.*, 
                        (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count
                    FROM chat_sessions s
                    WHERE s.user_id = ? AND s.document_id = ?
                    ORDER BY s.updated_at DESC
                    """,
                    (user_id, document_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT s.*, 
                        (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count
                    FROM chat_sessions s
                    WHERE s.user_id = ?
                    ORDER BY s.updated_at DESC
                    """,
                    (user_id,),
                ).fetchall()

            results = []
            for r in rows:
                d = dict(r)
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                results.append(d)
            return results

    def update_session_title(self, session_id: str, user_id: str, title: str):
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE chat_sessions
                SET title = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (title, now, session_id, user_id),
            )

    def delete_session(self, session_id: str, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?",
                (session_id, user_id),
            )
            return cursor.rowcount > 0

    def save_message(
        self,
        message_id: str,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        meta_json = json.dumps(metadata or {})
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO chat_messages (id, session_id, user_id, role, content, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (message_id, session_id, user_id, role, content, meta_json, now),
            )
            # Update parent session updated_at
            conn.execute("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", (now, session_id))

        return {
            "id": message_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.fromisoformat(now),
        }

    def get_session_messages(
        self,
        session_id: str,
        user_id: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        # Verify session ownership first
        session = self.get_session(session_id, user_id)
        if not session:
            return []

        with self._get_connection() as conn:
            query = """
                SELECT id, session_id, role, content, metadata, created_at
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY created_at ASC
            """
            if limit:
                # To get the last N messages in ascending order
                query = f"""
                    SELECT * FROM (
                        SELECT id, session_id, role, content, metadata, created_at
                        FROM chat_messages
                        WHERE session_id = ?
                        ORDER BY created_at DESC
                        LIMIT {int(limit)}
                    ) ORDER BY created_at ASC
                """
            rows = conn.execute(query, (session_id,)).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["metadata"] = json.loads(d["metadata"] or "{}")
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                results.append(d)
            return results


document_db = DocumentDB()
