"""Data models and Pydantic schemas for Utsav Planner."""

import re
from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class EventType(StrEnum):
    """Supported event categories."""

    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    COMMUNITY = "community"


class CityTier(StrEnum):
    """City tier categorization for cost scaling in India."""

    METRO = "metro"  # Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune
    TIER2 = "tier2"  # Jaipur, Ahmedabad, Chandigarh, Lucknow, Kochi, etc.
    TIER3 = "tier3"  # Smaller towns and district headquarters


class VenueSetting(StrEnum):
    """Venue setting choices."""

    INDOOR = "indoor"
    OUTDOOR = "outdoor"
    BOTH = "both"


class DietaryPreference(StrEnum):
    """Dietary preferences common in Indian celebrations."""

    VEGETARIAN = "vegetarian"
    JAIN = "jain"
    NON_VEG = "non-veg"
    VEGAN = "vegan"
    SATTVIC = "sattvic"
    HALAL = "halal"


class AgeGroup(StrEnum):
    """Target age demographic primarily for tailoring birthday themes and activities."""

    KIDS = "kids"
    TEENS = "teens"
    ADULTS = "adults"
    SENIORS = "seniors"


class TaskStatus(StrEnum):
    """Status indicating how compressed a planning task timeline is."""

    ON_TRACK = "on_track"
    DUE_SOON = "due_soon"
    OVERDUE_COMPRESSED = "overdue_compressed"


class TaskPriority(StrEnum):
    """Priority level for sequencing and crunch planning."""

    CRITICAL = "critical"
    IMPORTANT = "important"
    OPTIONAL = "optional"


class BookingStage(StrEnum):
    """Standard vendor booking stages."""

    SHORTLIST = "shortlist"
    QUOTE = "quote"
    BOOK = "book"
    DEPOSIT = "deposit"
    CONFIRM = "confirm"


class ChecklistType(StrEnum):
    """Type of diligence check required for a vendor task."""

    ASK = "ask"
    VERIFY = "verify"
    DOCUMENT = "document"
    PAYMENT = "payment"


def sanitize_text(value: str) -> str:
    """Strip control characters, excessive whitespace, and neutralize angle brackets to prevent XML delimiter tag breakout."""
    if not value:
        return ""
    # Remove ASCII control characters except newline and tab
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", value)
    # Neutralize angle brackets so user input cannot spoof or prematurely close XML delimiter tags
    cleaned = cleaned.replace("<", "&lt;").replace(">", "&gt;")
    # Strip markdown code-block fences to prevent prompt breakout
    cleaned = cleaned.replace("```", "'''")
    return cleaned.strip()


# =====================================================================
# Request Models
# =====================================================================


class EventInput(BaseModel):
    """Strictly validated intake schema for event planning requests."""

    event_type: EventType = Field(
        ..., description="Type of celebratory event: wedding, birthday, or community festival."
    )
    event_date: date = Field(..., description="Target celebration date. Must not be in the past.")
    guest_count: int = Field(
        ..., ge=5, le=5000, description="Expected number of attendees (between 5 and 5,000)."
    )
    budget_inr: int = Field(
        ...,
        ge=5000,
        le=100000000,
        description="Total allocated budget in whole Indian Rupees (INR 5,000 to INR 10 Crore).",
    )
    city: str = Field(
        ...,
        min_length=2,
        max_length=60,
        description="City or town where the event will take place.",
    )
    city_tier: CityTier = Field(
        default=CityTier.TIER2, description="City cost tier (metro, tier2, or tier3)."
    )
    dietary_preferences: list[DietaryPreference] = Field(
        default_factory=lambda: [DietaryPreference.VEGETARIAN],
        description="Dietary requirements for the catering menu.",
    )
    indoor_outdoor: VenueSetting = Field(
        default=VenueSetting.INDOOR,
        description="Venue environment preference (indoor, outdoor, or both).",
    )
    age_group: AgeGroup | None = Field(
        default=None,
        description="Target age demographic (kids, teens, adults, seniors), primarily for birthdays.",
    )
    theme_notes: str = Field(
        default="",
        max_length=400,
        description="Free text preferences or special wishes (max 400 chars, sanitized).",
    )

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        """Sanitize and validate city name."""
        cleaned = sanitize_text(value)
        if len(cleaned) < 2:
            raise ValueError("City name must be at least 2 characters.")
        # Ensure only alphanumeric and spaces/hyphens are present
        if not re.match(r"^[a-zA-Z\s\-\.]+$", cleaned):
            raise ValueError("City name contains invalid characters.")
        return cleaned

    @field_validator("theme_notes")
    @classmethod
    def validate_theme_notes(cls, value: str) -> str:
        """Sanitize theme notes to prevent control character and tag injection."""
        return sanitize_text(value)

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: date) -> date:
        """Ensure the event date is not in the past."""
        today = date.today()
        if value < today:
            raise ValueError(f"Event date cannot be in the past. Today is {today.isoformat()}.")
        return value


