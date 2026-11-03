from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.routers.api import api_router
from app.schemas.error import ErrorResponse
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] mode")
    logger.info(f"API v1 prefix mounted at {settings.API_V1_PREFIX}")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API service for Zyllora — AI-powered learning platform for university students.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Centralized Error Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handles standard HTTPExceptions with a consistent JSON schema."""
    error_code = "HTTP_ERROR"
    message = str(exc.detail)
    details = None

    if isinstance(exc.detail, dict):
        error_code = exc.detail.get("error_code", error_code)
        message = exc.detail.get("message", message)
        details = exc.detail.get("details", None)

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            error_code=error_code,
            message=message,
            details=details,
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles Pydantic request validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            success=False,
            error_code="VALIDATION_ERROR",
            message="Invalid request payload or parameters.",
            details=exc.errors(),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catches unhandled server exceptions safely without leaking internal secrets."""
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            success=False,
            error_code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please try again later.",
            details=str(exc) if settings.DEBUG else None,
        ).model_dump(),
    )


# ------------------------------------------------------------------------------
# Mount Routers
# ------------------------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    """Root entry confirming backend is active and pointing to API documentation."""
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "Your study material. Your personal AI tutor.",
        "status": "online",
        "documentation": "/docs",
        "health_check": f"{settings.API_V1_PREFIX}/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
