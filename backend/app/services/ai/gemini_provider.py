import json
from typing import List, Dict, Any, Type, Optional
import httpx
from pydantic import BaseModel

from app.config import settings
from app.services.ai.base import BaseLLMProvider, BaseEmbeddingProvider
from app.utils.logger import logger


class GeminiAPIError(Exception):
    """Exception raised for Google Gemini API errors."""
    pass


class GeminiProvider(BaseLLMProvider):
    """
    Production-grade Google Gemini AI provider implementation.
    Utilizes Gemini 1.5 Flash / 2.0 Flash with native structured JSON output mode,
    free-tier rate limit handling, and strict prompt injection isolation.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.2,
    ) -> str:
        if not self.api_key or "your-gemini" in self.api_key:
            raise GeminiAPIError("Gemini API key is not configured in backend/.env")

        url = f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}"

        contents = []
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        contents.append({"role": "user", "parts": [{"text": user_prompt}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 2048,
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 429:
                raise GeminiAPIError("Gemini rate limit exceeded. Please wait a moment before trying again.")
            if resp.status_code != 200:
                raise GeminiAPIError(f"Gemini API returned HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                raise GeminiAPIError("Failed to extract valid text from Gemini response.")

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: Type[BaseModel],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.1,
    ) -> BaseModel:
        if not self.api_key or "your-gemini" in self.api_key:
            raise GeminiAPIError("Gemini API key is not configured in backend/.env")

        url = f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}"

        contents = []
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        contents.append({"role": "user", "parts": [{"text": user_prompt}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "response_mime_type": "application/json",
                "maxOutputTokens": 2048,
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 429:
                raise GeminiAPIError("Gemini rate limit exceeded (HTTP 429). Please retry in a few moments.")
            if resp.status_code != 200:
                raise GeminiAPIError(f"Gemini API returned HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                raw_json = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed_dict = json.loads(raw_json)
                return schema(**parsed_dict)
            except Exception as e:
                logger.error(f"Failed to parse Gemini structured JSON: {e}")
                raise GeminiAPIError(f"Model output failed validation against schema: {str(e)}")


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """
    Google Gemini text-embedding-004 provider producing 768-dimensional embeddings.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.EMBEDDING_MODEL

    @property
    def dimensions(self) -> int:
        return settings.EMBEDDING_DIMENSIONS

    async def get_embedding(self, text: str) -> List[float]:
        if not self.api_key or "your-gemini" in self.api_key:
            raise GeminiAPIError("Gemini API key is not configured in backend/.env")

        url = f"{self.BASE_URL}/{self.model}:embedContent?key={self.api_key}"
        payload = {
            "model": f"models/{self.model}",
            "content": {"parts": [{"text": text[:3000]}]},  # truncation limit for single chunk
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise GeminiAPIError(f"Gemini embedding failed with HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            return data["embedding"]["values"]

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        # Generate batch embeddings sequentially or in small groups to respect rate limits
        results = []
        for text in texts:
            emb = await self.get_embedding(text)
            results.append(emb)
        return results
