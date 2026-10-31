"""Tests for formatting, text sanitation, and human-readable label tables."""

import re
from pathlib import Path

from app.ai.text_cleaner import clean_model_text, split_and_clean_dishes
from app.models import (
    AgeGroup,
    CityTier,
    DietaryPreference,
    EventType,
    TaskPriority,
    TaskStatus,
    VenueSetting,
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def test_text_cleaner_markdown_and_case():
    assert clean_model_text("**ROYAL** HERITAGE", is_title_or_item=True) == "Royal Heritage"
    assert clean_model_text("## SECTION HEADER", is_title_or_item=True) == "Section Header"
    assert clean_model_text("*Gulab Jamun*", is_title_or_item=True) == "Gulab Jamun"
    assert clean_model_text("Grand Entry...!!", is_title_or_item=True) == "Grand Entry..."


def test_dish_splitter():
    raw = "Paneer Tikka, Dal Makhani and Garlic Naan"
    dishes = split_and_clean_dishes(raw)
    assert dishes == ["Paneer Tikka", "Dal Makhani", "Garlic Naan"]

    bulleted = "- Palak Paneer\n* Butter Naan\n1. Kesar Kheer"
    dishes = split_and_clean_dishes(bulleted)
    assert dishes == ["Palak Paneer", "Butter Naan", "Kesar Kheer"]


def test_all_backend_enums_have_frontend_label_mappings():
    utils_js = (STATIC_DIR / "js" / "utils.js").read_text(encoding="utf-8")

    all_enums = [
        EventType,
        CityTier,
        VenueSetting,
        AgeGroup,
        DietaryPreference,
        TaskStatus,
        TaskPriority,
    ]

    for enum_cls in all_enums:
        for member in enum_cls:
            val = member.value
            # Verify the enum value is present as a key in HUMAN_LABELS (quoted or unquoted)
            pattern = rf'(?:["\']{re.escape(val)}["\']|(?<=\s){re.escape(val)})\s*:'
            assert re.search(pattern, utils_js) is not None, (
                f"Missing frontend humanLabel mapping for {enum_cls.__name__}.{member.name} = '{val}'"
            )


def test_no_raw_html_arrow_entities_in_static_js():
    js_files = list((STATIC_DIR / "js").glob("*.js")) + list(
        (STATIC_DIR / "js" / "views").glob("*.js")
    )
    for js_path in js_files:
        content = js_path.read_text(encoding="utf-8")
        assert "&rarr;" not in content, f"Raw &rarr; found in {js_path.name}"
        assert "&larr;" not in content, f"Raw &larr; found in {js_path.name}"
        assert "&darr;" not in content, f"Raw &darr; found in {js_path.name}"


def test_no_inner_html_or_eval_in_static_js():
    js_files = (
        list((STATIC_DIR / "js").glob("*.js"))
        + list((STATIC_DIR / "js" / "views").glob("*.js"))
        + [STATIC_DIR / "app.js"]
    )
    for js_path in js_files:
        content = js_path.read_text(encoding="utf-8")
        # Check that forbidden methods are not called in actual code
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("*") or stripped.startswith("//"):
                continue  # Skip comments/docstrings
            assert ".innerHTML" not in stripped, f".innerHTML found in {js_path.name}: {stripped}"
            assert ".outerHTML" not in stripped, f".outerHTML found in {js_path.name}: {stripped}"
            assert ".insertAdjacentHTML" not in stripped, (
                f".insertAdjacentHTML found in {js_path.name}: {stripped}"
            )
            assert "document.write" not in stripped, (
                f"document.write found in {js_path.name}: {stripped}"
            )
