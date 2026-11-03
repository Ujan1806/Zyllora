from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", example="ok")
    app: str = Field(default="Zyllora API", example="Zyllora API")
    version: str = Field(default="1.0.0", example="1.0.0")
    environment: str = Field(default="development", example="development")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
