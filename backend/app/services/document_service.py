import uuid
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException, status

from app.config import settings
from app.utils.logger import logger
from app.services.pdf_service import (
    pdf_service,
    PDFProcessingError,
    PDFValidationError,
    PDFCorruptedError,
    PDFPasswordProtectedError,
    PDFPageLimitExceededError,
)
from app.services.chunking_service import chunking_service
from app.services.embedding_service import embedding_service
from app.services.storage_service import storage_service
from app.services.document_db import document_db


class DocumentService:
    """
    Coordinates PDF validation, storage, background text extraction,
    semantic chunking, and database lifecycle management.
    """

    async def upload_document(
        self,
        user_id: str,
        file: UploadFile,
    ) -> Dict[str, Any]:
        """
        Validates the incoming upload, persists the raw PDF privately,
        registers the database record, and queues background processing.
        """
        # 1. Filename & extension validation
        filename = file.filename or "uploaded_document.pdf"
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "INVALID_FILE_TYPE",
                    "message": "Only PDF documents (.pdf) are supported. Please upload an academic PDF.",
                },
            )

        # 2. Read bytes and enforce size limits
        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "EMPTY_FILE",
                    "message": "Uploaded file is empty (0 bytes).",
                },
            )

        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "error_code": "FILE_TOO_LARGE",
                    "message": f"File size ({file_size / (1024 * 1024):.1f} MB) exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB.",
                },
            )

        # 3. Magic file signature validation (%PDF-)
        if not pdf_service.validate_file_signature(file_bytes):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "INVALID_FILE_SIGNATURE",
                    "message": "File failed PDF signature verification. The file is not a valid PDF.",
                },
            )

        # 4. Generate unique document identity
        document_id = str(uuid.uuid4())
        title = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
        if not title:
            title = "Academic Document"

        # 5. Save to private storage
        try:
            storage_path = await storage_service.save_file(
                user_id=user_id,
                document_id=document_id,
                filename=filename,
                content=file_bytes,
            )
        except Exception as err:
            logger.error(f"Failed to save document to storage: {err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error_code": "STORAGE_FAILURE",
                    "message": "Failed to store document in private storage.",
                },
            )

        # 6. Create database record with status 'processing'
        doc_record = document_db.create_document(
            document_id=document_id,
            user_id=user_id,
            title=title,
            storage_path=storage_path,
            file_size=file_size,
            status="processing",
        )

        return {
            "document": doc_record,
            "file_bytes": file_bytes,
            "filename": filename,
        }

    async def process_document_background(
        self,
        document_id: str,
        user_id: str,
        file_bytes: bytes,
        filename: str,
    ):
        """
        Background task: extracts text with PyMuPDF, executes chunking,
        and persists chunks in PostgreSQL.
        """
        logger.info(f"Starting background processing for document: {document_id}")
        try:
            # 1. Extract text and page boundaries
            extraction = pdf_service.extract(file_bytes, filename=filename)

            # Convert pages to dictionaries
            pages_data = [
                {
                    "page_number": p.page_number,
                    "text": p.text,
                    "char_count": p.char_count,
                    "has_text": p.has_text,
                    "warning": p.warning,
                }
                for p in extraction.pages
            ]

            # 2. Divide text into searchable chunks
            chunks = chunking_service.chunk_document(extraction.pages)
            chunks_data = [
                {
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "chunk_index": c.chunk_index,
                    "content": c.content,
                }
                for c in chunks
            ]

            # 2.5 Generate vector embeddings for pgvector / semantic search
            chunks_data = await embedding_service.embed_chunks(chunks_data)

            # 3. Save pages and chunks in database
            document_db.save_pages_and_chunks(
                document_id=document_id,
                user_id=user_id,
                pages=pages_data,
                chunks=chunks_data,
            )

            # 4. Set document status to ready
            status_warning = extraction.warning
            document_db.update_status(
                document_id=document_id,
                status="ready",
                page_count=extraction.page_count,
                error_message=status_warning,
            )
            logger.info(
                f"Document {document_id} processed successfully: {extraction.page_count} pages, {len(chunks)} chunks."
            )

        except (PDFValidationError, PDFPasswordProtectedError, PDFPageLimitExceededError, PDFCorruptedError) as err:
            logger.warning(f"Validation failure during PDF processing ({document_id}): {str(err)}")
            document_db.update_status(
                document_id=document_id,
                status="failed",
                error_message=str(err),
            )
        except Exception as err:
            logger.error(f"Unexpected error processing document {document_id}: {str(err)}", exc_info=True)
            document_db.update_status(
                document_id=document_id,
                status="failed",
                error_message="An unexpected server error occurred while extracting the document.",
            )

    def list_documents(self, user_id: str) -> List[Dict[str, Any]]:
        """Lists all documents owned by user."""
        return document_db.list_documents(user_id)

    def get_document(self, document_id: str, user_id: str) -> Dict[str, Any]:
        """Retrieves single document, enforcing user ownership."""
        doc = document_db.get_document(document_id, user_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "DOCUMENT_NOT_FOUND",
                    "message": "Document not found or you do not have permission to access it.",
                },
            )
        return doc

    def get_document_status(self, document_id: str, user_id: str) -> Dict[str, Any]:
        """Quick status check for polling during upload/processing."""
        doc = self.get_document(document_id, user_id)
        return {
            "id": doc["id"],
            "status": doc["status"],
            "page_count": doc["page_count"],
            "error_message": doc["error_message"],
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"],
        }

    def get_document_page(self, document_id: str, user_id: str, page_number: int) -> Dict[str, Any]:
        """Returns extracted page content and intersecting chunks."""
        page_data = document_db.get_page(document_id, user_id, page_number)
        if not page_data:
            # Check if document exists
            doc = self.get_document(document_id, user_id)
            if page_number < 1 or page_number > (doc.get("page_count") or 1):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error_code": "PAGE_OUT_OF_BOUNDS",
                        "message": f"Page {page_number} is out of bounds for document containing {doc.get('page_count', 0)} pages.",
                    },
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "PAGE_NOT_FOUND",
                    "message": f"Page {page_number} has not been extracted or does not exist.",
                },
            )
        return page_data

    async def delete_document(self, document_id: str, user_id: str) -> Dict[str, Any]:
        """
        Deletes document and cascades chunks and pages from database,
        and purges the stored PDF file from private storage.
        """
        storage_path = document_db.delete_document(document_id, user_id)
        if not storage_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "DOCUMENT_NOT_FOUND",
                    "message": "Document not found or you do not have permission to delete it.",
                },
            )

        # Purge file from storage
        await storage_service.delete_file(storage_path)
        logger.info(f"Purged document {document_id} and storage {storage_path} for user {user_id}")
        return {
            "success": True,
            "document_id": document_id,
            "message": "Document and all associated chunks deleted successfully.",
        }

    async def retry_document_processing(self, document_id: str, user_id: str) -> Dict[str, Any]:
        """Allows retrying a failed document processing run."""
        doc = self.get_document(document_id, user_id)
        file_bytes = await storage_service.read_file(doc["storage_path"])
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "SOURCE_FILE_NOT_FOUND",
                    "message": "Source PDF file could not be found in storage for reprocessing.",
                },
            )

        document_db.update_status(document_id, status="processing", error_message=None)
        await self.process_document_background(
            document_id=document_id,
            user_id=user_id,
            file_bytes=file_bytes,
            filename=doc["title"] + ".pdf",
        )
        return self.get_document(document_id, user_id)


document_service = DocumentService()
