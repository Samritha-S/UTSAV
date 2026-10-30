"""Deterministic budget allocation engine and feasibility validator for Indian events.

This module is pure: no network requests, no database access, no randomness,
and no global state mutations. It implements Hamilton's Largest-Remainder
method to ensure whole-rupee allocation with zero off-by-one drift.
"""

from datetime import date
from math import floor
from typing import Dict, List, Tuple

from app.models import (
    BudgetBreakdown,
    BudgetCategory,
    BudgetFeasibility,
    CityTier,
    DietaryPreference,
    EventInput,
    EventType,
    VenueSetting,
)
from app.planner.data import (
    BASE_BUDGET_FLOORS_PER_GUEST_INR,
    CITY_TIER_CATEGORY_WEIGHT_MODIFIERS,
    CITY_TIER_MULTIPLIERS,
    CONTINGENCY_MAX_PCT,
    CONTINGENCY_MIN_PCT,
    DIETARY_CATERING_MODIFIERS,
    EVENT_BASE_ALLOCATIONS,
    FEASIBILITY_RATIO_COMFORTABLE,
    FEASIBILITY_RATIO_TIGHT,
    GUEST_COUNT_CATEGORY_MODIFIERS,
    GUEST_TIERS,
    OFF_SEASON_MONTHS,
    OUTDOOR_CATEGORY_MODIFIERS,
    PEAK_FESTIVE_MONTHS,
    PEAK_SEASON_CATEGORY_MODIFIERS,
    PEAK_WEDDING_MONTHS,
)


def get_guest_count_tier(guest_count: int) -> str:
    """Classify guest count into standard operational planning tiers."""
    for tier, (low, high) in GUEST_TIERS.items():
        if low <= guest_count <= high:
            return tier
    return "grand" if guest_count > 800 else "intimate"


def determine_seasonal_band(event_date: date, event_type: EventType) -> str:
    """Identify if the event falls in a peak wedding, festive, or off-season month."""
    month = event_date.month
    if event_type == EventType.WEDDING and month in PEAK_WEDDING_MONTHS:
        return "peak_wedding"
    if event_type in (EventType.COMMUNITY, EventType.BIRTHDAY) and month in PEAK_FESTIVE_MONTHS:
        return "peak_festive"
    if month in OFF_SEASON_MONTHS:
        return "off_season"
    return "regular"


def calculate_contingency_percentage(event: EventInput) -> float:
    """Compute risk-adjusted contingency percentage bounded between 5% and 10%."""
    contingency = CONTINGENCY_MIN_PCT  # Base 5.0%

    # Outdoor events carry unpredictable weather and equipment risks
    if event.indoor_outdoor in (VenueSetting.OUTDOOR, VenueSetting.BOTH):
        contingency += 2.5

    # Peak seasons face sudden vendor replacement price surges
    season = determine_seasonal_band(event.event_date, event.event_type)
    if season in ("peak_wedding", "peak_festive"):
        contingency += 1.0

    # Large crowds (>300) have higher probability of incidental overheads
    if event.guest_count > 300:
        contingency += 1.5

    return min(max(contingency, CONTINGENCY_MIN_PCT), CONTINGENCY_MAX_PCT)


