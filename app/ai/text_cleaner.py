"""Pure text normalizer and sanitizer for AI-generated and model-written strings.

Ensures generated celebratory themes, dishes, activities, and notes contain zero
markdown artifacts (bold, italics, list markers, code fences, headings), zero
doubled punctuation, clean sentence casing, and clean list splitting.
"""

import re


def clean_model_text(text: str, is_title_or_item: bool = False) -> str:
    """Normalize model-written text into clean, editorial plain prose.

    Args:
        text: Input text potentially containing markdown, HTML, or raw formatting.
        is_title_or_item: If True, applies title/item casing and removes trailing punctuation.

    Returns:
        Cleaned, normalized plain text string.
    """
    if not text:
        return ""

    s = str(text)

    # 1. Strip HTML tags
    s = re.sub(r"<[^>]+>", "", s)

    # 2. Convert markdown links [label](url) to label
    s = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", s)

    # 3. Strip control characters (except standard newline/tab)
    s = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", s)

    # 4. Strip code fences and backticks
    s = re.sub(r"```[\w]*\n?", "", s)
    s = s.replace("```", "").replace("`", "")

    # 5. Strip markdown headings (# , ## , etc.)
    s = re.sub(r"^\s*#{1,6}\s*", "", s, flags=re.MULTILINE)

    # 6. Strip leading list bullets and numbered prefixes (- , * , • , 1. , 1) , etc.)
    s = re.sub(r"^\s*[-*•–—]\s+", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*\d+[\.\)]\s+", "", s, flags=re.MULTILINE)

    # 7. Strip bold and italics markers (**text**, *text*, __text__, _text_)
    s = re.sub(r"\*\*([^\*]+)\*\*", r"\1", s)
    s = re.sub(r"\*([^\*]+)\*", r"\1", s)
    s = re.sub(r"__([^_]+)__", r"\1", s)
    # Only remove standalone _word_ if it's not a snake_case identifier
    s = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"\1", s)

    # 8. Strip stray wrapping quotes
    s = s.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        if len(s) >= 2:
            s = s[1:-1].strip()

    # 9. Collapse multiple internal whitespace / newlines
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)

    # 10. Fix doubled punctuation (e.g. '..', ',,', '!!') except ellipsis '...'
    s = re.sub(r",,+", ",", s)
    s = re.sub(r";;+", ";", s)
    s = re.sub(r"::+", ":", s)
    s = re.sub(r"\?\?+", "?", s)
    s = re.sub(r"!!+", "!", s)
    s = re.sub(r"(?<!\.)\.\.(?!\.)", ".", s)

    # 11. Normalize ALL-CAPS shouting
    # If the string is mostly uppercase and longer than 3 characters, normalize it
    if len(s) > 3 and sum(1 for c in s if c.isupper()) > len(s) * 0.65:
        if is_title_or_item:
            s = s.title()
        else:
            # Sentence case: capitalize first letter of sentences
            s = s.capitalize()

    # 12. If title or single item: remove trailing colons, semicolons, dashes, or exclamation marks
    if is_title_or_item:
        s = re.sub(r"[\s:;\-!]+$", "", s)
        # Ensure first character is uppercase
        if s and s[0].islower():
            s = s[0].upper() + s[1:]

    return s.strip()


def split_and_clean_dishes(raw_dishes: list[str] | str) -> list[str]:
    """Split comma-separated or newline-separated blobs of dishes into individual, clean dish items.

    Args:
        raw_dishes: String or List of dish strings returned by model.

    Returns:
        List of individual, cleanly formatted dish names.
    """
    clean_dishes: list[str] = []

    if isinstance(raw_dishes, str):
        raw_list = [raw_dishes]
    else:
        raw_list = raw_dishes

    for item in raw_list:
        if not item:
            continue
        # Split on newlines first if multiline string
        lines = [line.strip() for line in str(item).split("\n") if line.strip()]
        for line in lines:
            cleaned = clean_model_text(line, is_title_or_item=True)
            if not cleaned:
                continue

            # Check if model returned a comma- or 'and'-separated blob e.g. "Paneer Tikka, Dal Makhani and Garlic Naan"
            if ("," in cleaned or " and " in cleaned) and len(cleaned) > 20:
                normalized = cleaned.replace(" and ", ", ")
                parts = [p.strip() for p in normalized.split(",") if p.strip()]
                for p in parts:
                    clean_part = clean_model_text(p, is_title_or_item=True)
                    if clean_part and clean_part not in clean_dishes:
                        clean_dishes.append(clean_part[:80])
            else:
                if cleaned not in clean_dishes:
                    clean_dishes.append(cleaned[:80])

    return clean_dishes
