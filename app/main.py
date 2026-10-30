"""FastAPI entry point for Utsav Planner web application.

Coordinates deterministic planning engines, Gemini creative generation,
rate limiting, security middleware, and single-page application static delivery.
"""

from datetime import date, datetime
import logging
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.ai.ideas import generate_ideas
from app.config import get_settings
from app.models import CreativeIdeas, EventInput, PlanResponse, RefineRequest
from app.planner.budget import allocate_budget
from app.planner.checklist import build_checklist
from app.planner.timeline import build_timeline
from app.security import (
    PayloadAndContentTypeMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)

logger = logging.getLogger("utsav_planner")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

settings = get_settings()

app = FastAPI(
    title="Utsav Planner",
    description="AI-powered planning assistant for Indian weddings, birthdays, and community festivals.",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# ---------------------------------------------------------------------
# Middleware Stack (Outer to Inner)
# ---------------------------------------------------------------------
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(PayloadAndContentTypeMiddleware)

# Static file serving
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ---------------------------------------------------------------------
# Injectable Date Dependency
# ---------------------------------------------------------------------
KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
 
 
def get_today() -> date:
    """Return today's date in Asia/Kolkata time zone, injectable for deterministic testing."""
    return datetime.now(KOLKATA_TZ).date()


# ---------------------------------------------------------------------
# Standardized Error Handlers
# ---------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format validation errors into standard error schema without leaking raw user input."""
    error_details = []
    for err in exc.errors():
        loc_parts = [str(part) for part in err.get("loc", []) if part != "body"]
        loc = " -> ".join(loc_parts)
        msg = err.get("msg", "invalid")
        error_details.append(f"{loc}: {msg}" if loc else msg)

    clean_message = "; ".join(error_details) if error_details else "Invalid request data."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"Validation failed: {clean_message}",
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Format HTTP exceptions into standard error schema."""
    code_map = {
        400: "BAD_REQUEST",
        404: "NOT_FOUND",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        429: "RATE_LIMIT_EXCEEDED",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    headers = getattr(exc, "headers", None)
    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "error": {
                "code": code,
                "message": str(exc.detail) if exc.detail else "Request error.",
            }
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Safely catch unhandled errors and return a sanitized JSON message without leaking stack traces."""
    logger.error("Unhandled exception: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing your event plan. Please try again.",
            }
        },
    )


# ---------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------
@app.get("/api/health", tags=["System"])
async def health_check() -> dict:
    """Return system health status and configuration presence."""
    current_settings = get_settings()
    return {
        "status": "healthy",
        "app": current_settings.app_name,
        "version": current_settings.version,
        "environment": current_settings.environment,
        "ai_ready": current_settings.has_gemini_key,
    }


@app.post(
    "/api/plan",
    response_model=PlanResponse,
    tags=["Planner"],
)
def plan_event(
    event: EventInput,
    today: date = Depends(get_today),
) -> PlanResponse:
    """Generate a complete event plan: budget, timeline, checklist, and creative ideas."""
    budget = allocate_budget(event)
    timeline = build_timeline(event, today=today)
    checklist = build_checklist(event)
    ideas = generate_ideas(event, budget)

    return PlanResponse(
        event_summary=event,
        budget=budget,
        timeline=timeline,
        checklist=checklist,
        ideas=ideas,
    )


@app.post(
    "/api/refine",
    response_model=CreativeIdeas,
    tags=["Planner"],
)
def refine_ideas(request: RefineRequest) -> CreativeIdeas:
    """Refine creative ideas using natural language instructions while maintaining plan structure."""
    budget = allocate_budget(request.event_input)
    ideas = generate_ideas(
        request.event_input,
        budget,
        refinement=request.refinement_prompt,
    )
    return ideas


# ---------------------------------------------------------------------
# Frontend Entry Point
# ---------------------------------------------------------------------
@app.get("/", tags=["UI"])
async def serve_index() -> FileResponse:
    """Serve the single-page application frontend."""
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Frontend UI file not found.",
                }
            },
        )
    return FileResponse(index_file)
