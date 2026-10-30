"""Smoke tests for Utsav Planner application and schema validation."""

from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models import (
    CityTier,
    DietaryPreference,
    EventInput,
    EventType,
    VenueSetting,
)

client = TestClient(app)


def test_health_check_endpoint():
    """Verify /api/health endpoint returns 200 OK and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "Utsav Planner"
    assert "version" in data


def test_serve_index_html():
    """Verify root / endpoint serves the HTML interface with security headers."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Utsav Planner" in response.text
    # Check security headers
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"


def test_event_input_valid():
    """Verify EventInput accepts valid event parameters."""
    target_date = date.today() + timedelta(days=60)
    event = EventInput(
        event_type=EventType.WEDDING,
        event_date=target_date,
        guest_count=250,
        budget_inr=1500000.0,
        city="Jaipur",
        city_tier=CityTier.TIER2,
        dietary_preferences=[DietaryPreference.VEGETARIAN],
        indoor_outdoor=VenueSetting.BOTH,
        theme_notes="Royal Marwar aesthetic with marigold floral decor.",
    )
    assert event.guest_count == 250
    assert event.city == "Jaipur"
    assert event.budget_inr == 1500000.0


def test_event_input_rejects_past_date():
    """Verify EventInput rejects dates in the past."""
    yesterday = date.today() - timedelta(days=1)
    with pytest.raises(ValidationError) as exc_info:
        EventInput(
            event_type=EventType.BIRTHDAY,
            event_date=yesterday,
            guest_count=50,
            budget_inr=50000.0,
            city="Pune",
        )
    assert "Event date cannot be in the past" in str(exc_info.value)


def test_event_input_rejects_invalid_guest_count():
    """Verify EventInput rejects guest counts below 5."""
    future_date = date.today() + timedelta(days=30)
    with pytest.raises(ValidationError):
        EventInput(
            event_type=EventType.COMMUNITY,
            event_date=future_date,
            guest_count=2,  # ge=5
            budget_inr=100000.0,
            city="Bengaluru",
        )
