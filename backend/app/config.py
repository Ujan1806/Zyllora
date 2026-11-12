from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Zyllora API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Supabase Configuration
    SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    SUPABASE_ANON_KEY: str = "placeholder-anon-key"
    SUPABASE_JWT_SECRET: str = "placeholder-jwt-secret-replace-with-actual-supabase-secret"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    STORAGE_BUCKET: str = "documents"
    LOCAL_STORAGE_DIR: str = "storage/documents"

    # Document & PDF Upload Limits
    MAX_FILE_SIZE_MB: int = 50
    MAX_PAGE_COUNT: int = 200
    PROCESSING_TIMEOUT_SECONDS: int = 300

    # Text Chunking Settings (500–800 tokens approx., 1 token ~ 4 chars or 0.75 words)
    CHUNK_TARGET_WORDS: int = 600
    CHUNK_OVERLAP_WORDS: int = 80

    # AI Provider & Model Configuration
    AI_PROVIDER: str = "gemini"  # "gemini" | "openai" | "groq" | "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    # Embedding Settings
    EMBEDDING_PROVIDER: str = "gemini"  # "gemini" | "openai" | "mock"
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 768

    # RAG Retrieval Configuration
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.35
    RAG_MAX_CONTEXT_MESSAGES: int = 6
    RAG_MAX_USER_MESSAGE_LENGTH: int = 2500

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
