from typing import List, Dict, Any
from fastapi import HTTPException, status

from app.config import settings
from app.schemas.tutor import RetrievedChunk
from app.services.embedding_service import embedding_service
from app.services.document_db import document_db
from app.utils.logger import logger


class RetrievalService:
    """
    Executes semantic similarity search over document chunks.
    Guarantees tenant isolation: chunks retrieved are strictly constrained
    to the requested document and verified against the authenticated user.
    """

    def __init__(
        self,
        top_k: int = None,
        similarity_threshold: float = None,
    ):
        self.top_k = top_k or settings.RAG_TOP_K
        self.similarity_threshold = similarity_threshold or settings.RAG_SIMILARITY_THRESHOLD

    async def retrieve_relevant_chunks(
        self,
        document_id: str,
        user_id: str,
        query: str,
        top_k: int = None,
    ) -> List[RetrievedChunk]:
        """
        Embeds the query and performs vector similarity search over chunks.
        Validates user ownership and filters out passages below the similarity threshold.
        """
        k = top_k or self.top_k

        # 1. Verify document ownership
        doc = document_db.get_document(document_id, user_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "DOCUMENT_NOT_FOUND",
                    "message": "Document not found or you do not have permission to access it.",
                },
            )

        # 2. Convert student's question into vector embedding
        query_embedding = await embedding_service.embed_query(query)

        # 3. Search matching chunks via cosine similarity
        raw_matches = document_db.search_chunks(
            document_id=document_id,
            user_id=user_id,
            query_embedding=query_embedding,
            top_k=k,
            similarity_threshold=self.similarity_threshold,
        )

        retrieved = [
            RetrievedChunk(
                id=m["id"],
                document_id=m["document_id"],
                page_start=m["page_start"],
                page_end=m["page_end"],
                chunk_index=m["chunk_index"],
                content=m["content"],
                similarity=m["similarity"],
            )
            for m in raw_matches
        ]

        logger.info(
            f"Retrieved {len(retrieved)} relevant chunks for query in document {document_id} (threshold={self.similarity_threshold})"
        )
        return retrieved


retrieval_service = RetrievalService()
