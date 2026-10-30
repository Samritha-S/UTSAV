"""Unit tests for the vendor vetting and regulatory checklist engine."""

from datetime import date, timedelta
import pytest

from app.models import (
    CityTier,
    DietaryPreference,
    EventInput,
    EventType,
    VenueSetting,
)
from app.planner.checklist import build_checklist
from app.planner.data import EVENT_BASE_ALLOCATIONS


@pytest.fixture
def future_date() -> date:
    return date.today() + timedelta(days=90)


@pytest.mark.parametrize("event_type", [EventType.WEDDING, EventType.BIRTHDAY, EventType.COMMUNITY])
def test_all_budget_categories_covered_with_exact_key_matching(event_type: EventType, future_date: date):
    """Verify that every single budget category key is covered 1-to-1 in the checklist."""
    event = EventInput(
        event_type=event_type,
        event_date=future_date,
        guest_count=150,
        budget_inr=500000,
        city="Nagpur",
        city_tier=CityTier.TIER2,
    )

    checklist = build_checklist(event)

    budget_keys = list(EVENT_BASE_ALLOCATIONS[event_type.value].keys())
    checklist_keys = [cat.category_name for cat in checklist.categories]

    assert checklist_keys == budget_keys
    # Every category must have at least one checklist item
    for cat in checklist.categories:
        assert len(cat.items) > 0


def test_unique_item_ids_across_checklist(future_date: date):
    """Verify all checklist item IDs are unique within an event plan."""
    event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=350,  # Triggers large gathering items
        budget_inr=2500000,
        city="Delhi",
        city_tier=CityTier.METRO,
        indoor_outdoor=VenueSetting.OUTDOOR,  # Triggers outdoor items
        dietary_preferences=[DietaryPreference.JAIN, DietaryPreference.VEGAN],  # Triggers dietary items
    )

    checklist = build_checklist(event)

    all_ids = []
    for cat in checklist.categories:
        for item in cat.items:
            all_ids.append(item.item_id)

    assert len(all_ids) == len(set(all_ids)), f"Duplicate checklist item IDs detected: {all_ids}"


def test_india_specific_guidance_present_for_event_types(future_date: date):
    """Verify India-specific regulatory and cultural diligence items appear for appropriate events."""
    # 1. Wedding: Muhurtham with priest BEFORE venue agreement
    wed_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=200,
        budget_inr=1500000,
        city="Jaipur",
    )
    wed_chk = build_checklist(wed_event)
    wed_text = " ".join(item.text for cat in wed_chk.categories for item in cat.items)
    assert "muhurtham" in wed_text.lower()
    assert "fssai" in wed_text.lower()

    # 2. Community: Loudspeaker & police NOC, Residents' Association approval
    comm_event = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=future_date,
        guest_count=500,
        budget_inr=300000,
        city="Bengaluru",
    )
    comm_chk = build_checklist(comm_event)
    comm_text = " ".join(item.text for cat in comm_chk.categories for item in cat.items)
    assert "loudspeaker" in comm_text.lower() or "noc" in comm_text.lower()
    assert "residents' association" in comm_text.lower() or "rwa" in comm_text.lower()


def test_outdoor_and_dietary_adaptations(future_date: date):
    """Verify outdoor weather items and dietary guidelines (Jain rootless prep) adapt dynamically."""
    # Indoor without Jain
    indoor_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=100,
        budget_inr=1000000,
        city="Lucknow",
        indoor_outdoor=VenueSetting.INDOOR,
        dietary_preferences=[DietaryPreference.VEGETARIAN],
    )
    indoor_chk = build_checklist(indoor_event)
    indoor_item_ids = {item.item_id for cat in indoor_chk.categories for item in cat.items}
    assert "adapt_outdoor_rain_plan" not in indoor_item_ids
    assert "adapt_jain_wedding" not in indoor_item_ids

    # Outdoor with Jain
    outdoor_jain_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=future_date,
        guest_count=100,
        budget_inr=1000000,
        city="Lucknow",
        indoor_outdoor=VenueSetting.OUTDOOR,
        dietary_preferences=[DietaryPreference.JAIN],
    )
    outdoor_jain_chk = build_checklist(outdoor_jain_event)
    outdoor_jain_item_ids = {item.item_id for cat in outdoor_jain_chk.categories for item in cat.items}
    assert "adapt_outdoor_rain_plan" in outdoor_jain_item_ids
    assert "adapt_jain_wedding" in outdoor_jain_item_ids


def test_large_gathering_adaptation(future_date: date):
    """Verify events above 300 guests receive dedicated crowd marshaling and emergency medical checkpoints."""
    small_event = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=future_date,
        guest_count=150,
        budget_inr=100000,
        city="Pune",
    )
    small_chk = build_checklist(small_event)
    small_text = " ".join(item.text for cat in small_chk.categories for item in cat.items)
    assert "300+ attendees" not in small_text

    large_event = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=future_date,
        guest_count=500,
        budget_inr=300000,
        city="Pune",
    )
    large_chk = build_checklist(large_event)
    large_text = " ".join(item.text for cat in large_chk.categories for item in cat.items)
    assert "crowd marshals" in large_text.lower() or "300+ attendees" in large_text


def test_checklist_determinism(future_date: date):
    """Verify identical event inputs produce 100% identical checklists."""
    event = EventInput(
        event_type=EventType.BIRTHDAY,
        event_date=future_date,
        guest_count=50,
        budget_inr=40000,
        city="Chandigarh",
        indoor_outdoor=VenueSetting.BOTH,
        dietary_preferences=[DietaryPreference.VEGETARIAN, DietaryPreference.JAIN],
    )

    run_1 = build_checklist(event)
    run_2 = build_checklist(event)

    assert run_1.model_dump() == run_2.model_dump()
