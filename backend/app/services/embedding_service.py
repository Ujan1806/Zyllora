from typing import List, Dict, Any
from app.services.ai.factory import get_embedding_provider
from app.utils.logger import logger


class EmbeddingService:
    """
    Manages vector embeddings for academic document chunks and retrieval queries.
    Uses configured embedding provider (Gemini text-embedding-004 or Mock).
    """

    def __init__(self):
        self.provider = get_embedding_provider()

    async def embed_query(self, query: str) -> List[float]:
        """Generates embedding vector for student search query."""
        if not query or not query.strip():
            return [0.0] * self.provider.dimensions
        return await self.provider.get_embedding(query.strip())

    async def embed_chunks(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generates embeddings for document chunks in batches, attaching
        the vector embedding to each chunk record.
        """
        if not chunks:
            return []

        texts = [c["content"] for c in chunks]
        logger.info(f"Generating vector embeddings for {len(texts)} document chunks...")

        try:
            embeddings = await self.provider.get_embeddings(texts)
            for chunk, emb in zip(chunks, embeddings):
                chunk["embedding"] = emb
            return chunks
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}. Falling back to default vectors.", exc_info=True)
            # Attach empty/neutral vectors so document can still be saved
            for chunk in chunks:
                chunk["embedding"] = [0.0] * self.provider.dimensions
            return chunks


embedding_service = EmbeddingService()
