"""Configuration module for Utsav Planner application."""

from functools import lru_cache
import os
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
        self.port: int = int(os.getenv("PORT", "8000"))
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
        self.cache_size: int = int(os.getenv("CACHE_SIZE", "100"))

    @property
    def has_gemini_key(self) -> bool:
        """Check if a Gemini API key is configured without exposing it."""
        return bool(self.gemini_api_key)


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
