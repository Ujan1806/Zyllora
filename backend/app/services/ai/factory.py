from app.config import settings
from app.services.ai.base import BaseLLMProvider, BaseEmbeddingProvider
from app.services.ai.gemini_provider import GeminiProvider, GeminiEmbeddingProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.mock_provider import MockLLMProvider, MockEmbeddingProvider
from app.utils.logger import logger


def get_llm_provider() -> BaseLLMProvider:
    """
    Returns the configured LLM provider.
    Gracefully defaults to MockLLMProvider if API keys are unconfigured in development.
    """
    provider_name = settings.AI_PROVIDER.lower().strip()

    if provider_name == "gemini":
        if settings.GEMINI_API_KEY and "your-gemini" not in settings.GEMINI_API_KEY:
            return GeminiProvider()
        else:
            logger.info("Gemini API key not configured. Using MockLLMProvider for offline development and testing.")
            return MockLLMProvider()

    elif provider_name in ("openai", "groq"):
        if settings.OPENAI_API_KEY:
            return OpenAIProvider()
        else:
            logger.info("OpenAI API key not configured. Using MockLLMProvider for offline development and testing.")
            return MockLLMProvider()

    elif provider_name == "mock":
        return MockLLMProvider()

    logger.warning(f"Unknown AI_PROVIDER '{provider_name}'. Defaulting to MockLLMProvider.")
    return MockLLMProvider()


def get_embedding_provider() -> BaseEmbeddingProvider:
    """
    Returns the configured vector embedding provider.
    """
    provider_name = settings.EMBEDDING_PROVIDER.lower().strip()

    if provider_name == "gemini":
        if settings.GEMINI_API_KEY and "your-gemini" not in settings.GEMINI_API_KEY:
            return GeminiEmbeddingProvider()
        else:
            return MockEmbeddingProvider(dimensions=settings.EMBEDDING_DIMENSIONS)

    elif provider_name == "mock":
        return MockEmbeddingProvider(dimensions=settings.EMBEDDING_DIMENSIONS)

    return MockEmbeddingProvider(dimensions=settings.EMBEDDING_DIMENSIONS)
