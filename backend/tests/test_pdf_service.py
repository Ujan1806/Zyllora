import pytest
import pymupdf
from app.services.pdf_service import (
    pdf_service,
    PDFValidationError,
    PDFCorruptedError,
    PDFPasswordProtectedError,
    PDFPage,
)
from app.services.chunking_service import chunking_service


def create_sample_pdf(pages_text: list[str]) -> bytes:
    """Helper to generate an in-memory PDF using PyMuPDF."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_encrypted_pdf(password: str = "secret123") -> bytes:
    """Helper to generate an encrypted/password-protected PDF."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Confidential academic research.")
    pdf_bytes = doc.tobytes(
        encryption=pymupdf.PDF_ENCRYPT_AES_256,
        user_pw=password,
        owner_pw="ownerpass456",
    )
    doc.close()
    return pdf_bytes


def create_image_only_pdf() -> bytes:
    """Helper to generate a PDF with visual graphics but zero text."""
    doc = pymupdf.open()
    page = doc.new_page()
    # Draw a shape without any text
    shape = page.new_shape()
    shape.draw_rect(pymupdf.Rect(50, 50, 200, 200))
    shape.finish(color=(0, 0, 1), fill=(0.8, 0.8, 1))
    shape.commit()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_normal_text_pdf_extraction():
    """Extracts text, preserves 1-indexed page reference, and extracts metadata."""
    sample_text = "Introduction to Computer Systems. Chapter 1 covers CPU architecture and memory hierarchy."
    pdf_bytes = create_sample_pdf([sample_text])

    result = pdf_service.extract(pdf_bytes, filename="cs101.pdf")

    assert result.page_count == 1
    assert result.total_characters > 20
    assert not result.is_scanned_image_only
    assert len(result.pages) == 1
    assert result.pages[0].page_number == 1
    assert "Computer Systems" in result.pages[0].text
    assert result.pages[0].has_text is True


def test_multipage_pdf_extraction_and_page_numbers():
    """Validates multi-page document ordering and page-level text extraction."""
    page1 = "Page One: Foundations of Linear Algebra. Vectors and matrices."
    page2 = "Page Two: Matrix multiplication and eigenvalues."
    page3 = "Page Three: Singular Value Decomposition and applications."
    pdf_bytes = create_sample_pdf([page1, page2, page3])

    result = pdf_service.extract(pdf_bytes, filename="linear_algebra.pdf")

    assert result.page_count == 3
    assert len(result.pages) == 3
    assert result.pages[0].page_number == 1
    assert "Linear Algebra" in result.pages[0].text
    assert result.pages[1].page_number == 2
    assert "eigenvalues" in result.pages[1].text
    assert result.pages[2].page_number == 3
    assert "Singular Value Decomposition" in result.pages[2].text


def test_empty_pdf_rejected():
    """0-byte files must be rejected immediately."""
    with pytest.raises(PDFValidationError) as exc:
        pdf_service.extract(b"", filename="empty.pdf")
    assert "empty" in str(exc.value).lower()


def test_corrupted_pdf_rejected():
    """Files with non-PDF content or damaged streams must be rejected."""
    corrupted_bytes = b"%PDF-corrupted-and-broken-stream-data"
    with pytest.raises(PDFCorruptedError):
        pdf_service.extract(corrupted_bytes, filename="bad.pdf")


def test_invalid_signature_rejected():
    """Files without valid %PDF- magic signature must be rejected."""
    fake_pdf = b"This is a text file masquerading as a PDF."
    with pytest.raises(PDFValidationError) as exc:
        pdf_service.extract(fake_pdf, filename="fake.pdf")
    assert "signature" in str(exc.value).lower()


def test_password_protected_pdf_rejected():
    """Encrypted/password-protected PDFs must be rejected with helpful error."""
    encrypted_bytes = create_encrypted_pdf("studentpass")
    with pytest.raises(PDFPasswordProtectedError) as exc:
        pdf_service.extract(encrypted_bytes, filename="locked.pdf")
    assert "password" in str(exc.value).lower()


def test_image_only_pdf_detected():
    """Scanned or image-only PDFs must be detected without fabricating text."""
    image_pdf_bytes = create_image_only_pdf()
    result = pdf_service.extract(image_pdf_bytes, filename="scanned.pdf")

    assert result.page_count == 1
    assert result.is_scanned_image_only is True
    assert result.warning is not None
    assert "OCR support is not yet available" in result.warning
    assert result.total_characters == 0


def test_chunking_service_boundary_and_page_ranges():
    """Chunking preserves paragraph boundaries, chunk ordering, and page spans."""
    # Generate long content across two pages
    para1 = "Artificial intelligence is a branch of computer science focused on building smart machines capable of performing tasks that typically require human intelligence. " * 10
    para2 = "Deep learning is a subset of machine learning based on artificial neural networks with representation learning. Neural networks are composed of multiple layers. " * 10

    pages = [
        PDFPage(page_number=1, text=para1, char_count=len(para1), has_text=True),
        PDFPage(page_number=2, text=para2, char_count=len(para2), has_text=True),
    ]

    # Test with custom small target for deterministic testing
    custom_chunker = chunking_service.__class__(target_words=60, overlap_words=15)
    chunks = custom_chunker.chunk_document(pages)

    assert len(chunks) >= 2
    # Verify sequential chunk indexing
    for i, chunk in enumerate(chunks):
        assert chunk.chunk_index == i
        assert chunk.page_start in (1, 2)
        assert chunk.page_end in (1, 2)
        assert chunk.page_start <= chunk.page_end
        assert len(chunk.content) > 0
