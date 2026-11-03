from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AuthenticatedUser(BaseModel):
    """
    Authenticated user model derived exclusively from verified Supabase JWT claims.
    Never populated from unverified user request bodies.
    """
    id: str = Field(description="Unique Supabase user UUID (from 'sub' claim)")
    email: Optional[str] = Field(default=None, description="User email address")
    role: str = Field(default="authenticated", description="User role in Supabase")
    app_metadata: Dict[str, Any] = Field(default_factory=dict)
    user_metadata: Dict[str, Any] = Field(default_factory=dict)


class UserProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    field_of_study: Optional[str] = None
    explanation_level: str = "intermediate"
    learning_goal: str = "understanding"
    onboarding_completed: bool = False
