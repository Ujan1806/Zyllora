from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

# Valid tutor explanation modes for Week 3
TutorMode = Literal["beginner", "detailed", "step_by_step", "example_based"]


class Citation(BaseModel):
    page_number: int = Field(..., description="The 1-indexed PDF source page number")
    chunk_id: str = Field(..., description="ID of the source document chunk")
    excerpt: str = Field(..., description="Short verbatim or key supporting excerpt from the PDF")


class TutorResponse(BaseModel):
    """Structured response schema returned by the AI tutor."""
    answer: str = Field(..., description="Core pedagogical explanation answering the student question")
    key_points: List[str] = Field(default_factory=list, description="Bullet list of main takeaways or definitions")
    example: Optional[str] = Field(default=None, description="Illustrative worked example or concrete analogy if relevant")
    citations: List[Citation] = Field(default_factory=list, description="Genuine page citations from the uploaded material")
    grounded: bool = Field(default=True, description="Whether the answer is strictly substantiated by the document")


class TutorChatRequest(BaseModel):
    document_id: str = Field(..., description="UUID of the course document being studied")
    session_id: str = Field(..., description="UUID of the active study session")
    message: str = Field(..., min_length=1, max_length=2500, description="The student's question or prompt")
    mode: TutorMode = Field(default="detailed", description="Selected teaching mode")


class CreateSessionRequest(BaseModel):
    document_id: str = Field(..., description="UUID of the document for this study session")
    title: Optional[str] = Field(default="New Study Session", max_length=100)
    mode: TutorMode = Field(default="detailed")


class SessionResponse(BaseModel):
    id: str
    user_id: str
    document_id: str
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class SessionDetailResponse(BaseModel):
    session: SessionResponse
    messages: List[ChatMessageResponse] = Field(default_factory=list)


class RetrievedChunk(BaseModel):
    id: str
    document_id: str
    page_start: int
    page_end: int
    chunk_index: int
    content: str
    similarity: float
