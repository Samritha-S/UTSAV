"""Integration and security tests for Utsav Planner API endpoints."""

import json
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app, get_today
from app.models import ActivityIdea, CreativeIdeas, DecorIdea, MenuSection, ThemeIdea
from app.planner.data import CATEGORY_LABELS
from app.security import (
    MAX_PAYLOAD_SIZE,
    SlidingWindowRateLimiter,
    ai_rate_limiter,
    general_rate_limiter,
)


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Ensure in-memory rate limiters are cleared before and after each test."""
    ai_rate_limiter.clear()
    general_rate_limiter.clear()
    yield
    ai_rate_limiter.clear()
    general_rate_limiter.clear()


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def fixed_today() -> date:
    """Fixed reference date for deterministic testing."""
    return date(2026, 11, 1)


@pytest.fixture
def mock_ideas() -> CreativeIdeas:
    """Standard mocked creative ideas payload."""
    return CreativeIdeas(
        themes=[
            ThemeIdea(
                name="Royal Marwar",
                description="Regal palace aesthetic with heritage arches.",
                decor_elements=["Marigold flowers", "Brass lamps"],
                dress_code="Traditional royal ethnic wear",
            )
        ],
        menu_suggestions=[
            MenuSection(
                meal_type="High Tea",
                dishes=["Masala Chai", "Paneer Pakora"],
                dietary_tags=["Vegetarian"],
            )
        ],
        activities=[
            ActivityIdea(
                title="Live Sitar Recital",
                description="Classical ragas performed by local musicians.",
                suitable_for="All Generations",
            )
        ],
        decor_ideas=[
            DecorIdea(
                area="Mandap",
                concept="Marigold floral canopy",
                suggested_materials=["Marigolds", "Brass urli"],
            )
        ],
        budget_fit_note="Carefully balanced with budget.",
        source="ai",
    )


# ---------------------------------------------------------------------
# 1. Category Slug Consistency Across All Engines
# ---------------------------------------------------------------------
def test_category_slug_consistency_across_engines(client, fixed_today, mock_ideas):
    """Verify that every category slug in timeline tasks and checklist items maps to a valid budget category slug."""
    app.dependency_overrides[get_today] = lambda: fixed_today
    try:
        with patch("app.main.generate_ideas", return_value=mock_ideas):
            for event_type in ["wedding", "birthday", "community"]:
                labels = CATEGORY_LABELS[event_type]
                budget_inr = (
                    1500000
                    if event_type == "wedding"
                    else (50000 if event_type == "birthday" else 100000)
                )
                payload = {
                    "event_type": event_type,
                    "event_date": (fixed_today + timedelta(days=90)).isoformat(),
                    "guest_count": 100,
                    "budget_inr": budget_inr,
                    "city": "Jaipur",
                    "city_tier": "tier2",
                    "venue_setting": "indoor",
                    "dietary_preferences": ["vegetarian"],
                }
                res = client.post("/api/plan", json=payload)
                assert res.status_code == 200, f"Failed for {event_type}: {res.text}"
                data = res.json()

                budget_slugs = {item["category_slug"] for item in data["budget"]["categories"]}
                checklist_slugs = {cat["category_slug"] for cat in data["checklist"]["categories"]}
                timeline_task_slugs = {task["category"] for task in data["timeline"]["tasks"]}

                # Every valid slug in data.py must match budget breakdown
                assert budget_slugs == set(labels.keys())
                # Every checklist category must be a valid budget slug
                assert checklist_slugs.issubset(budget_slugs)
                # Every timeline task category must be a valid budget slug
                assert timeline_task_slugs.issubset(budget_slugs)
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------
# 2. Plan API: All Event Types, Structure, and Totals
# ---------------------------------------------------------------------
@pytest.mark.parametrize(
    "event_type,budget_val,guests",
    [
        ("wedding", 2000000, 250),
        ("birthday", 75000, 45),
        ("community", 150000, 400),
    ],
)
def test_plan_api_all_event_types(client, fixed_today, mock_ideas, event_type, budget_val, guests):
    """Verify /api/plan returns all sections and totals match input budget exactly."""
    app.dependency_overrides[get_today] = lambda: fixed_today
    try:
        with patch("app.main.generate_ideas", return_value=mock_ideas):
            payload = {
                "event_type": event_type,
                "event_date": (fixed_today + timedelta(days=60)).isoformat(),
                "guest_count": guests,
                "budget_inr": budget_val,
                "city": "Bengaluru",
                "city_tier": "metro",
                "venue_setting": "indoor",
                "dietary_preferences": ["vegetarian"],
            }
            res = client.post("/api/plan", json=payload)
            assert res.status_code == 200
            data = res.json()

            # Verify all required sections exist
            assert "event_summary" in data
            assert "budget" in data
            assert "timeline" in data
            assert "checklist" in data
            assert "ideas" in data
            assert "generated_at" in data

            # Verify budget total equals input
            categories = data["budget"]["categories"]
            contingency = data["budget"]["contingency_inr"]
            allocated_sum = sum(item["allocated_inr"] for item in categories)
            assert allocated_sum + contingency == budget_val
            assert data["budget"]["total_budget_inr"] == budget_val
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------
# 3. Refine API: Returns Only Ideas & Enforces Length Cap
# ---------------------------------------------------------------------
def test_refine_api_returns_ideas_and_enforces_limits(client, fixed_today, mock_ideas):
    """Verify /api/refine returns only ideas, and rejects prompt exceeding 200 characters."""
    valid_payload = {
        "event_input": {
            "event_type": "wedding",
            "event_date": (fixed_today + timedelta(days=90)).isoformat(),
            "guest_count": 150,
            "budget_inr": 1200000,
            "city": "Delhi",
            "city_tier": "metro",
            "venue_setting": "both",
            "dietary_preferences": ["vegetarian"],
        },
        "refinement_prompt": "Add more traditional floral decor and Rajasthani folk music.",
    }

    with patch("app.main.generate_ideas", return_value=mock_ideas) as mock_gen:
        res = client.post("/api/refine", json=valid_payload)
        assert res.status_code == 200
        data = res.json()
        # Returns only ideas (not a full PlanResponse)
        assert "themes" in data
        assert "menu_suggestions" in data
        assert "budget" not in data
        assert "timeline" not in data
        assert mock_gen.call_count == 1

    # Now verify prompt > 200 chars is rejected with 422
    invalid_payload = {
        "event_input": valid_payload["event_input"],
        "refinement_prompt": "A" * 201,
    }
    res_invalid = client.post("/api/refine", json=invalid_payload)
    assert res_invalid.status_code == 422
    err_json = res_invalid.json()
    assert err_json["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------
# 4. Rate Limiting: 429, Retry-After, IP Isolation, and Stale Eviction
# ---------------------------------------------------------------------
def test_rate_limiting_enforcement_and_retry_after(client):
    """Verify (N+1)th request returns 429 with Retry-After header and standard error schema."""
    # Custom rate limiter with 3 requests per 60s for isolated test
    test_limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=60.0)

    # First 3 requests allowed
    for _ in range(3):
        allowed, retry_after = test_limiter.check_rate_limit("1.2.3.4")
        assert allowed is True
        assert retry_after == 0

    # 4th request rate-limited
    allowed, retry_after = test_limiter.check_rate_limit("1.2.3.4")
    assert allowed is False
    assert retry_after > 0

    # Separate IP is isolated and allowed
    allowed_other, _ = test_limiter.check_rate_limit("5.6.7.8")
    assert allowed_other is True


def test_rate_limiting_stale_eviction():
    """Verify stale records are successfully evicted after window expires."""
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10.0)
    limiter.check_rate_limit("10.0.0.1", now=100.0)
    limiter.check_rate_limit("10.0.0.2", now=105.0)
    assert len(limiter) == 2

    # At now=112.0: 10.0.0.1 is older than 10s cutoff (112 - 10 = 102), so it is evicted
    evicted_count = limiter.evict_stale(now=112.0)
    assert evicted_count == 1
    assert len(limiter) == 1

    # At now=120.0: remaining IP is also stale
    evicted_count_2 = limiter.evict_stale(now=120.0)
    assert evicted_count_2 == 1
    assert len(limiter) == 0


def test_api_rate_limiter_middleware_429(client, fixed_today, mock_ideas):
    """Verify endpoint triggers HTTP 429 once ai_rate_limiter limit is reached."""
    app.dependency_overrides[get_today] = lambda: fixed_today
    try:
        with patch("app.main.generate_ideas", return_value=mock_ideas):
            payload = {
                "event_type": "birthday",
                "event_date": (fixed_today + timedelta(days=30)).isoformat(),
                "guest_count": 30,
                "budget_inr": 40000,
                "city": "Mumbai",
                "city_tier": "metro",
                "venue_setting": "indoor",
            }
            # Limit is 10 for AI routes
            for _ in range(10):
                res = client.post("/api/plan", json=payload)
                assert res.status_code == 200

            # 11th request must fail with 429
            res_limited = client.post("/api/plan", json=payload)
            assert res_limited.status_code == 429
            assert "Retry-After" in res_limited.headers
            err = res_limited.json()
            assert err["error"]["code"] == "RATE_LIMIT_EXCEEDED"
            assert "Too many requests" in err["error"]["message"]
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------
# 5. Payload Size (> 64 KB) and Content-Type (415)
# ---------------------------------------------------------------------
def test_payload_size_limit_exceeded_returns_413(client):
    """Verify request payload larger than 64 KB returns HTTP 413."""
    oversized_data = {"text": "A" * (MAX_PAYLOAD_SIZE + 1024)}
    res = client.post(
        "/api/plan",
        content=json.dumps(oversized_data),
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 413
    data = res.json()
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_content_type_enforcement_returns_415(client):
    """Verify POST /api/* with non-JSON Content-Type returns HTTP 415."""
    res = client.post(
        "/api/plan",
        content="plain text content",
        headers={"Content-Type": "text/plain"},
    )
    assert res.status_code == 415
    data = res.json()
    assert data["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


# ---------------------------------------------------------------------
# 6. Standardized Error Formats (422, 404, 500)
# ---------------------------------------------------------------------
def test_validation_error_format_422(client):
    """Verify 422 errors follow standardized JSON error schema without echoing input."""
    res = client.post("/api/plan", json={"event_type": "invalid_type"})
    assert res.status_code == 422
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "Validation failed:" in data["error"]["message"]


def test_not_found_error_format_404(client):
    """Verify 404 for non-existent API route returns standard error schema."""
    res = client.get("/api/nonexistent_route")
    assert res.status_code == 404
    data = res.json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_internal_server_error_format_500(fixed_today):
    """Verify unhandled server errors return sanitized 500 without leaking stack trace."""
    safe_client = TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides[get_today] = lambda: fixed_today
    try:
        with patch(
            "app.main.allocate_budget",
            side_effect=Exception("Database connection secret_db_pw failed"),
        ):
            payload = {
                "event_type": "wedding",
                "event_date": (fixed_today + timedelta(days=90)).isoformat(),
                "guest_count": 100,
                "budget_inr": 1000000,
                "city": "Delhi",
                "city_tier": "metro",
                "venue_setting": "indoor",
            }
            res = safe_client.post("/api/plan", json=payload)
            assert res.status_code == 500
            data = res.json()
            assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
            assert "secret_db_pw" not in res.text
            assert "Traceback" not in res.text
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------
# 7. Security Headers and Cache-Control
# ---------------------------------------------------------------------
def test_security_headers_and_cache_control(client):
    """Verify all responses include required security headers and API routes have Cache-Control: no-store."""
    res = client.get("/api/health")
    assert res.status_code == 200

    # Headers verification
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers["Permissions-Policy"]
    assert "default-src 'self'" in res.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in res.headers["Content-Security-Policy"]

    # API routes must disable caching
    assert res.headers["Cache-Control"] == "no-store"


# ---------------------------------------------------------------------
# 8. Deterministic Output with Date Dependency Override
# ---------------------------------------------------------------------
def test_date_dependency_override_determinism(client, mock_ideas):
    """Verify overriding get_today produces identical, reproducible timeline deadlines."""
    date_a = date(2026, 11, 1)
    app.dependency_overrides[get_today] = lambda: date_a

    try:
        with patch("app.main.generate_ideas", return_value=mock_ideas):
            payload = {
                "event_type": "wedding",
                "event_date": "2027-02-01",
                "guest_count": 200,
                "budget_inr": 1500000,
                "city": "Udaipur",
                "city_tier": "tier2",
                "venue_setting": "indoor",
            }
            res1 = client.post("/api/plan", json=payload)
            res2 = client.post("/api/plan", json=payload)

            assert res1.status_code == 200
            assert res2.status_code == 200

            tasks1 = res1.json()["timeline"]["tasks"]
            tasks2 = res2.json()["timeline"]["tasks"]
            assert tasks1 == tasks2
    finally:
        app.dependency_overrides.clear()


def test_get_today_returns_kolkata_date_and_is_overridable(client, mock_ideas):
    """Verify get_today returns a date in Asia/Kolkata timezone and respects dependency_overrides."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    today_val = get_today()
    assert isinstance(today_val, date)
    expected_kolkata = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    assert today_val == expected_kolkata

    # Verify override
    overridden_date = date(2028, 5, 15)
    app.dependency_overrides[get_today] = lambda: overridden_date
    try:
        with patch("app.main.generate_ideas", return_value=mock_ideas):
            payload = {
                "event_type": "birthday",
                "event_date": "2028-06-15",
                "guest_count": 30,
                "budget_inr": 50000,
                "city": "Pune",
                "city_tier": "tier2",
                "venue_setting": "indoor",
            }
            res = client.post("/api/plan", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["timeline"]["days_remaining"] == (date(2028, 6, 15) - overridden_date).days
    finally:
        app.dependency_overrides.clear()
