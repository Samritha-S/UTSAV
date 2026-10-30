"""Backwards-scheduling timeline engine for celebratory Indian events.

This module is pure: all functions accept an explicit `today: date` parameter,
making scheduling math 100% deterministic and unit-testable without clock mocking.
"""

from collections import deque
from datetime import date, timedelta
from typing import Dict, List, Optional, Set

from app.models import (
    EventInput,
    TaskPriority,
    TaskStatus,
    TimelineSchedule,
    TimelineTask,
)
from app.planner.data import (
    CRUNCH_THRESHOLD_DAYS,
    DUE_SOON_DAYS_THRESHOLD,
    TIMELINE_TASK_TEMPLATES,
)


def compute_topological_ranks(templates: List[Dict]) -> Dict[str, int]:
    """Compute dependency depth rank for stable chronological sequencing."""
    ranks: Dict[str, int] = {t["id"]: 0 for t in templates}
    in_degrees: Dict[str, int] = {t["id"]: len(t.get("dependencies", [])) for t in templates}
    adjacency: Dict[str, List[str]] = {t["id"]: [] for t in templates}

    for t in templates:
        for dep in t.get("dependencies", []):
            if dep in adjacency:
                adjacency[dep].append(t["id"])

    queue = deque([task_id for task_id, deg in in_degrees.items() if deg == 0])

    while queue:
        current = queue.popleft()
        current_rank = ranks[current]
        for neighbor in adjacency.get(current, []):
            ranks[neighbor] = max(ranks[neighbor], current_rank + 1)
            in_degrees[neighbor] -= 1
            if in_degrees[neighbor] == 0:
                queue.append(neighbor)

    return ranks


def build_timeline(event: EventInput, today: date) -> TimelineSchedule:
    """Construct backwards-scheduled milestone tasks from the event date.

    Args:
        event: Validated event input parameters.
        today: Explicit anchor date for evaluation (avoids system clock dependence).

    Returns:
        TimelineSchedule containing chronologically sorted tasks, urgency metrics,
        and crunch plan overrides when the event is imminently approaching.
    """
    days_remaining = max(0, (event.event_date - today).days)
    weeks_remaining = round(days_remaining / 7.0, 1)

    raw_templates = TIMELINE_TASK_TEMPLATES.get(event.event_type.value, [])
    topological_ranks = compute_topological_ranks(raw_templates)

    # Crunch plan activation when event is within the crunch threshold (<= 7 days)
    is_crunch = days_remaining <= CRUNCH_THRESHOLD_DAYS
    if is_crunch:
        active_templates = [t for t in raw_templates if t.get("priority") == "critical"]
        if not active_templates:
            active_templates = raw_templates
    else:
        active_templates = raw_templates

    # First pass: calculate target dates based on lead times
    task_deadlines: Dict[str, date] = {}
    for t in active_templates:
        lead_time = t.get("lead_time_days", 0)
        task_deadlines[t["id"]] = event.event_date - timedelta(days=lead_time)

    # Second pass: ensure dependencies are respected (no task scheduled before prerequisite)
    for _ in range(len(active_templates)):
        for t in active_templates:
            task_id = t["id"]
            deps = t.get("dependencies", [])
            for dep_id in deps:
                if dep_id in task_deadlines:
                    # Prerequisite deadline must not be after dependent task deadline
                    if task_deadlines[task_id] < task_deadlines[dep_id]:
                        task_deadlines[task_id] = task_deadlines[dep_id]

    tasks: List[TimelineTask] = []
    status_counts: Dict[str, int] = {
        TaskStatus.ON_TRACK.value: 0,
        TaskStatus.DUE_SOON.value: 0,
        TaskStatus.OVERDUE_COMPRESSED.value: 0,
    }

    for t in active_templates:
        task_id = t["id"]
        deadline = task_deadlines[task_id]
        days_until_deadline = (deadline - today).days

        if days_until_deadline < 0:
            status = TaskStatus.OVERDUE_COMPRESSED
            advice = t.get("alternative_advice", "Expedite vendor selection immediately.")
        elif days_until_deadline <= DUE_SOON_DAYS_THRESHOLD:
            status = TaskStatus.DUE_SOON
            advice = None
        else:
            status = TaskStatus.ON_TRACK
            advice = None

        status_counts[status.value] += 1

        tasks.append(
            TimelineTask(
                task_id=task_id,
                title=t["title"],
                category=t["category"],
                target_date=deadline,
                lead_time_days=t.get("lead_time_days", 0),
                priority=TaskPriority(t.get("priority", "important")),
                dependencies=t.get("dependencies", []),
                status=status,
                advice=advice,
            )
        )

    # Sort tasks primarily by deadline, secondarily by topological dependency rank, and then task ID
    tasks.sort(key=lambda item: (item.target_date, topological_ranks.get(item.task_id, 0), item.task_id))

    # Identify single most urgent next action
    most_urgent: Optional[str] = None
    # Prioritize first overdue or due_soon task, fallback to the earliest task
    for task in tasks:
        if task.status in (TaskStatus.OVERDUE_COMPRESSED, TaskStatus.DUE_SOON):
            most_urgent = f"{task.title} (Target: {task.target_date.isoformat()})"
            break
    if not most_urgent and tasks:
        most_urgent = f"{tasks[0].title} (Target: {tasks[0].target_date.isoformat()})"

    crunch_summary: Optional[str] = None
    if is_crunch:
        crunch_summary = (
            f"Crunch planning mode active: Event is in {days_remaining} day{'s' if days_remaining != 1 else ''}. "
            f"Showing {len(tasks)} essential critical tasks strictly ordered by execution priority."
        )

    return TimelineSchedule(
        event_date=event.event_date,
        days_remaining=days_remaining,
        weeks_remaining=weeks_remaining,
        is_crunch_plan=is_crunch,
        crunch_summary=crunch_summary,
        status_counts=status_counts,
        most_urgent_action=most_urgent,
        tasks=tasks,
    )


def generate_timeline(event: EventInput, today: Optional[date] = None) -> TimelineSchedule:
    """Public wrapper providing backward compatibility if today is omitted."""
    anchor_date = today or date.today()
    return build_timeline(event, anchor_date)
