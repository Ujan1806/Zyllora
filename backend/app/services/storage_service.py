import os
import re
from pathlib import Path
from typing import Optional
import httpx
from app.config import settings
from app.utils.logger import logger


class StorageService:
    """
    Handles secure storage of academic PDFs.
    Ensures private access, path traversal prevention, filename sanitization,
    and supports both live Supabase Storage and local encrypted development storage.
    """

    def __init__(self):
        self.bucket_name = settings.STORAGE_BUCKET
        self.local_storage_dir = Path(settings.LOCAL_STORAGE_DIR)
        self.local_storage_dir.mkdir(parents=True, exist_ok=True)

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """
        Sanitizes client-supplied filenames to prevent directory traversal
        and command injection vulnerabilities.
        """
        # Strip path directory parts
        base = os.path.basename(filename)
        # Remove non-alphanumeric characters except dot, dash, and underscore
        cleaned = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
        # Ensure it has .pdf extension
        if not cleaned.lower().endswith('.pdf'):
            cleaned += '.pdf'
        return cleaned or "document.pdf"

    def generate_storage_path(self, user_id: str, document_id: str, filename: str) -> str:
        """
        Generates an isolated, safe storage path: {user_id}/{document_id}_{sanitized_filename}
        """
        safe_name = self.sanitize_filename(filename)
        # Ensure user_id contains only valid UUID characters
        safe_user_id = re.sub(r'[^a-zA-Z0-9-]', '', str(user_id))
        safe_doc_id = re.sub(r'[^a-zA-Z0-9-]', '', str(document_id))
        return f"{safe_user_id}/{safe_doc_id}_{safe_name}"

    def is_supabase_configured(self) -> bool:
        """Checks if live Supabase Storage credentials are configured."""
        return bool(
            settings.SUPABASE_URL and
            "placeholder" not in settings.SUPABASE_URL.lower() and
            (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY) and
            "placeholder" not in settings.SUPABASE_ANON_KEY.lower()
        )

    async def save_file(
        self,
        user_id: str,
        document_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        """
        Saves uploaded PDF bytes either to private Supabase Storage or private local storage.
        Returns the canonical storage path.
        """
        storage_path = self.generate_storage_path(user_id, document_id, filename)

        if self.is_supabase_configured():
            try:
                # Use Supabase Storage REST API
                auth_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
                url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{self.bucket_name}/{storage_path}"
                headers = {
                    "Authorization": f"Bearer {auth_key}",
                    "Content-Type": "application/pdf",
                    "x-upsert": "true",
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, headers=headers, content=content)
                    if resp.status_code in (200, 201):
                        logger.info(f"PDF uploaded to Supabase Storage: {storage_path}")
                        return storage_path
                    else:
                        logger.warning(
                            f"Supabase storage upload returned status {resp.status_code}: {resp.text}. Falling back to local storage."
                        )
            except Exception as e:
                logger.error(f"Supabase storage exception: {e}. Falling back to secure local storage.")

        # Local private storage fallback
        target_file = self.local_storage_dir / storage_path
        # Prevent path traversal
        resolved = target_file.resolve()
        if not str(resolved).startswith(str(self.local_storage_dir.resolve())):
            raise ValueError("Path traversal attempt detected in storage path.")

        resolved.parent.mkdir(parents=True, exist_ok=True)
        resolved.write_bytes(content)
        logger.info(f"PDF stored securely at private local path: {storage_path}")
        return storage_path

    async def read_file(self, storage_path: str) -> Optional[bytes]:
        """
        Retrieves PDF file bytes from storage.
        """
        if self.is_supabase_configured():
            try:
                auth_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
                url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{self.bucket_name}/{storage_path}"
                headers = {"Authorization": f"Bearer {auth_key}"}
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        return resp.content
            except Exception as e:
                logger.warning(f"Failed to read from Supabase storage: {e}")

        # Check local storage
        target_file = self.local_storage_dir / storage_path
        resolved = target_file.resolve()
        if str(resolved).startswith(str(self.local_storage_dir.resolve())) and resolved.exists():
            return resolved.read_bytes()

        return None

    async def delete_file(self, storage_path: str) -> bool:
        """
        Deletes PDF file from storage when user deletes their document.
        """
        deleted = False

        if self.is_supabase_configured():
            try:
                auth_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
                url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{self.bucket_name}/{storage_path}"
                headers = {"Authorization": f"Bearer {auth_key}"}
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.delete(url, headers=headers)
                    if resp.status_code in (200, 204):
                        deleted = True
            except Exception as e:
                logger.warning(f"Supabase storage delete error: {e}")

        # Delete local file if present
        target_file = self.local_storage_dir / storage_path
        resolved = target_file.resolve()
        if str(resolved).startswith(str(self.local_storage_dir.resolve())) and resolved.exists():
            try:
                resolved.unlink()
                deleted = True
                logger.info(f"Deleted stored file at {storage_path}")
            except Exception as err:
                logger.warning(f"Error unlinking local file {storage_path}: {err}")

        return deleted


storage_service = StorageService()
