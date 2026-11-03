from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser, UserProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get Current User Profile",
    description="Validates the client's Supabase JWT token and extracts verified identity.",
)
async def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfileResponse:
    """
    Derives the authenticated user strictly from the verified JWT.
    Does not trust any user ID sent in request bodies.
    """
    user_meta = current_user.user_metadata or {}
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=user_meta.get("full_name") or user_meta.get("name"),
        field_of_study=user_meta.get("field_of_study"),
        explanation_level=user_meta.get("explanation_level", "intermediate"),
        learning_goal=user_meta.get("learning_goal", "understanding"),
        onboarding_completed=user_meta.get("onboarding_completed", False),
    )
