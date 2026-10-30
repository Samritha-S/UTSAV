"""Vendor vetting and regulatory compliance checklist generator for Indian celebrations.

This module is pure: it creates structured diligence checklists aligned exactly
with budget categories, adapting items dynamically to outdoor setups, dietary needs,
and large gathering thresholds.
"""

from copy import deepcopy
from typing import Dict, List, Set

from app.models import (
    BookingStage,
    ChecklistCategory,
    ChecklistItem,
    ChecklistType,
    DietaryPreference,
    EventInput,
    VendorChecklist,
    VenueSetting,
)
from app.planner.data import (
    CHECKLIST_BASE_TEMPLATES,
    DIETARY_CHECKLIST_ADDITIONS,
    EVENT_BASE_ALLOCATIONS,
    LARGE_GATHERING_CHECKLIST_ADDITION,
    LARGE_GATHERING_VOLUNTEER_THRESHOLD,
    OUTDOOR_CHECKLIST_ADDITIONS,
)


def _convert_item_dict(raw: Dict) -> ChecklistItem:
    """Safely convert a raw dictionary into a typed ChecklistItem schema."""
    return ChecklistItem(
        item_id=raw["id"],
        text=raw["text"],
        item_type=ChecklistType(raw.get("item_type", "verify")),
        stage=BookingStage(raw.get("stage", "confirm")),
        what_to_ask=raw.get("what_to_ask", []),
        what_to_verify=raw.get("what_to_verify", []),
    )


def build_checklist(event: EventInput) -> VendorChecklist:
    """Generate comprehensive vendor vetting and compliance checklists.

    Ensures 100% 1-to-1 category alignment with budget categories so the UI
    can join budget splits with actionable checklists.
    """
    event_key = event.event_type.value
    base_category_keys = list(EVENT_BASE_ALLOCATIONS[event_key].keys())
    base_templates = deepcopy(CHECKLIST_BASE_TEMPLATES.get(event_key, {}))

    used_ids: Set[str] = set()
    categories_output: List[ChecklistCategory] = []

    is_outdoor = event.indoor_outdoor in (VenueSetting.OUTDOOR, VenueSetting.BOTH)
    is_large = event.guest_count >= LARGE_GATHERING_VOLUNTEER_THRESHOLD

    for cat_name in base_category_keys:
        raw_items = base_templates.get(cat_name, [])
        cat_items: List[ChecklistItem] = []

        # Add base items
        for raw in raw_items:
            if raw["id"] not in used_ids:
                used_ids.add(raw["id"])
                cat_items.append(_convert_item_dict(raw))

        # Apply Outdoor Adaptations
        if is_outdoor and event_key in OUTDOOR_CHECKLIST_ADDITIONS:
            outdoor_adds = OUTDOOR_CHECKLIST_ADDITIONS[event_key].get(cat_name, [])
            for raw in outdoor_adds:
                if raw["id"] not in used_ids:
                    used_ids.add(raw["id"])
                    cat_items.append(_convert_item_dict(raw))

        # Apply Dietary Adaptations (e.g. Jain, Vegan)
        for diet in event.dietary_preferences:
            diet_key = diet.value
            if diet_key in DIETARY_CHECKLIST_ADDITIONS:
                event_diet_adds = DIETARY_CHECKLIST_ADDITIONS[diet_key].get(event_key, {})
                diet_items = event_diet_adds.get(cat_name, [])
                for raw in diet_items:
                    if raw["id"] not in used_ids:
                        used_ids.add(raw["id"])
                        cat_items.append(_convert_item_dict(raw))

        # Apply Large Gathering Adaptations (to security/volunteer categories)
        if is_large and any(kw in cat_name for kw in ("Security", "Volunteer", "Infrastructure")):
            large_item_id = f"large_gathering_{cat_name.replace(' ', '_').lower()}"
            if large_item_id not in used_ids:
                used_ids.add(large_item_id)
                item_dict = dict(LARGE_GATHERING_CHECKLIST_ADDITION)
                item_dict["id"] = large_item_id
                cat_items.append(_convert_item_dict(item_dict))

        # If a category template was empty, provide standard vendor diligence items
        if not cat_items:
            fallback_id = f"fallback_{cat_name.replace(' ', '_').lower()}"
            if fallback_id not in used_ids:
                used_ids.add(fallback_id)
                cat_items.append(
                    ChecklistItem(
                        item_id=fallback_id,
                        text=f"Request written quotation, payment milestone schedule, and backup contact for {cat_name}.",
                        item_type=ChecklistType.DOCUMENT,
                        stage=BookingStage.QUOTE,
                        what_to_ask=[f"What is the exact scope and deliverable timeline for {cat_name}?"],
                        what_to_verify=["Verify printed deposit receipt and stamped invoice."],
                    )
                )

        categories_output.append(
            ChecklistCategory(
                category_name=cat_name,
                items=cat_items,
            )
        )

    return VendorChecklist(
        event_type=event.event_type,
        categories=categories_output,
    )


def generate_checklist(event: EventInput) -> VendorChecklist:
    """Public wrapper providing backward compatibility."""
    return build_checklist(event)
