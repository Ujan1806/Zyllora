from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, status

from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser
from app.schemas.tutor import (
    CreateSessionRequest,
    SessionResponse,
    SessionDetailResponse,
    TutorChatRequest,
    TutorResponse,
)
from app.services.tutor_service import tutor_service

router = APIRouter(prefix="/tutor", tags=["AI Tutor & RAG"])


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Study Session",
    description="Initializes a persistent AI study conversation linked to an uploaded academic PDF.",
)
async def create_session(
    request: CreateSessionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> SessionResponse:
    return tutor_service.create_session(user_id=current_user.id, request=request)


@router.get(
    "/sessions",
    response_model=List[SessionResponse],
    summary="List Study Sessions",
    description="Returns all active study sessions owned by the authenticated student, optionally filtered by document.",
)
async def list_sessions(
    document_id: Optional[str] = Query(None, description="Optional document ID filter"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> List[SessionResponse]:
    return tutor_service.list_sessions(user_id=current_user.id, document_id=document_id)


@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get Study Session History",
    description="Retrieves a study session and its complete message history.",
)
async def get_session(
    session_id: str = Path(..., description="UUID of the study session"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> SessionDetailResponse:
    return tutor_service.get_session_detail(session_id=session_id, user_id=current_user.id)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Study Session",
    description="Permanently deletes a study session and cascades all message records.",
)
async def delete_session(
    session_id: str = Path(..., description="UUID of the study session"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    tutor_service.delete_session(session_id=session_id, user_id=current_user.id)
    return {"success": True, "session_id": session_id, "message": "Study session deleted successfully."}


@router.post(
    "/chat",
    response_model=TutorResponse,
    summary="Query AI Academic Tutor",
    description="Interacts with the AI tutor using semantic RAG retrieval, citations, and adaptive explanation modes.",
)
async def chat_with_tutor(
    request: TutorChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TutorResponse:
    """
    RAG Pipeline:
    1. Validates authenticated user and document/session ownership.
    2. Semantically retrieves top-k relevant PDF chunks via cosine similarity.
    3. Prompts the AI model to explain concepts strictly backed by the PDF.
    4. Cites exact PDF page numbers for every assertion.
    5. Stores user and assistant messages in conversation history.
    """
    return await tutor_service.chat(user_id=current_user.id, request=request)
