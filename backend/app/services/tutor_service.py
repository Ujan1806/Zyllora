import uuid
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

from app.config import settings
from app.schemas.tutor import (
    TutorChatRequest,
    TutorResponse,
    Citation,
    SessionResponse,
    ChatMessageResponse,
    SessionDetailResponse,
    CreateSessionRequest,
)
from app.services.ai.factory import get_llm_provider
from app.services.retrieval_service import retrieval_service
from app.services.prompt_service import prompt_service
from app.services.document_db import document_db
from app.utils.logger import logger


class TutorService:
    """
    Coordinates RAG semantic retrieval, prompt synthesis, AI tutor generation,
    and study session lifecycle management.
    """

    def create_session(
        self,
        user_id: str,
        request: CreateSessionRequest,
    ) -> SessionResponse:
        """Creates a persistent study session linked to a specific document."""
        # Validate document ownership
        doc = document_db.get_document(request.document_id, user_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "DOCUMENT_NOT_FOUND",
                    "message": "Document not found or you do not have permission to access it.",
                },
            )

        session_id = str(uuid.uuid4())
        title = request.title or f"Study: {doc['title'][:30]}"
        session_data = document_db.create_session(
            session_id=session_id,
            user_id=user_id,
            document_id=request.document_id,
            title=title,
            mode=request.mode,
        )
        return SessionResponse(**session_data)

    def list_sessions(
        self,
        user_id: str,
        document_id: Optional[str] = None,
    ) -> List[SessionResponse]:
        """Lists study sessions belonging to the user."""
        sessions = document_db.list_sessions(user_id=user_id, document_id=document_id)
        return [SessionResponse(**s) for s in sessions]

    def get_session_detail(
        self,
        session_id: str,
        user_id: str,
    ) -> SessionDetailResponse:
        """Retrieves session metadata and full conversation history."""
        session = document_db.get_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "SESSION_NOT_FOUND",
                    "message": "Study session not found or you do not have permission to access it.",
                },
            )

        messages = document_db.get_session_messages(session_id, user_id)
        return SessionDetailResponse(
            session=SessionResponse(**session),
            messages=[ChatMessageResponse(**m) for m in messages],
        )

    def delete_session(self, session_id: str, user_id: str) -> bool:
        """Permanently deletes a study session and cascades all messages."""
        deleted = document_db.delete_session(session_id, user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "SESSION_NOT_FOUND",
                    "message": "Study session not found or you do not have permission to delete it.",
                },
            )
        return True

    async def chat(
        self,
        user_id: str,
        request: TutorChatRequest,
    ) -> TutorResponse:
        """
        Executes complete RAG pipeline:
        1. Validate ownership of document and session.
        2. Semantic retrieval of top-k document chunks.
        3. Formulate system and context-grounded user prompt.
        4. Invoke provider-independent LLM with conversation history.
        5. Persist user and assistant messages in database.
        6. Return validated structured response.
        """
        # 1. Validate session and document ownership
        session = document_db.get_session(request.session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "SESSION_NOT_FOUND",
                    "message": "Study session not found or access denied.",
                },
            )

        if session["document_id"] != request.document_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "SESSION_DOCUMENT_MISMATCH",
                    "message": "Session is associated with a different document.",
                },
            )

        # 2. Semantic retrieval
        retrieved_chunks = await retrieval_service.retrieve_relevant_chunks(
            document_id=request.document_id,
            user_id=user_id,
            query=request.message,
            top_k=settings.RAG_TOP_K,
        )

        # 3. Prompt construction
        system_prompt = prompt_service.get_system_prompt(mode=request.mode)
        user_prompt = prompt_service.format_user_prompt(
            question=request.message,
            chunks=retrieved_chunks,
        )

        # 4. Fetch recent conversation history (constrained to window)
        raw_history = document_db.get_session_messages(
            session_id=request.session_id,
            user_id=user_id,
            limit=settings.RAG_MAX_CONTEXT_MESSAGES,
        )
        formatted_history = [
            {"role": m["role"], "content": m["content"]}
            for m in raw_history
        ]

        # 5. Invoke LLM provider
        llm = get_llm_provider()
        try:
            tutor_response: TutorResponse = await llm.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema=TutorResponse,
                conversation_history=formatted_history,
            )
        except Exception as e:
            logger.error(f"AI generation failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error_code": "AI_PROVIDER_ERROR",
                    "message": f"AI Tutor is temporarily unable to generate a response: {str(e)}",
                },
            )

        # 6. Save user message in database
        user_msg_id = str(uuid.uuid4())
        document_db.save_message(
            message_id=user_msg_id,
            session_id=request.session_id,
            user_id=user_id,
            role="user",
            content=request.message,
            metadata={"mode": request.mode},
        )

        # 7. Save assistant message in database with citations metadata
        assistant_msg_id = str(uuid.uuid4())
        document_db.save_message(
            message_id=assistant_msg_id,
            session_id=request.session_id,
            user_id=user_id,
            role="assistant",
            content=tutor_response.answer,
            metadata={
                "key_points": tutor_response.key_points,
                "example": tutor_response.example,
                "citations": [c.model_dump() for c in tutor_response.citations],
                "grounded": tutor_response.grounded,
                "mode": request.mode,
            },
        )

        # Auto-update session title if it's the initial query and still default
        if session["title"] in ("New Study Session", "Study Session"):
            short_title = request.message[:35].strip()
            if len(request.message) > 35:
                short_title += "..."
            document_db.update_session_title(request.session_id, user_id, short_title)

        return tutor_response


tutor_service = TutorService()
