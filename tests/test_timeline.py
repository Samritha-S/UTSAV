"""Unit tests for the backwards-scheduling timeline engine."""

from datetime import date, timedelta
import pytest

from app.models import (
    CityTier,
    DietaryPreference,
    EventInput,
    EventType,
    TaskStatus,
    VenueSetting,
)
from app.planner.timeline import build_timeline


@pytest.fixture
def fixed_today() -> date:
    """Fixed evaluation anchor date for deterministic tests."""
    return date(2026, 11, 1)


@pytest.mark.parametrize("event_type", [EventType.WEDDING, EventType.BIRTHDAY, EventType.COMMUNITY])
def test_all_event_types_produce_non_empty_timeline(event_type: EventType, fixed_today: date):
    """Verify all 3 event types generate a valid, non-empty backwards-scheduled plan."""
    event_date = fixed_today + timedelta(days=120)
    event = EventInput(
        event_type=event_type,
        event_date=event_date,
        guest_count=150,
        budget_inr=500000,
        city="Pune",
        city_tier=CityTier.TIER2,
    )

    schedule = build_timeline(event, today=fixed_today)

    assert len(schedule.tasks) > 0
    assert schedule.days_remaining == 120
    assert schedule.weeks_remaining == round(120 / 7.0, 1)
    assert schedule.most_urgent_action is not None


def test_deadlines_computed_correctly_from_fixed_today(fixed_today: date):
    """Verify task deadlines match event_date minus lead time days."""
    event_date = fixed_today + timedelta(days=200)
    event = EventInput(
        event_type=EventType.WEDDING,
        event_date=event_date,
        guest_count=200,
        budget_inr=1500000,
        city="Jaipur",
        city_tier=CityTier.TIER2,
    )

    schedule = build_timeline(event, today=fixed_today)

    # For independent tasks like venue (lead_time = 180), deadline = event_date - 180
    venue_task = next(t for t in schedule.tasks if t.task_id == "wed_venue")
    expected_venue_deadline = event_date - timedelta(days=180)
    assert venue_task.target_date == expected_venue_deadline


def test_status_transitions_and_alternative_advice(fixed_today: date):
    """Verify status transitions (on_track, due_soon, overdue_compressed) and advice presence."""
    # Event is 50 days away
    # A task with lead_time=100 has deadline = event_date - 100 = fixed_today - 50 -> overdue_compressed
    # A task with lead_time=45 has deadline = event_date - 45 = fixed_today + 5 -> due_soon
    # A task with lead_time=10 has deadline = event_date - 10 = fixed_today + 40 -> on_track
    event_date = fixed_today + timedelta(days=50)
    event = EventInput(
        event_type=EventType.WEDDING,
        event_date=event_date,
        guest_count=100,
        budget_inr=800000,
        city="Udaipur",
    )

    schedule = build_timeline(event, today=fixed_today)

    statuses = {t.status for t in schedule.tasks}
    assert TaskStatus.OVERDUE_COMPRESSED in statuses

    # All overdue/compressed tasks MUST carry specific, non-empty alternative advice
    for task in schedule.tasks:
        if task.status == TaskStatus.OVERDUE_COMPRESSED:
            assert task.advice is not None
            assert len(task.advice.strip()) > 10


def test_crunch_plan_threshold_seven_days(fixed_today: date):
    """Verify that an event <= 7 days away collapses into a crunch plan of critical tasks."""
    # 5 days away -> Crunch plan active
    crunch_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=fixed_today + timedelta(days=5),
        guest_count=80,
        budget_inr=600000,
        city="Delhi",
    )
    crunch_sched = build_timeline(crunch_event, today=fixed_today)
    assert crunch_sched.is_crunch_plan is True
    assert crunch_sched.crunch_summary is not None
    assert "Crunch planning mode active" in crunch_sched.crunch_summary
    for task in crunch_sched.tasks:
        assert task.priority.value == "critical"

    # 10 days away -> Regular plan (above 7-day crunch threshold)
    normal_event = EventInput(
        event_type=EventType.WEDDING,
        event_date=fixed_today + timedelta(days=10),
        guest_count=80,
        budget_inr=600000,
        city="Delhi",
    )
    normal_sched = build_timeline(normal_event, today=fixed_today)
    assert normal_sched.is_crunch_plan is False
    assert normal_sched.crunch_summary is None


def test_today_and_tomorrow_edge_cases(fixed_today: date):
    """Verify events scheduled today or tomorrow handle gracefully without crashes."""
    # Today
    event_today = EventInput(
        event_type=EventType.BIRTHDAY,
        event_date=fixed_today,
        guest_count=20,
        budget_inr=20000,
        city="Bengaluru",
    )
    sched_today = build_timeline(event_today, today=fixed_today)
    assert sched_today.days_remaining == 0
    assert sched_today.is_crunch_plan is True

    # Tomorrow
    event_tomorrow = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=fixed_today + timedelta(days=1),
        guest_count=100,
        budget_inr=50000,
        city="Chennai",
    )
    sched_tomorrow = build_timeline(event_tomorrow, today=fixed_today)
    assert sched_tomorrow.days_remaining == 1
    assert sched_tomorrow.is_crunch_plan is True


def test_far_future_event_case(fixed_today: date):
    """Verify events > 12 months in the future produce mostly on_track tasks without error."""
    event_date = fixed_today + timedelta(days=450)
    event = EventInput(
        event_type=EventType.WEDDING,
        event_date=event_date,
        guest_count=300,
        budget_inr=3000000,
        city="Mumbai",
    )

    schedule = build_timeline(event, today=fixed_today)

    assert schedule.days_remaining == 450
    assert schedule.is_crunch_plan is False
    assert schedule.status_counts[TaskStatus.ON_TRACK.value] == len(schedule.tasks)


def test_dependencies_ordered_correctly(fixed_today: date):
    """Verify no dependent task is scheduled before its prerequisite's deadline."""
    event_date = fixed_today + timedelta(days=150)
    event = EventInput(
        event_type=EventType.WEDDING,
        event_date=event_date,
        guest_count=250,
        budget_inr=2000000,
        city="Kolkata",
    )

    schedule = build_timeline(event, today=fixed_today)
    task_map = {t.task_id: t for t in schedule.tasks}

    for task in schedule.tasks:
        for dep_id in task.dependencies:
            if dep_id in task_map:
                dep_task = task_map[dep_id]
                # Prerequisite deadline must be <= dependent task deadline
                assert dep_task.target_date <= task.target_date


def test_timeline_determinism(fixed_today: date):
    """Verify repeated calls with identical parameters return identical schedules."""
    event_date = fixed_today + timedelta(days=90)
    event = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=event_date,
        guest_count=400,
        budget_inr=250000,
        city="Hyderabad",
    )

    run_1 = build_timeline(event, today=fixed_today)
    run_2 = build_timeline(event, today=fixed_today)

    assert run_1.model_dump() == run_2.model_dump()
