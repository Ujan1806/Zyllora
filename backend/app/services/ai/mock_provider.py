import hashlib
import json
import re
from typing import List, Dict, Any, Type, Optional
import numpy as np
from pydantic import BaseModel

from app.services.ai.base import BaseLLMProvider, BaseEmbeddingProvider
from app.schemas.tutor import TutorResponse, Citation
from app.utils.logger import logger


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """
    Deterministic semantic hash embedding provider for offline development & tests.
    Produces 768-dimensional normalized vectors with real word co-occurrence similarity.
    """

    def __init__(self, dimensions: int = 768):
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def _hash_word(self, word: str) -> np.ndarray:
        """Projects a word onto a 768-dimensional space deterministically."""
        seed = int(hashlib.md5(word.lower().encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.RandomState(seed)
        vec = rng.randn(self._dimensions)
        norm = np.linalg.norm(vec)
        return vec / (norm if norm > 0 else 1.0)

    async def get_embedding(self, text: str) -> List[float]:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        if not words:
            return [0.0] * self._dimensions

        total_vec = np.zeros(self._dimensions)
        for w in words:
            total_vec += self._hash_word(w)

        norm = np.linalg.norm(total_vec)
        if norm > 0:
            total_vec = total_vec / norm

        return total_vec.tolist()

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        return [await self.get_embedding(t) for t in texts]


class MockLLMProvider(BaseLLMProvider):
    """
    Deterministic mock LLM for testing, CI/CD, and offline demonstration.
    Extracts citations from retrieved context and generates structured responses.
    """

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.2,
    ) -> str:
        return (
            f"Based on the provided document passages, here is the explanation: {user_prompt[:80]}...\n\n"
            "Key takeaways are highlighted in the source pages cited."
        )

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: Type[BaseModel],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.1,
    ) -> BaseModel:
        # Check if user prompt contains context passages with [Page X] or [Chunk ID]
        citations = []
        page_matches = re.findall(r'Page\s+(\d+)', user_prompt, re.IGNORECASE)
        chunk_matches = re.findall(r'Chunk\s+ID:\s*([a-zA-Z0-9-]+)', user_prompt)

        unique_pages = sorted(list(set(int(p) for p in page_matches)))

        for i, page_num in enumerate(unique_pages[:3]):
            chunk_id = chunk_matches[i] if i < len(chunk_matches) else f"chunk-{page_num}"
            citations.append(
                Citation(
                    page_number=page_num,
                    chunk_id=chunk_id,
                    excerpt=f"Extracted concept referenced on Page {page_num} of the course syllabus.",
                )
            )

        # Detect out-of-scope or empty context
        is_grounded = len(citations) > 0

        if not is_grounded:
            answer = (
                "The uploaded document does not contain sufficient information to answer this question. "
                "I am constrained strictly to your course material and will not invent facts."
            )
            key_points = ["Information not found in uploaded PDF", "Consult course instructor or syllabus"]
        else:
            answer = (
                f"According to your course material (Page {unique_pages[0]}), this topic is defined as a fundamental concept. "
                "The text illustrates this through structured principles and step-by-step logic."
            )
            key_points = [
                f"Core definition established on Page {unique_pages[0]}",
                "Concepts are broken down with mathematical and theoretical rigor",
                "Referenced directly from your lecture material",
            ]

        response_data = {
            "answer": answer,
            "key_points": key_points,
            "example": "For instance, consider how this applies to sample problems presented in the chapter exercises." if is_grounded else None,
            "citations": [c.model_dump() for c in citations],
            "grounded": is_grounded,
        }

        return schema(**response_data)
