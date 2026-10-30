"""FastAPI entry point for Utsav Planner web application."""

import logging
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

logger = logging.getLogger("utsav_planner")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="Utsav Planner",
    description="AI-powered planning assistant for Indian weddings, birthdays, and community festivals.",
    version="1.0.0",
    docs_url="/docs" if get_settings().environment == "development" else None,
    redoc_url=None,
)


# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add essential HTTP security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "font-src 'self';"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)

# Restricted CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Same-origin in production; configurable
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Static file serving
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# Global Exception Handler (Never leak stack traces)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Safely catch unhandled errors and return a sanitized JSON message."""
    logger.error("Unhandled exception: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing your event plan. Please try again.",
        },
    )


# Health Check Route
@app.get("/api/health", tags=["System"])
async def health_check() -> dict:
    """Return system health status and configuration presence."""
    settings = get_settings()
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "ai_ready": settings.has_gemini_key,
    }


# Root route serving single-page application
@app.get("/", tags=["UI"])
async def serve_index() -> FileResponse:
    """Serve the single-page application frontend."""
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Frontend UI file not found."},
        )
    return FileResponse(index_file)