def compute_category_weights(event: EventInput) -> Dict[str, float]:
    """Calculate normalized category weights accounting for tier, season, guest scale, and diet."""
    base_data = EVENT_BASE_ALLOCATIONS[event.event_type.value]
    adjusted_weights: Dict[str, float] = {}

    guest_tier = get_guest_count_tier(event.guest_count)
    city_modifiers = CITY_TIER_CATEGORY_WEIGHT_MODIFIERS.get(event.city_tier.value, {})
    guest_modifiers = GUEST_COUNT_CATEGORY_MODIFIERS.get(guest_tier, {})
    season = determine_seasonal_band(event.event_date, event.event_type)
    is_peak = season in ("peak_wedding", "peak_festive")
    is_outdoor = event.indoor_outdoor in (VenueSetting.OUTDOOR, VenueSetting.BOTH)

    # Determine highest dietary modifier for food courses
    catering_diet_mod = 1.0
    for diet in event.dietary_preferences:
        catering_diet_mod = max(catering_diet_mod, DIETARY_CATERING_MODIFIERS.get(diet.value, 1.0))

    for category, (base_pct, _) in base_data.items():
        weight = base_pct

        # Apply City Tier modifier
        weight *= city_modifiers.get(category, 1.0)

        # Apply Seasonality modifier during peak periods
        if is_peak:
            weight *= PEAK_SEASON_CATEGORY_MODIFIERS.get(category, 1.0)

        # Apply Outdoor venue modifier
        if is_outdoor:
            weight *= OUTDOOR_CATEGORY_MODIFIERS.get(category, 1.0)

        # Apply Guest Count tier modifier
        weight *= guest_modifiers.get(category, 1.0)

        # Apply Dietary modifier to food/catering categories
        if any(food_kw in category for food_kw in ("Catering", "Food", "Prasadam")):
            weight *= catering_diet_mod

        adjusted_weights[category] = weight

    # Renormalize weights so their sum equals exactly 1.0
    total_raw_weight = sum(adjusted_weights.values())
    return {cat: wt / total_raw_weight for cat, wt in adjusted_weights.items()}


def distribute_budget_largest_remainder(
    spendable_inr: int,
    normalized_weights: Dict[str, float],
) -> Dict[str, int]:
    """Distribute whole rupees using Hamilton's largest remainder method.

    Guarantees sum(allocated.values()) == spendable_inr with zero penny/rupee drift.
    """
    integer_allocations: Dict[str, int] = {}
    remainders: List[Tuple[float, str]] = []

    allocated_so_far = 0
    for category, weight in normalized_weights.items():
        exact_share = spendable_inr * weight
        int_share = floor(exact_share)
        fractional_part = exact_share - int_share

        integer_allocations[category] = int_share
        remainders.append((fractional_part, category))
        allocated_so_far += int_share

    shortfall = spendable_inr - allocated_so_far

    # Sort descending by remainder; stable secondary sort by category name
    remainders.sort(key=lambda item: (-item[0], item[1]))

    # Distribute remaining single rupees to the largest remainder holders
    for i in range(shortfall):
        top_category = remainders[i][1]
        integer_allocations[top_category] += 1

    return integer_allocations


def get_budget_floor(event_type: EventType, city_tier: CityTier) -> float:
    """Calculate the realistic per-guest floor cost in INR for an event in a given city tier."""
    base_floor = BASE_BUDGET_FLOORS_PER_GUEST_INR[event_type.value]
    multiplier = CITY_TIER_MULTIPLIERS[city_tier.value]
    return base_floor * multiplier


