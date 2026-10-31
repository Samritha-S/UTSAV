"""Unit tests for pure text normalization and dish list splitting."""

from app.ai.text_cleaner import clean_model_text, split_and_clean_dishes


def test_clean_model_text_strips_markdown_formatting():
    raw = "**Royal Rajwada** Banquet with *fresh marigolds* and __silk drapes__"
    cleaned = clean_model_text(raw)
    assert cleaned == "Royal Rajwada Banquet with fresh marigolds and silk drapes"
    assert "**" not in cleaned
    assert "*" not in cleaned
    assert "__" not in cleaned


def test_clean_model_text_strips_headings_and_list_markers():
    raw = "### 1. Grand Sangeet Night\n- Traditional Dhol\n• Live folk dancers"
    cleaned = clean_model_text(raw)
    assert "#" not in cleaned
    assert "- " not in cleaned
    assert "• " not in cleaned
    assert "Grand Sangeet Night" in cleaned
    assert "Traditional Dhol" in cleaned
    assert "Live folk dancers" in cleaned


def test_clean_model_text_normalizes_all_caps_shouting():
    raw_shouting = "PANEER TIKKA WITH MINT CHUTNEY"
    cleaned = clean_model_text(raw_shouting, is_title_or_item=True)
    assert cleaned == "Paneer Tikka With Mint Chutney"

    sentence_shouting = "THE VENUE IS SPECTACULAR AND FITS THE BUDGET PERFECTLY"
    cleaned_sentence = clean_model_text(sentence_shouting, is_title_or_item=False)
    assert cleaned_sentence == "The venue is spectacular and fits the budget perfectly"


def test_clean_model_text_fixes_doubled_punctuation_and_trailing_colons():
    raw = "Welcome Drinks & Appetizers:: Grand Feast,, and Desserts!!.."
    cleaned = clean_model_text(raw, is_title_or_item=True)
    assert "::" not in cleaned
    assert ",," not in cleaned
    assert "!!.." not in cleaned
    assert not cleaned.endswith(":")


def test_clean_model_text_strips_html_and_code_blocks():
    raw = "```json\n<p>Royal <b>Mandap</b> Styling</p>```"
    cleaned = clean_model_text(raw)
    assert "<p>" not in cleaned
    assert "<b>" not in cleaned
    assert "```" not in cleaned
    assert "Royal Mandap Styling" in cleaned


def test_split_and_clean_dishes():
    blob = ["Paneer Tikka in Clay Oven, Dal Makhani Slow Cooked, Butter Naan Basket"]
    dishes = split_and_clean_dishes(blob)
    assert len(dishes) == 3
    assert dishes[0] == "Paneer Tikka in Clay Oven"
    assert dishes[1] == "Dal Makhani Slow Cooked"
    assert dishes[2] == "Butter Naan Basket"


def test_clean_model_text_handles_empty_and_whitespace():
    assert clean_model_text("") == ""
    assert clean_model_text("   ") == ""
    assert clean_model_text(None) == ""
