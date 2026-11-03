from typing import Any, Optional
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    success: bool = Field(default=False)
    error_code: str = Field(description="Machine-readable error identifier")
    message: str = Field(description="Human-readable description of error")
    details: Optional[Any] = Field(default=None, description="Optional extra error context")
