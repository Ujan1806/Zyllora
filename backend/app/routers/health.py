from datetime import datetime
from fastapi import APIRouter
from app.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Returns service status, version, and operational confirmation for Zyllora backend.",
)
async def check_health() -> HealthResponse:
    """
    Health-check endpoint: GET /api/v1/health
    Used by frontend, docker healthchecks, and uptime monitors.
    """
    return HealthResponse(
        status="ok",
        app=settings.PROJECT_NAME,
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow(),
    )
