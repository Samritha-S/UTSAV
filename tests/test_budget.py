"""Unit tests for the deterministic budget allocation engine and feasibility assessor."""

from datetime import date, timedelta

import pytest

from app.models import (
    CityTier,
    DietaryPreference,
    EventInput,
    EventType,
    VenueSetting,
)
from app.planner.budget import (
    allocate_budget,
    calculate_contingency_percentage,
    compute_category_weights,
)


@pytest.mark.parametrize(
    "event_type,budget_inr,guest_count,city_tier,indoor_outdoor",
    [
        # Wedding configurations
        (EventType.WEDDING, 500000.0, 150, CityTier.TIER2, VenueSetting.INDOOR),
        (EventType.WEDDING, 2500000.0, 350, CityTier.METRO, VenueSetting.OUTDOOR),
        (EventType.WEDDING, 1000000.0, 50, CityTier.TIER3, VenueSetting.BOTH),
        # Birthday configurations
        (EventType.BIRTHDAY, 25000.0, 30, CityTier.TIER2, VenueSetting.INDOOR),
        (EventType.BIRTHDAY, 150000.0, 100, CityTier.METRO, VenueSetting.OUTDOOR),
        (EventType.BIRTHDAY, 50000.0, 60, CityTier.TIER3, VenueSetting.BOTH),
        # Community festival configurations
        (EventType.COMMUNITY, 100000.0, 500, CityTier.TIER2, VenueSetting.OUTDOOR),
        (EventType.COMMUNITY, 800000.0, 2000, CityTier.METRO, VenueSetting.BOTH),
        (EventType.COMMUNITY, 50000.0, 200, CityTier.TIER3, VenueSetting.INDOOR),
    ],
)
def test_allocations_sum_exactly_to_budget(
    event_type: EventType,
    budget_inr: float,
    guest_count: int,
    city_tier: CityTier,
    indoor_outdoor: VenueSetting,
):
    """Verify category amounts + contingency sum EXACTLY to budget_inr with zero drift."""
    future_date = date.today() + timedelta(days=90)
    event = EventInput(
        event_type=event_type,
        event_date=future_date,
        guest_count=guest_count,
        budget_inr=budget_inr,
        city="TestCity",
        city_tier=city_tier,
        dietary_preferences=[DietaryPreference.VEGETARIAN],
        indoor_outdoor=indoor_outdoor,
    )

    breakdown = allocate_budget(event)

    category_sum = sum(cat.allocated_inr for cat in breakdown.categories)
    total_calculated = category_sum + breakdown.contingency_inr

    assert total_calculated == pytest.approx(event.budget_inr, abs=1e-4)
    # Check each allocation is a whole rupee amount
    for cat in breakdown.categories:
        assert cat.allocated_inr.is_integer()
    assert breakdown.contingency_inr.is_integer()


def test_contingency_range_and_scaling():
    """Verify contingency is strictly between 5% and 10% and scales with risk."""
    future_date = date.today() + timedelta(days=120)

    # Indoor, small guest count, regular season -> base 5.0%
    base_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=50,
        budget_inr=500000.0,
        city="Nagpur",
        city_tier=CityTier.TIER2,
        indoor_outdoor=VenueSetting.INDOOR,
    )
    base_contingency = calculate_contingency_percentage(base_event)
    assert 5.0 <= base_contingency <= 10.0

    # Outdoor, large crowd (>300), peak wedding season -> scales higher
    peak_date = date(date.today().year + 1, 12, 10)  # December = peak wedding
    high_risk_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=peak_date,
        guest_count=500,
        budget_inr=3000000.0,
        city="Delhi",
        city_tier=CityTier.METRO,
        indoor_outdoor=VenueSetting.OUTDOOR,
    )
    high_contingency = calculate_contingency_percentage(high_risk_event)
    assert high_contingency > base_contingency
    assert 5.0 <= high_contingency <= 10.0


def test_metro_vs_tier3_weight_shifts():
    """Verify venue/infrastructure weight is higher in metro than tier-3, while food is higher in tier-3."""
    future_date = date.today() + timedelta(days=60)

    metro_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=200,
        budget_inr=1500000.0,
        city="Mumbai",
        city_tier=CityTier.METRO,
    )
    tier3_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=200,
        budget_inr=1500000.0,
        city="Udaipur",
        city_tier=CityTier.TIER3,
    )

    metro_weights = compute_category_weights(metro_event)
    tier3_weights = compute_category_weights(tier3_event)

    # In Metros, Venue takes a higher percentage of the pie than in Tier 3
    assert metro_weights["venue_infrastructure"] > tier3_weights["venue_infrastructure"]
    # In Tier 3, Catering takes a higher percentage than in Metro
    assert tier3_weights["catering_hospitality"] > metro_weights["catering_hospitality"]


