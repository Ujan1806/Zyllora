from abc import ABC, abstractmethod
from typing import List, Dict, Any, Type, Optional
from pydantic import BaseModel


class BaseLLMProvider(ABC):
    """
    Abstract interface for text generation models.
    Decouples tutor logic from any specific AI provider (Gemini, OpenAI, Groq, etc.).
    """

    @abstractmethod
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.2,
    ) -> str:
        """Generates standard textual response given system and user prompts."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: Type[BaseModel],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.1,
    ) -> BaseModel:
        """
        Generates response constrained strictly to a given Pydantic schema.
        Ensures reliable JSON parsing and schema validation.
        """
        pass


class BaseEmbeddingProvider(ABC):
    """
    Abstract interface for text embedding models.
    Supports single or batch vector embedding generation.
    """

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Vector embedding dimensionality (e.g., 768 for Gemini, 1536 for OpenAI)."""
        pass

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generates vector embedding for a single text chunk or query."""
        pass

    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates vector embeddings for a list of text chunks in batch."""
        pass
