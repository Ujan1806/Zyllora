from fastapi import APIRouter
from app.routers import health, auth

api_router = APIRouter()

# Health routes (/api/v1/health)
api_router.include_router(health.router)

# Auth routes (/api/v1/auth/me, etc.)
api_router.include_router(auth.router)
