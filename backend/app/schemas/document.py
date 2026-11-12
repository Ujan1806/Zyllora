from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    page_start: int
    page_end: int
    chunk_index: int
    content: str
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    id: str
    title: str
    file_size: int
    page_count: int = 0
    status: str
    message: str = "Document uploaded successfully and queued for processing."
    created_at: datetime


class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    page_count: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentResponse(BaseModel):
    id: str
    user_id: str
    title: str
    storage_path: str
    file_size: int
    page_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chunk_count: Optional[int] = 0


class DocumentPageResponse(BaseModel):
    document_id: str
    page_number: int
    total_pages: int
    content: str
    has_text: bool
    warning: Optional[str] = None
    chunks: List[DocumentChunkResponse] = Field(default_factory=list)


class DocumentDeleteResponse(BaseModel):
    success: bool = True
    document_id: str
    message: str = "Document and all associated chunks deleted successfully."
