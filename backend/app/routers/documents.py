from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, Path, status

from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser
from app.schemas.document import (
    DocumentResponse,
    DocumentStatusResponse,
    DocumentUploadResponse,
    DocumentPageResponse,
    DocumentDeleteResponse,
)
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload Academic PDF",
    description="Uploads an academic PDF, validates file signature & size limits, and queues background processing.",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Academic PDF file"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentUploadResponse:
    """
    Enforces user authentication, validates file extension and magic signature,
    stores raw PDF privately, and kicks off asynchronous background text extraction.
    """
    upload_result = await document_service.upload_document(
        user_id=current_user.id,
        file=file,
    )

    doc = upload_result["document"]

    # Queue background extraction and chunking
    background_tasks.add_task(
        document_service.process_document_background,
        document_id=doc["id"],
        user_id=current_user.id,
        file_bytes=upload_result["file_bytes"],
        filename=upload_result["filename"],
    )

    return DocumentUploadResponse(
        id=doc["id"],
        title=doc["title"],
        file_size=doc["file_size"],
        page_count=0,
        status="processing",
        message="Document uploaded successfully and queued for extraction.",
        created_at=doc["created_at"],
    )


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List User Documents",
    description="Returns all uploaded documents owned by the authenticated student.",
)
async def list_documents(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> List[DocumentResponse]:
    """Retrieves all documents strictly belonging to the authenticated user."""
    docs = document_service.list_documents(user_id=current_user.id)
    return [DocumentResponse(**d) for d in docs]


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get Document Details",
    description="Retrieves a specific document and its metadata, enforcing ownership verification.",
)
async def get_document(
    document_id: str = Path(..., description="UUID of the document"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentResponse:
    """Fetches document metadata, strictly validating user ownership."""
    doc = document_service.get_document(document_id=document_id, user_id=current_user.id)
    return DocumentResponse(**doc)


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Check Document Processing Status",
    description="Fast polling endpoint to track whether document extraction is processing, ready, or failed.",
)
async def get_document_status(
    document_id: str = Path(..., description="UUID of the document"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentStatusResponse:
    """Returns processing status, page count, and any error message."""
    status_data = document_service.get_document_status(document_id=document_id, user_id=current_user.id)
    return DocumentStatusResponse(**status_data)


@router.get(
    "/{document_id}/pages/{page_number}",
    response_model=DocumentPageResponse,
    summary="Get Extracted Page Content",
    description="Returns page-level text and associated chunk references for a specific PDF page.",
)
async def get_document_page(
    document_id: str = Path(..., description="UUID of the document"),
    page_number: int = Path(..., ge=1, description="1-indexed PDF page number"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentPageResponse:
    """Retrieves page text and intersecting chunks, validating ownership and bounds."""
    page_data = document_service.get_document_page(
        document_id=document_id,
        user_id=current_user.id,
        page_number=page_number,
    )
    return DocumentPageResponse(**page_data)


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete Document",
    description="Deletes a document, purges all extracted chunks, and removes the PDF from private storage.",
)
async def delete_document(
    document_id: str = Path(..., description="UUID of the document"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentDeleteResponse:
    """Permanently deletes document and associated data with cascade guarantee."""
    result = await document_service.delete_document(document_id=document_id, user_id=current_user.id)
    return DocumentDeleteResponse(**result)


@router.post(
    "/{document_id}/retry",
    response_model=DocumentResponse,
    summary="Retry Document Processing",
    description="Retries processing for a document that previously encountered a failure.",
)
async def retry_document(
    document_id: str = Path(..., description="UUID of the document"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentResponse:
    """Retries text extraction and chunking without creating duplicate chunks."""
    updated = await document_service.retry_document_processing(
        document_id=document_id,
        user_id=current_user.id,
    )
    return DocumentResponse(**updated)
