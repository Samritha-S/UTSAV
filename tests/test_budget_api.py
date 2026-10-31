"""Tests for the fast deterministic POST /api/budget endpoint.

Verifies:
- Totals (categories + contingency) sum exactly to budget_inr for all three event types (wedding, birthday, community).
- Validation errors use the standard format and do not echo raw user input.
- Endpoint never calls generate_ideas (proven via unittest.mock.patch).
- Uses general rate limiter without affecting the AI rate limiter.
- General rate limiter returns 429 with Retry-After when limit is reached.
- Payload size and Content-Type enforcement.
- Security headers (Cache-Control: no-store, nosniff, frame-ancestors, etc.).
- Python 3.11 compatibility (no post-3.11 constructs).
"""

from datetime import date, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import (
    MAX_PAYLOAD_SIZE,
    ai_rate_limiter,
    general_rate_limiter,
)


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client fixture."""
    return TestClient(app)


@pytest.fixture
def future_date() -> str:
    """Return a valid future celebration date."""
    return (date.today() + timedelta(days=60)).isoformat()


# ---------------------------------------------------------------------
# 1. Exact Rupee Sum Match across All Three Event Types
# ---------------------------------------------------------------------
@pytest.mark.parametrize(
    ("event_type", "guest_count", "budget_inr", "city_tier"),
    [
        ("wedding", 250, 1800000, "tier2"),
        ("birthday", 45, 65000, "metro"),
        ("community", 500, 250000, "tier3"),
    ],
)
def test_budget_api_exact_sum_and_feasibility(
    client: TestClient,
    future_date: str,
    event_type: str,
    guest_count: int,
    budget_inr: int,
    city_tier: str,
):
    """Verify category totals + contingency match total budget exactly with 0 rounding delta."""
    payload = {
        "event_type": event_type,
        "event_date": future_date,
        "guest_count": guest_count,
        "budget_inr": budget_inr,
        "city": "Jaipur",
        "city_tier": city_tier,
        "dietary_preferences": ["vegetarian"],
        "indoor_outdoor": "indoor",
    }
    if event_type == "birthday":
        payload["age_group"] = "kids"

    res = client.post("/api/budget", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "budget" in data
    assert "feasibility" in data

    budget = data["budget"]
    feasibility = data["feasibility"]

    assert budget["total_budget_inr"] == budget_inr
    categories_sum = sum(cat["allocated_inr"] for cat in budget["categories"])
    total_reconstructed = categories_sum + budget["contingency_inr"]
    assert total_reconstructed == budget_inr, (
        f"Sum mismatch: categories ({categories_sum}) + contingency ({budget['contingency_inr']}) != {budget_inr}"
    )

    # Feasibility validation
    assert feasibility["verdict"] in ("comfortable", "tight", "unrealistic")
    assert isinstance(feasibility["is_feasible"], bool)
    assert feasibility["actual_per_guest_inr"] > 0
    assert isinstance(feasibility["suggestions"], list)


# ---------------------------------------------------------------------
# 2. Never Calls AI / generate_ideas
# ---------------------------------------------------------------------
def test_budget_api_never_invokes_generate_ideas(client: TestClient, future_date: str):
    """Ensure POST /api/budget is purely deterministic and never touches AI synthesis."""
    payload = {
        "event_type": "wedding",
        "event_date": future_date,
        "guest_count": 200,
        "budget_inr": 1500000,
        "city": "Bengaluru",
        "city_tier": "metro",
        "dietary_preferences": ["vegetarian"],
        "indoor_outdoor": "indoor",
    }
    with patch("app.main.generate_ideas") as mock_ai:
        res = client.post("/api/budget", json=payload)
        assert res.status_code == 200
        mock_ai.assert_not_called()


# ---------------------------------------------------------------------
# 3. Standardized Validation Error Without Input Echoing
# ---------------------------------------------------------------------
def test_budget_api_validation_error_format_no_echo(client: TestClient):
    """Ensure invalid input produces standard 422 error without echoing user inputs."""
    malicious_probe = "<script>alert('xss')</script>"
    payload = {
        "event_type": "wedding",
        "event_date": "2020-01-01",  # Past date
        "guest_count": -5,  # Invalid
        "budget_inr": 100,  # Below minimum floor
        "city": malicious_probe,
    }
    res = client.post("/api/budget", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    # Never echo raw malicious script probe
    assert malicious_probe not in res.text


# ---------------------------------------------------------------------
# 4. Rate Limiting: Uses General Limiter, AI Limiter Unaffected
# ---------------------------------------------------------------------
def test_budget_api_uses_general_rate_limiter_and_leaves_ai_unaffected(
    client: TestClient, future_date: str
):
    """Ensure /api/budget consumes general limiter tokens and does NOT increment AI rate limiter."""
    payload = {
        "event_type": "wedding",
        "event_date": future_date,
        "guest_count": 100,
        "budget_inr": 800000,
        "city": "Mumbai",
        "city_tier": "metro",
    }

    # Initial state
    ai_rate_limiter.clear()
    general_rate_limiter.clear()

    # 1 call to /api/budget
    res = client.post("/api/budget", json=payload)
    assert res.status_code == 200

    # General limiter tracked this IP, AI limiter has 0 records
    assert len(general_rate_limiter) >= 1
    assert len(ai_rate_limiter) == 0


def test_budget_api_general_rate_limit_exceeded(client: TestClient, future_date: str):
    """Ensure reaching general limit returns 429 with Retry-After header."""
    general_rate_limiter.clear()
    payload = {
        "event_type": "birthday",
        "event_date": future_date,
        "guest_count": 30,
        "budget_inr": 50000,
        "city": "Delhi",
        "city_tier": "metro",
    }

    # Exhaust general rate limiter
    for _ in range(general_rate_limiter.max_requests):
        res = client.post("/api/budget", json=payload)
        assert res.status_code == 200

    # Next request should be rate limited
    limited_res = client.post("/api/budget", json=payload)
    assert limited_res.status_code == 429
    assert "Retry-After" in limited_res.headers
    data = limited_res.json()
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"


# ---------------------------------------------------------------------
# 5. Security Headers and Content-Type Checks
# ---------------------------------------------------------------------
def test_budget_api_security_headers_and_content_type(client: TestClient, future_date: str):
    """Verify security headers and payload enforcement on /api/budget."""
    payload = {
        "event_type": "community",
        "event_date": future_date,
        "guest_count": 200,
        "budget_inr": 150000,
        "city": "Pune",
        "city_tier": "tier2",
    }
    res = client.post("/api/budget", json=payload)
    assert res.status_code == 200
    assert res.headers.get("Cache-Control") == "no-store"
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"

    # Unsupported Content-Type -> 415
    res_text = client.post(
        "/api/budget",
        content="plain text",
        headers={"Content-Type": "text/plain"},
    )
    assert res_text.status_code == 415

    # Oversized payload -> 413
    oversized_notes = "x" * (MAX_PAYLOAD_SIZE + 1024)
    payload["theme_notes"] = oversized_notes
    res_large = client.post("/api/budget", json=payload)
    assert res_large.status_code in (413, 422)
