from datetime import date, timedelta

from app.models import (
    ActivityIdea,
    BudgetCategory,
    ChecklistItem,
    CreativeIdeas,
    DecorIdea,
    EventInput,
    EventType,
    MenuSection,
    PlanResponse,
    ThemeIdea,
    TimelineTask,
)
from app.planner.budget import allocate_budget
from app.planner.checklist import generate_checklist
from app.planner.timeline import generate_timeline


def test_contract_safety_plan_response_fields():
    """Verify that every field read by the frontend exists on the real backend PlanResponse models."""
    event_date = date.today() + timedelta(days=90)
    event_input = EventInput(
        event_type=EventType.WEDDING,
        event_date=event_date,
        guest_count=200,
        budget_inr=1500000,
        city="Jaipur",
        dietary_preferences=["vegetarian"],
        theme_notes="Royal Marwari aesthetic",
    )

    budget_plan = allocate_budget(event_input)
    timeline_plan = generate_timeline(event_input)
    checklist_plan = generate_checklist(event_input)

    mock_ideas = CreativeIdeas(
        source="fallback",
        themes=[
            ThemeIdea(
                name="Royal Marwari Vivaha",
                description="Traditional royal heritage celebration.",
                decor_elements=["Marigold arches", "Brass diyas", "Silk drapes"],
                dress_code="Traditional Indian formal attire",
            )
        ],
        menu_suggestions=[
            MenuSection(
                meal_type="Grand Rajasthani Feast",
                dishes=["Dal Baati Churma", "Gatte ki Sabzi", "Ker Sangri"],
                dietary_tags=["Pure Veg", "Jain Option Available"],
            )
        ],
        activities=[
            ActivityIdea(
                title="Live Folk Performance & Ghoomar",
                description="Interactive traditional music and dhol welcome.",
                suitable_for="All Generations",
            )
        ],
        decor_ideas=[
            DecorIdea(
                area="Entrance & Mandap",
                concept="Royal floral courtyard with heritage pillars.",
                suggested_materials=["Fresh marigold garlands", "Brass urlis"],
            )
        ],
        budget_fit_note="All creative selections fit within standard catering and decor allocation limits.",
    )

    plan_response = PlanResponse(
        event_summary=event_input,
        budget=budget_plan,
        timeline=timeline_plan,
        checklist=checklist_plan,
        ideas=mock_ideas,
    )

    # 1. TimelineTask contract
    frontend_timeline_task_fields = {
        "task_id",
        "title",
        "category",
        "target_date",
        "lead_time_days",
        "priority",
        "dependencies",
        "status",
        "advice",
    }
    model_timeline_task_fields = set(TimelineTask.model_fields.keys())
    missing_timeline_fields = frontend_timeline_task_fields - model_timeline_task_fields
    assert not missing_timeline_fields, (
        f"TimelineTask missing fields read by frontend: {missing_timeline_fields}"
    )

    # Verify real instance has these fields populated
    assert len(plan_response.timeline.tasks) > 0
    sample_task = plan_response.timeline.tasks[0]
    for field in frontend_timeline_task_fields:
        assert hasattr(sample_task, field), f"sample_task missing attribute '{field}'"

    # 2. Checklist contract
    frontend_checklist_item_fields = {
        "item_id",
        "text",
        "item_type",
        "stage",
        "what_to_ask",
        "what_to_verify",
    }
    model_checklist_item_fields = set(ChecklistItem.model_fields.keys())
    missing_checklist_fields = frontend_checklist_item_fields - model_checklist_item_fields
    assert not missing_checklist_fields, (
        f"ChecklistItem missing fields read by frontend: {missing_checklist_fields}"
    )

    assert len(plan_response.checklist.categories) > 0
    sample_cat = plan_response.checklist.categories[0]
    assert hasattr(sample_cat, "category_slug")
    assert hasattr(sample_cat, "category_name")
    assert hasattr(sample_cat, "items")
    assert len(sample_cat.items) > 0
    sample_item = sample_cat.items[0]
    for field in frontend_checklist_item_fields:
        assert hasattr(sample_item, field), f"sample_item missing attribute '{field}'"

    # 3. BudgetCategory contract
    frontend_budget_category_fields = {
        "category_slug",
        "name",
        "allocated_inr",
        "percentage",
        "description",
    }
    model_budget_category_fields = set(BudgetCategory.model_fields.keys())
    missing_budget_fields = frontend_budget_category_fields - model_budget_category_fields
    assert not missing_budget_fields, (
        f"BudgetCategory missing fields read by frontend: {missing_budget_fields}"
    )

    assert len(plan_response.budget.categories) > 0
    sample_budget_cat = plan_response.budget.categories[0]
    for field in frontend_budget_category_fields:
        assert hasattr(sample_budget_cat, field), f"sample_budget_cat missing attribute '{field}'"

    # 4. CreativeIdeas contracts
    frontend_theme_fields = {
        "name",
        "description",
        "decor_elements",
        "dress_code",
    }
    assert frontend_theme_fields <= set(ThemeIdea.model_fields.keys()), (
        "ThemeIdea contract mismatch"
    )

    frontend_menu_fields = {"meal_type", "dishes", "dietary_tags"}
    assert frontend_menu_fields <= set(MenuSection.model_fields.keys()), (
        "MenuSection contract mismatch"
    )

    frontend_activity_fields = {"title", "description", "suitable_for"}
    assert frontend_activity_fields <= set(ActivityIdea.model_fields.keys()), (
        "ActivityIdea contract mismatch"
    )

    frontend_decor_fields = {"area", "concept", "suggested_materials"}
    assert frontend_decor_fields <= set(DecorIdea.model_fields.keys()), (
        "DecorIdea contract mismatch"
    )


def test_contract_safety_serialized_json():
    """Verify that JSON-serialized PlanResponse contains all expected keys."""
    event_date = date.today() + timedelta(days=60)
    event_input = EventInput(
        event_type=EventType.COMMUNITY,
        event_date=event_date,
        guest_count=500,
        budget_inr=300000,
        city="Pune",
        dietary_preferences=["vegetarian"],
    )

    plan = PlanResponse(
        event_summary=event_input,
        budget=allocate_budget(event_input),
        timeline=generate_timeline(event_input),
        checklist=generate_checklist(event_input),
        ideas=CreativeIdeas(
            source="fallback",
            themes=[],
            menu_suggestions=[],
            activities=[],
            decor_ideas=[],
            budget_fit_note="Safe",
        ),
    )

    data = plan.model_dump(mode="json")
    assert "event_summary" in data
    assert "budget" in data
    assert "timeline" in data
    assert "checklist" in data
    assert "ideas" in data
    assert "generated_at" in data

    # Verify tasks have target_date in ISO YYYY-MM-DD
    tasks = data["timeline"]["tasks"]
    assert len(tasks) > 0
    assert "target_date" in tasks[0]
    assert isinstance(tasks[0]["target_date"], str)
    assert len(tasks[0]["target_date"]) == 10  # YYYY-MM-DD
