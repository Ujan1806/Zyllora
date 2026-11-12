import json
from typing import List, Dict, Any, Type, Optional
import httpx
from pydantic import BaseModel

from app.config import settings
from app.services.ai.base import BaseLLMProvider, BaseEmbeddingProvider
from app.utils.logger import logger


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI-compatible text generation provider (supports OpenAI, Groq, Ollama, DeepSeek).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.2,
    ) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"OpenAI API returned HTTP {resp.status_code}: {resp.text}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: Type[BaseModel],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.1,
    ) -> BaseModel:
        # Prompt model for JSON conforming to schema
        enhanced_system = (
            f"{system_prompt}\n\n"
            "CRITICAL: You MUST respond with a valid JSON object strictly matching this schema:\n"
            f"{json.dumps(schema.model_json_schema())}\n"
            "Do not output markdown codeblocks, only pure JSON."
        )

        messages = [{"role": "system", "content": enhanced_system}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"OpenAI API returned HTTP {resp.status_code}: {resp.text}")
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            parsed_dict = json.loads(raw_text)
            return schema(**parsed_dict)
