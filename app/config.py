"""Configuration module for Utsav Planner application."""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# Load .env file if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        self.app_name: str = "Utsav Planner"
        self.version: str = "1.0.0"
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.debug: bool = (
            os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
            or self.environment == "development"
        )
        self.port: int = int(os.getenv("PORT", "8000"))
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self.gemini_timeout_seconds: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
        self.rate_limit_ai_per_minute: int = int(os.getenv("RATE_LIMIT_AI_PER_MINUTE", "10"))
        self.rate_limit_general_per_minute: int = int(
            os.getenv("RATE_LIMIT_GENERAL_PER_MINUTE", "60")
        )
        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
        self.cache_size: int = int(os.getenv("CACHE_SIZE", "128"))
        self.trust_proxy_headers: bool = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in (
            "true",
            "1",
            "yes",
        )
        raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000")
        self.cors_origins: list[str] = [
            orig.strip() for orig in raw_origins.split(",") if orig.strip()
        ]

    @property
    def has_gemini_key(self) -> bool:
        """Check if a Gemini API key is configured without exposing it."""
        return bool(self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
