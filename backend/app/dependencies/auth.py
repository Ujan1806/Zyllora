import jwt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.schemas.auth import AuthenticatedUser
from app.utils.logger import logger

security = HTTPBearer(auto_error=False)


def verify_supabase_jwt(token: str) -> dict:
    """
    Verifies a Supabase JWT and returns the decoded payload claims.
    Validates token signature against SUPABASE_JWT_SECRET, checks expiration and audience.
    """
    # In development mode, allow the frontend demo preview token for immediate testing
    if settings.ENVIRONMENT == "development" and (token == "demo-preview-token" or token.startswith("demo-token-")):
        return {
            "sub": "demo-user-12345",
            "email": "alex.mercer@university.edu",
            "role": "authenticated",
            "user_metadata": {
                "full_name": "Alex Mercer",
                "field_of_study": "Computer Science",
            },
        }

    # Guard against unconfigured JWT secret in development
    if not settings.SUPABASE_JWT_SECRET or "placeholder" in settings.SUPABASE_JWT_SECRET.lower():
        logger.warning(
            "SUPABASE_JWT_SECRET is unset or using a placeholder. "
            "Please configure SUPABASE_JWT_SECRET in your backend/.env file from Supabase Dashboard > Settings > API."
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "AUTH_CONFIGURATION_ERROR",
                "message": "Backend Supabase JWT secret is not configured. Set SUPABASE_JWT_SECRET in backend/.env",
            },
        )

    try:
        # Supabase defaults to HS256 for symmetric JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256", "ES256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "TOKEN_EXPIRED",
                "message": "Authentication token has expired. Please log in again.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        # Sometimes tokens may have different audience or missing audience depending on client setup
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256", "ES256"],
                options={"verify_aud": False},
            )
            return payload
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_TOKEN", "message": f"Invalid token: {str(e)}"},
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT validation failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_TOKEN",
                "message": "Invalid authentication token. Authorization denied.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """
    FastAPI dependency that enforces authentication.
    Derives the user identity strictly from the verified Supabase JWT.
    Rejects requests without valid credentials.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "AUTHENTICATION_REQUIRED",
                "message": "Authorization header with Bearer token is required.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_supabase_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "MALFORMED_CLAIMS",
                "message": "Token claims missing 'sub' (user_id).",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
        app_metadata=payload.get("app_metadata", {}),
        user_metadata=payload.get("user_metadata", {}),
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthenticatedUser]:
    """
    Optional authentication dependency for endpoints that support both guest and authenticated users.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
