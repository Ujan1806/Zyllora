import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import pymupdf
from app.config import settings
from app.utils.logger import logger


class PDFProcessingError(Exception):
    """Base exception for PDF processing issues."""
    pass


class PDFValidationError(PDFProcessingError):
    """Raised when PDF fails structural or signature validation."""
    pass


class PDFCorruptedError(PDFProcessingError):
    """Raised when PDF file is corrupted or cannot be parsed."""
    pass


class PDFPasswordProtectedError(PDFProcessingError):
    """Raised when PDF is encrypted or password-protected."""
    pass


class PDFPageLimitExceededError(PDFProcessingError):
    """Raised when PDF exceeds the configured maximum page count."""
    pass


@dataclass
class PDFPage:
    page_number: int  # 1-indexed
    text: str
    char_count: int
    has_text: bool
    warning: Optional[str] = None


@dataclass
class PDFExtractionResult:
    page_count: int
    metadata: Dict[str, Any]
    pages: List[PDFPage]
    total_characters: int
    is_scanned_image_only: bool
    warning: Optional[str] = None


class PDFService:
    """
    Modular PDF extraction service powered by PyMuPDF.
    Preserves page boundaries, extracts metadata, validates signatures,
    and detects image-only/scanned documents without fabricating text.
    """

    PDF_MAGIC_BYTES = b"%PDF-"

    @classmethod
    def validate_file_signature(cls, file_bytes: bytes) -> bool:
        """
        Validates the PDF magic file signature at the beginning of the byte stream.
        Prevents file extension spoofing attacks.
        """
        if not file_bytes or len(file_bytes) < len(cls.PDF_MAGIC_BYTES):
            return False
        return file_bytes.startswith(cls.PDF_MAGIC_BYTES)

    @classmethod
    def clean_text(cls, text: str) -> str:
        """
        Cleans extracted text by normalizing line breaks and excessive whitespace
        while preserving paragraphs and sentence flow.
        """
        if not text:
            return ""
        # Normalize carriage returns
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Fix hyphenated line breaks (e.g., 'ac- \n ademic' -> 'academic')
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
        # Normalize multiple horizontal whitespace into single spaces
        text = re.sub(r'[ \t]+', ' ', text)
        # Normalize more than 2 consecutive newlines into double newlines (paragraphs)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def extract(self, file_bytes: bytes, filename: str = "document.pdf") -> PDFExtractionResult:
        """
        Extracts text, page references, and metadata from raw PDF bytes.
        Performs thorough security and limit validations.
        """
        # 1. Check for empty payload
        if not file_bytes or len(file_bytes) == 0:
            raise PDFValidationError("The uploaded file is empty (0 bytes). Please upload a valid academic PDF.")

        # 2. Enforce file size limit
        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            raise PDFValidationError(
                f"File size ({file_size_mb:.1f} MB) exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB."
            )

        # 3. Validate PDF magic signature
        if not self.validate_file_signature(file_bytes):
            raise PDFValidationError(
                "Invalid file signature. The uploaded file is not a genuine PDF document, regardless of its extension."
            )

        # 4. Open document with PyMuPDF
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            logger.warning(f"PyMuPDF failed to open document '{filename}': {str(e)}")
            raise PDFCorruptedError(
                "The PDF file is corrupted or uses an unsupported encoding and could not be opened."
            )

        try:
            # 5. Check encryption and password protection
            if doc.is_encrypted:
                # If it's encrypted and requires a password to read
                if doc.needs_pass or not doc.authenticate(""):
                    raise PDFPasswordProtectedError(
                        "Password-protected or encrypted PDFs are not supported. "
                        "Please remove the password before uploading."
                    )

            # 6. Check page count
            page_count = len(doc)
            if page_count == 0:
                raise PDFValidationError("The PDF document contains 0 pages.")

            if page_count > settings.MAX_PAGE_COUNT:
                raise PDFPageLimitExceededError(
                    f"PDF page count ({page_count}) exceeds the maximum allowed limit of {settings.MAX_PAGE_COUNT} pages. "
                    "Please upload a shorter chapter or split document."
                )

            # 7. Extract metadata
            raw_meta = doc.metadata or {}
            metadata = {
                "title": raw_meta.get("title") or filename,
                "author": raw_meta.get("author") or "",
                "subject": raw_meta.get("subject") or "",
                "creator": raw_meta.get("creator") or "",
                "creation_date": raw_meta.get("creationDate") or "",
            }

            # 8. Extract text page-by-page while preserving exact 1-indexed page references
            pages: List[PDFPage] = []
            total_chars = 0

            for index in range(page_count):
                page_number = index + 1
                try:
                    page = doc[index]
                    raw_text = page.get_text("text") or ""
                    cleaned = self.clean_text(raw_text)
                    char_count = len(cleaned)
                    has_text = char_count > 0

                    page_warning = None
                    if not has_text:
                        page_warning = "Page contains no extractable text."
                    elif char_count < 30:
                        page_warning = "Page contains minimal extractable text."

                    pages.append(
                        PDFPage(
                            page_number=page_number,
                            text=cleaned,
                            char_count=char_count,
                            has_text=has_text,
                            warning=page_warning,
                        )
                    )
                    total_chars += char_count
                except Exception as page_err:
                    logger.warning(f"Failed to extract page {page_number} in '{filename}': {page_err}")
                    pages.append(
                        PDFPage(
                            page_number=page_number,
                            text="",
                            char_count=0,
                            has_text=False,
                            warning="Failed to read page content due to rendering error.",
                        )
                    )

            # 9. Scanned / Image-Only Detection
            # If a document has pages but total extracted characters is negligible
            is_scanned_image_only = False
            doc_warning = None

            if total_chars < 50:
                is_scanned_image_only = True
                doc_warning = (
                    "This document appears to be an image-only or scanned PDF. "
                    "OCR support is not yet available; no readable text could be extracted."
                )
            elif (total_chars / page_count) < 25 and page_count > 2:
                # Average less than 25 chars per page in multi-page doc suggests scanned pages or diagram slides
                doc_warning = "Document has very low text density. Many pages may contain images, scans, or diagrams without extractable text."

            return PDFExtractionResult(
                page_count=page_count,
                metadata=metadata,
                pages=pages,
                total_characters=total_chars,
                is_scanned_image_only=is_scanned_image_only,
                warning=doc_warning,
            )

        finally:
            doc.close()


pdf_service = PDFService()
