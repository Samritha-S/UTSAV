"""Global pytest fixtures and state management for Utsav Planner tests."""

import pytest

from app.ai.cache import ideas_cache
from app.main import app
from app.security import ai_rate_limiter, general_rate_limiter


@pytest.fixture(autouse=True)
def reset_shared_state():
    """Reset all shared module-level state before and after every test."""
    ai_rate_limiter.clear()
    general_rate_limiter.clear()
    ideas_cache.clear()
    app.dependency_overrides.clear()
    yield
    ai_rate_limiter.clear()
    general_rate_limiter.clear()
    ideas_cache.clear()
    app.dependency_overrides.clear()