def evaluate_feasibility(
    event: EventInput,
    total_budget_inr: int,
    actual_per_guest_inr: float,
) -> BudgetFeasibility:
    """Evaluate budget feasibility against realistic per-guest cost benchmarks.

    Note on computation: Per-guest spend (actual_per_guest_inr) is computed on
    the FULL planned budget (total_budget_inr / guest_count) to reflect the
    organizer's total financial commitment per attendee, while category
    allocations and contingency are partitioned beneath this total.

    Returns a verdict ('comfortable', 'tight', or 'unrealistic') and computes
    2-4 concrete, quantified recommendations when the budget is constrained.
    """
    floor_per_guest = get_budget_floor(event.event_type, event.city_tier)
    ratio = actual_per_guest_inr / floor_per_guest

    if ratio >= FEASIBILITY_RATIO_COMFORTABLE:
        return BudgetFeasibility(
            is_feasible=True,
            verdict="comfortable",
            floor_per_guest_inr=floor_per_guest,
            actual_per_guest_inr=actual_per_guest_inr,
            suggestions=[],
        )

    suggestions: List[str] = []

    if ratio >= FEASIBILITY_RATIO_TIGHT:
        verdict = "tight"
        is_feasible = True

        # Computed guest recommendation for comfortable per-head margin
        target_guests = max(5, int(total_budget_inr / (floor_per_guest * FEASIBILITY_RATIO_COMFORTABLE)))
        suggestions.append(
            f"Trimming your guest list from {event.guest_count} to approximately {target_guests} "
            f"would elevate your per-head spend to comfortable hospitality benchmarks."
        )
        suggestions.append(
            "Negotiate weekday or non-muhurat booking dates to unlock 10% to 15% discounts from venues and decorators."
        )
        decor_savings = round(total_budget_inr * 0.04)
        suggestions.append(
            f"Opt for seasonal fresh marigold and traditional fabric drapery instead of imported florals to save roughly ₹{decor_savings:,}."
        )
    else:
        verdict = "unrealistic"
        is_feasible = False

        # Computed guest cap to meet the basic floor
        max_sustainable_guests = max(5, int(total_budget_inr / floor_per_guest))
        suggestions.append(
            f"Guest count is too high for this budget. Cap attendees at roughly {max_sustainable_guests} guests "
            f"to meet baseline catering and venue safety requirements."
        )
        suggestions.append(
            "Consider a community hall, residential society clubhouse, or open park rather than a commercial banquet or luxury lawn."
        )
        suggestions.append(
            "Simplify catering to a single curated regional buffet spread without multi-station live counters."
        )
        suggestions.append(
            "Plan for an afternoon or daytime celebration where lighting, heavy staging, and high dinner costs are naturally minimized."
        )

    return BudgetFeasibility(
        is_feasible=is_feasible,
        verdict=verdict,
        floor_per_guest_inr=floor_per_guest,
        actual_per_guest_inr=actual_per_guest_inr,
        suggestions=suggestions,
    )


def allocate_budget(event: EventInput) -> BudgetBreakdown:
    """Produce a deterministic, perfectly balanced budget breakdown for an event.

    Ensures that sum(category.allocated_inr) + contingency_inr == event.budget_inr exactly.
    """
    total_budget_inr = int(event.budget_inr)
    contingency_pct = calculate_contingency_percentage(event)

    # Calculate integer contingency in INR
    contingency_inr = round(total_budget_inr * (contingency_pct / 100.0))
    spendable_inr = total_budget_inr - contingency_inr

    # Normalized category weights considering all modifiers
    normalized_weights = compute_category_weights(event)

    # Distribute spendable budget with zero rounding drift
    allocated_shares = distribute_budget_largest_remainder(spendable_inr, normalized_weights)

    base_descriptions = {
        cat: desc for cat, (_, desc) in EVENT_BASE_ALLOCATIONS[event.event_type.value].items()
    }

    categories: List[BudgetCategory] = []
    for category_name, allocated_amount in allocated_shares.items():
        percentage = round((allocated_amount / total_budget_inr) * 100.0, 2)
        categories.append(
            BudgetCategory(
                name=category_name,
                allocated_inr=allocated_amount,
                percentage=percentage,
                description=base_descriptions.get(category_name, ""),
            )
        )

    actual_cpg = round(total_budget_inr / event.guest_count, 2)
    feasibility = evaluate_feasibility(event, total_budget_inr, actual_cpg)

    return BudgetBreakdown(
        total_budget_inr=total_budget_inr,
        currency="INR",
        cost_per_guest_inr=actual_cpg,
        contingency_inr=contingency_inr,
        contingency_percentage=contingency_pct,
        categories=categories,
        feasibility=feasibility,
    )


def calculate_budget(event: EventInput) -> BudgetBreakdown:
    """Alias for allocate_budget for backwards compatibility."""
    return allocate_budget(event)