def test_feasibility_evaluation_verdicts():
    """Verify low-budget returns unrealistic with suggestions, and high-budget returns comfortable."""
    future_date = date.today() + timedelta(days=60)

    # 1. Unrealistic case: 1,000 wedding guests with only ₹1,00,000 (₹100/guest vs ₹1,200 floor)
    unrealistic_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=1000,
        budget_inr=100000.0,
        city="Jaipur",
        city_tier=CityTier.TIER2,
    )
    unrealistic_breakdown = allocate_budget(unrealistic_event)
    feasibility = unrealistic_breakdown.feasibility

    assert feasibility.is_feasible is False
    assert feasibility.verdict == "unrealistic"
    assert len(feasibility.suggestions) >= 2
    # Verify suggestions contain computed numbers (e.g. attendee cap)
    assert any("attendees" in s.lower() or "guests" in s.lower() for s in feasibility.suggestions)

    # 2. Comfortable case: 100 wedding guests with ₹25,00,000 (₹25,000/guest)
    comfortable_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=100,
        budget_inr=2500000.0,
        city="Jaipur",
        city_tier=CityTier.TIER2,
    )
    comfortable_breakdown = allocate_budget(comfortable_event)
    assert comfortable_breakdown.feasibility.is_feasible is True
    assert comfortable_breakdown.feasibility.verdict == "comfortable"
    assert len(comfortable_breakdown.feasibility.suggestions) == 0

    # 3. Tight case: 200 wedding guests with ₹2,60,000 in Tier-2 (₹1,300/guest vs ₹1,200 floor)
    tight_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=200,
        budget_inr=260000.0,
        city="Jaipur",
        city_tier=CityTier.TIER2,
    )
    tight_breakdown = allocate_budget(tight_event)
    assert tight_breakdown.feasibility.is_feasible is True
    assert tight_breakdown.feasibility.verdict == "tight"
    assert len(tight_breakdown.feasibility.suggestions) >= 2


def test_determinism_identical_output():
    """Verify that identical inputs yield 100% deterministic outputs across repeated runs."""
    future_date = date.today() + timedelta(days=45)
    event = EventInput(
        event_type=EventType.BIRTHDAY,
        event_date=future_date,
        guest_count=75,
        budget_inr=85000.0,
        city="Bengaluru",
        city_tier=CityTier.METRO,
        dietary_preferences=[DietaryPreference.JAIN, DietaryPreference.VEGETARIAN],
        indoor_outdoor=VenueSetting.INDOOR,
    )

    run_1 = allocate_budget(event)
    run_2 = allocate_budget(event)

    assert run_1.model_dump() == run_2.model_dump()


def test_edge_cases_min_max_bounds():
    """Verify allocations work seamlessly at the schema limits for budgets and guests."""
    future_date = date.today() + timedelta(days=30)

    # Minimum bounds: Budget ₹5,000, 5 guests
    min_event = EventInput(
        event_type=EventType.BIRTHDAY,
        event_date=future_date,
        guest_count=5,
        budget_inr=5000.0,
        city="Bhopal",
        city_tier=CityTier.TIER3,
    )
    min_breakdown = allocate_budget(min_event)
    assert min_breakdown.total_budget_inr == 5000.0
    cat_sum_min = sum(cat.allocated_inr for cat in min_breakdown.categories)
    assert cat_sum_min + min_breakdown.contingency_inr == 5000.0

    # Maximum bounds: Budget ₹10 Crore (100,000,000), 5,000 guests
    max_event = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=future_date,
        guest_count=5000,
        budget_inr=100000000.0,
        city="Mumbai",
        city_tier=CityTier.METRO,
    )
    max_breakdown = allocate_budget(max_event)
    assert max_breakdown.total_budget_inr == 100000000.0
    cat_sum_max = sum(cat.allocated_inr for cat in max_breakdown.categories)
    assert cat_sum_max + max_breakdown.contingency_inr == 100000000.0
