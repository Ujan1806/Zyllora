from fastapi import APIRouter
from app.routers import health, auth, documents, tutor

api_router = APIRouter()

# Health routes (/api/v1/health)
api_router.include_router(health.router)

# Auth routes (/api/v1/auth/me, etc.)
api_router.include_router(auth.router)

# Document upload & processing routes (/api/v1/documents)
api_router.include_router(documents.router)

# AI Tutor & RAG routes (/api/v1/tutor)
api_router.include_router(tutor.router)