class RefineRequest(BaseModel):
    """Schema for refining creative ideas using natural language."""

    event_input: EventInput = Field(..., description="The base event parameters.")
    refinement_prompt: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="User instructions for modification (max 200 chars).",
    )

    @field_validator("refinement_prompt")
    @classmethod
    def validate_refinement_prompt(cls, value: str) -> str:
        """Sanitize the refinement prompt."""
        cleaned = sanitize_text(value)
        if len(cleaned) < 3:
            raise ValueError("Refinement instruction must be at least 3 characters.")
        return cleaned


# =====================================================================
# Response Models: Budget Engine
# =====================================================================


class BudgetCategory(BaseModel):
    """Allocation breakdown for a single expenditure vertical."""

    category_slug: str = Field(
        ..., description="Stable machine-readable slug identifier for category."
    )
    name: str = Field(
        ..., description="Human-readable category label (e.g. Catering, Venue, Decor)."
    )
    allocated_inr: int = Field(..., description="Calculated expenditure amount in whole INR.")
    percentage: float = Field(..., description="Share of total budget (e.g. 35.0%).")
    description: str = Field(..., description="Context on what this allocation covers.")


class BudgetFeasibility(BaseModel):
    """Assessment of whether the planned budget realistically supports the event scope."""

    is_feasible: bool = Field(..., description="True if budget meets the minimum per-guest floor.")
    verdict: str = Field(
        ..., description="Assessment verdict ('comfortable', 'tight', or 'unrealistic')."
    )
    floor_per_guest_inr: float = Field(
        ..., description="Estimated minimum realistic cost per guest."
    )
    actual_per_guest_inr: float = Field(..., description="Planned spending per guest in INR.")
    suggestions: list[str] = Field(
        default_factory=list, description="Actionable trade-offs to improve feasibility."
    )


class BudgetBreakdown(BaseModel):
    """Complete budget output generated by the deterministic engine."""

    total_budget_inr: int = Field(..., description="Total planned budget in whole INR.")
    currency: Literal["INR"] = Field(default="INR", description="Currency unit.")
    cost_per_guest_inr: float = Field(..., description="Planned cost per attendee in INR.")
    contingency_inr: int = Field(
        ..., description="Reserved contingency cushion (5-10%) in whole INR."
    )
    contingency_percentage: float = Field(
        ..., description="Contingency percentage of total budget."
    )
    categories: list[BudgetCategory] = Field(..., description="Itemized category splits.")
    feasibility: BudgetFeasibility = Field(..., description="Budget feasibility analysis.")


# =====================================================================
# Response Models: Timeline Engine
# =====================================================================


class TimelineTask(BaseModel):
    """Scheduled task derived by backwards scheduling from the event date."""

    task_id: str = Field(..., description="Unique task identifier.")
    title: str = Field(..., description="Actionable title of the planning task.")
    category: str = Field(..., description="Category key matching budget categories.")
    target_date: date = Field(..., description="Recommended deadline for task completion.")
    lead_time_days: int = Field(..., description="Ideal lead time in days prior to event.")
    priority: TaskPriority = Field(
        default=TaskPriority.IMPORTANT,
        description="Priority level (critical, important, optional).",
    )
    dependencies: list[str] = Field(
        default_factory=list, description="IDs of prerequisite tasks that should precede this task."
    )
    status: TaskStatus = Field(..., description="Timeline urgency assessment.")
    advice: str | None = Field(
        default=None, description="Practical guidance if lead time has compressed or passed."
    )


class TimelineSchedule(BaseModel):
    """Comprehensive backwards-scheduled roadmap."""

    event_date: date = Field(..., description="Target event date.")
    days_remaining: int = Field(..., description="Number of days between today and event.")
    weeks_remaining: float = Field(..., description="Weeks between today and event.")
    is_crunch_plan: bool = Field(
        default=False,
        description="True if planning window is very short and collapsed to critical items.",
    )
    crunch_summary: str | None = Field(
        default=None, description="One-line explanation when crunch plan is activated."
    )
    status_counts: dict[str, int] = Field(
        default_factory=dict,
        description="Counts of tasks by status (on_track, due_soon, overdue_compressed).",
    )
    most_urgent_action: str | None = Field(
        default=None, description="Single highest-priority actionable next task."
    )
    tasks: list[TimelineTask] = Field(..., description="Ordered list of milestone tasks.")


# =====================================================================
# Response Models: Vendor Checklist
# =====================================================================


class ChecklistItem(BaseModel):
    """Specific vendor vetting checkpoint."""

    item_id: str = Field(..., description="Unique identifier for the checklist item.")
    text: str = Field(..., description="Actionable diligence requirement or question.")
    item_type: ChecklistType = Field(
        default=ChecklistType.VERIFY, description="Check type: ask, verify, document, or payment."
    )
    stage: BookingStage = Field(
        ..., description="Milestone stage (shortlist, quote, book, deposit, confirm)."
    )
    what_to_ask: list[str] = Field(
        default_factory=list, description="Key questions to put to the vendor."
    )
    what_to_verify: list[str] = Field(
        default_factory=list, description="Crucial documents/licenses or compliance checks."
    )


class ChecklistCategory(BaseModel):
    """Checklist group by vendor domain."""

    category_slug: str = Field(
        ..., description="Stable machine-readable slug identifier matching budget."
    )
    category_name: str = Field(..., description="Human-readable category label matching budget.")
    items: list[ChecklistItem] = Field(..., description="Checklist items under this domain.")


class VendorChecklist(BaseModel):
    """Full vendor vetting and verification checklist."""

    event_type: EventType = Field(..., description="Event type the checklist was built for.")
    categories: list[ChecklistCategory] = Field(..., description="Checklists grouped by vendor.")


# =====================================================================
# Response Models: AI Ideas Layer
# =====================================================================


class ThemeIdea(BaseModel):
    """Theme concept tailored to the persona and event."""

    name: str = Field(..., description="Name of the theme.")
    description: str = Field(..., description="Atmosphere and narrative.")
    decor_elements: list[str] = Field(..., description="Visual styling elements.")
    dress_code: str = Field(..., description="Suggested guest attire guidance.")


class MenuSection(BaseModel):
    """Curated catering courses aligned with dietary preferences."""

    meal_type: str = Field(
        ..., description="Course name (e.g. 'Live Chaat & Starters', 'Grand Feast')."
    )
    dishes: list[str] = Field(..., description="Curated regional dishes.")
    dietary_tags: list[str] = Field(
        ..., description="Dietary badges (e.g. 'Jain Option', 'Pure Veg')."
    )


class ActivityIdea(BaseModel):
    """Interactive program or engagement element."""

    title: str = Field(..., description="Name of the activity.")
    description: str = Field(..., description="How the activity runs and who it engages.")
    suitable_for: str = Field(
        ..., description="Target group (e.g. 'Kids & Adults', 'All Generations')."
    )


class DecorIdea(BaseModel):
    """Decor recommendation by venue zone."""

    area: str = Field(
        ..., description="Area of venue (e.g. 'Entrance Arch', 'Center Stage / Mandap')."
    )
    concept: str = Field(..., description="Decorative styling approach.")
    suggested_materials: list[str] = Field(
        ..., description="Cost-effective or traditional materials."
    )


class GeminiCreativeIdeasPayload(BaseModel):
    """Schema enforced on Gemini model output; strictly excludes the server-managed source field."""

    themes: list[ThemeIdea] = Field(..., description="Theme concepts.")
    menu_suggestions: list[MenuSection] = Field(..., description="Tailored food selections.")
    activities: list[ActivityIdea] = Field(..., description="Engaging event elements.")
    decor_ideas: list[DecorIdea] = Field(..., description="Decor arrangements.")
    budget_fit_note: str = Field(
        ..., description="Note on how these creative choices respect the budget."
    )


class CreativeIdeas(BaseModel):
    """Personalized creative package with server-controlled source tag."""

    themes: list[ThemeIdea] = Field(..., description="Theme concepts.")
    menu_suggestions: list[MenuSection] = Field(..., description="Tailored food selections.")
    activities: list[ActivityIdea] = Field(..., description="Engaging event elements.")
    decor_ideas: list[DecorIdea] = Field(..., description="Decor arrangements.")
    budget_fit_note: str = Field(
        ..., description="Note on how these creative choices respect the budget."
    )
    source: Literal["ai", "fallback"] = Field(
        default="fallback",
        description="Source of creative ideas: 'ai' from Gemini or 'fallback' from curated benchmarks.",
    )


# =====================================================================
# Consolidated Plan Response
# =====================================================================


class PlanResponse(BaseModel):
    """Unified response containing all planning components."""

    event_summary: EventInput = Field(..., description="Validated event inputs.")
    budget: BudgetBreakdown = Field(..., description="Deterministic budget breakdown.")
    timeline: TimelineSchedule = Field(..., description="Backwards-scheduled timeline.")
    checklist: VendorChecklist = Field(..., description="Vendor diligence checklist.")
    ideas: CreativeIdeas = Field(..., description="Personalized creative recommendations.")
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Timestamp when the plan was synthesized.",
    )


class RefineResponse(BaseModel):
    """Response returned upon refining creative ideas."""

    ideas: CreativeIdeas = Field(..., description="Updated creative recommendations.")
    refinement_note: str = Field(
        ..., description="Explanation of how the ideas were adapted to the prompt."
    )
