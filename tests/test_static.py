"""Tests for static frontend assets: security, accessibility, and color constraints.

Verifies:
- Proper Content-Type serving for HTML, CSS, and ES module JavaScript files.
- Absence of inline script bodies and inline style attributes in index.html (strict CSP compliance).
- Complete ban on innerHTML, outerHTML, insertAdjacentHTML, eval, and document.write in all JS modules.
- Complete ban on external URLs (http:// or https://) across HTML, CSS, and JS (CSP 'self' only).
- Every interactive form control in index.html is linked to an accessible label via for/id matching.
- CSS color palette contains NO purple/violet hues (hue range 255-320 degrees forbidden).
"""

import colorsys
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI test client."""
    return TestClient(app)


# ---------------------------------------------------------------------
# 1. Static Asset Delivery and Content Types
# ---------------------------------------------------------------------
def test_static_files_served_with_correct_content_types(client):
    """Verify index.html, styles.css, and all JS modules are delivered with appropriate Content-Type headers."""
    # Root /
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "text/html" in res_root.headers.get("Content-Type", "")

    # Static CSS
    res_css = client.get("/static/styles.css")
    assert res_css.status_code == 200
    assert "text/css" in res_css.headers.get("Content-Type", "")

    # Main JS module
    res_app_js = client.get("/static/app.js")
    assert res_app_js.status_code == 200
    assert any(
        mime in res_app_js.headers.get("Content-Type", "")
        for mime in ["javascript", "text/javascript"]
    )

    # Sub-modules across all static directories
    for js_file in STATIC_DIR.rglob("*.js"):
        rel_posix = js_file.relative_to(STATIC_DIR).as_posix()
        res_sub = client.get(f"/static/{rel_posix}")
        assert res_sub.status_code == 200, f"Failed to serve /static/{rel_posix}"
        assert any(
            mime in res_sub.headers.get("Content-Type", "")
            for mime in ["javascript", "text/javascript"]
        )


# ---------------------------------------------------------------------
# 2. Strict CSP Compliance: No Inline Scripts or Style Attributes
# ---------------------------------------------------------------------
def test_no_inline_scripts_or_style_attributes_in_index_html():
    """Verify index.html contains no inline script blocks or style='...' attributes."""
    index_path = STATIC_DIR / "index.html"
    content = index_path.read_text(encoding="utf-8")

    # 1. No style="..." attributes
    style_attr_match = re.search(r'\bstyle\s*=\s*["\'][^"\']*["\']', content, re.IGNORECASE)
    assert style_attr_match is None, (
        f"Found forbidden inline style attribute: {style_attr_match.group(0)}"
    )

    # 2. No script tags with inline code (only external src permitted)
    script_tags = re.findall(r"<script\b([^>]*)>(.*?)</script>", content, re.DOTALL | re.IGNORECASE)
    for attrs, body in script_tags:
        assert "src=" in attrs, "Script tag must have a src attribute"
        assert body.strip() == "", f"Found forbidden inline script code: {body.strip()}"


# ---------------------------------------------------------------------
# 3. DOM Security: Absolute Ban on innerHTML, outerHTML, eval, etc.
# ---------------------------------------------------------------------
def test_no_forbidden_dom_injection_methods_in_javascript():
    """Verify no JS file contains innerHTML, outerHTML, insertAdjacentHTML, eval, or document.write."""
    forbidden_tokens = [
        "innerHTML",
        "outerHTML",
        "insertAdjacentHTML",
        "document.write",
        "eval(",
    ]

    all_js_files = list(STATIC_DIR.glob("**/*.js"))
    assert len(all_js_files) >= 5, "Expected modular JS files in static directory"

    for js_path in all_js_files:
        code = js_path.read_text(encoding="utf-8")
        for token in forbidden_tokens:
            # Check for actual token usage, not comments
            matches = [
                line
                for line in code.splitlines()
                if token in line
                and not line.strip().startswith("//")
                and not line.strip().startswith("*")
            ]
            assert not matches, (
                f"Forbidden DOM mutation method '{token}' found in {js_path.name}: {matches}"
            )


# ---------------------------------------------------------------------
# 4. CSP Conformance: No External URLs Referenced
# ---------------------------------------------------------------------
def test_no_external_urls_in_static_files():
    """Verify that HTML, CSS, and JS do not reference external http:// or https:// resources."""
    static_files = list(STATIC_DIR.glob("**/*"))
    static_code_files = [f for f in static_files if f.suffix in [".html", ".css", ".js"]]

    for file_path in static_code_files:
        content = file_path.read_text(encoding="utf-8")
        # Find any http:// or https:// (ignoring XML namespaces or schema URLs in comments)
        lines = content.splitlines()
        for idx, line in enumerate(lines, 1):
            line_clean = line.strip()
            # Ignore standard JSDoc comments or schemas
            if line_clean.startswith("//") or line_clean.startswith("*") or "w3.org" in line_clean:
                continue
            external_refs = re.findall(r'https?://[^\s\'"]+', line_clean)
            assert not external_refs, (
                f"External URL found in {file_path.name}:{idx} -> {external_refs}"
            )


# ---------------------------------------------------------------------
# 5. Accessibility: Every Form Control Has Associated Label
# ---------------------------------------------------------------------
def test_all_form_controls_have_associated_labels():
    """Verify every input, select, and textarea in index.html has a corresponding label."""
    index_path = STATIC_DIR / "index.html"
    content = index_path.read_text(encoding="utf-8")

    # Find all input, select, textarea elements
    controls = re.findall(r"<(input|select|textarea)\b([^>]*)>", content, re.IGNORECASE)
    assert len(controls) >= 8, "Expected at least 8 form controls in index.html"

    # Find all label "for" attributes
    label_fors = set(re.findall(r'<label\b[^>]*\bfor=["\']([^"\']+)["\']', content, re.IGNORECASE))

    for tag, attrs in controls:
        # Skip hidden inputs or submit/button inputs that don't take a label
        type_match = re.search(r'\btype=["\']([^"\']+)["\']', attrs, re.IGNORECASE)
        input_type = type_match.group(1).lower() if type_match else "text"
        if input_type in ["hidden", "submit", "button"]:
            continue

        id_match = re.search(r'\bid=["\']([^"\']+)["\']', attrs, re.IGNORECASE)
        assert id_match is not None, f"Form control <{tag} {attrs}> is missing an id attribute"
        control_id = id_match.group(1)
        assert control_id in label_fors, (
            f"Form control id '{control_id}' does not have a corresponding <label for='{control_id}'>"
        )


# ---------------------------------------------------------------------
# 6. Palette Enforcement: Absolutely No Purple/Violet/Lavender Hues
# ---------------------------------------------------------------------
def hex_to_hue_saturation(hex_color: str) -> tuple[float, float, float]:
    """Convert hex color string to (hue_degrees, saturation, lightness)."""
    clean_hex = hex_color.lstrip("#")
    if len(clean_hex) == 3:
        clean_hex = "".join(c * 2 for c in clean_hex)
    r = int(clean_hex[0:2], 16) / 255.0
    g = int(clean_hex[2:4], 16) / 255.0
    b = int(clean_hex[4:6], 16) / 255.0
    h, lightness, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360.0, s, lightness


def test_css_contains_no_purple_range_hues():
    """Verify styles.css contains no hex colors whose hue falls between 255 and 320 degrees."""
    css_path = STATIC_DIR / "styles.css"
    css_content = css_path.read_text(encoding="utf-8")

    # Extract all hex colors (#RGB or #RRGGBB)
    hex_colors = re.findall(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b", css_content)
    assert len(hex_colors) > 0, "Expected hex colors in styles.css"

    for hex_val in hex_colors:
        hue, sat, light = hex_to_hue_saturation(hex_val)
        # Saturated colors in 255-320 range are purple/violet/lavender
        # Low saturation (< 0.12) or extreme lightness/darkness is warm gray/white/black
        is_purple = (255.0 <= hue <= 320.0) and (sat > 0.12) and (0.05 < light < 0.96)
        assert not is_purple, (
            f"Forbidden purple/violet hue found in styles.css: {hex_val} (hue={hue:.1f}°, sat={sat:.2f}, light={light:.2f})"
        )


# ---------------------------------------------------------------------
# 7. Design Direction: No Gradients, Minimal Radii, No Badges/Pills
# ---------------------------------------------------------------------
def test_css_contains_no_gradients():
    """Verify styles.css contains no linear, radial, or conic gradient functions."""
    css_path = STATIC_DIR / "styles.css"
    css_content = css_path.read_text(encoding="utf-8")
    assert "gradient(" not in css_content.lower(), "Found forbidden gradient in styles.css"


def test_css_border_radius_limits():
    """Verify styles.css border-radius declarations never exceed 4px (except 50% for circles)."""
    css_path = STATIC_DIR / "styles.css"
    css_content = css_path.read_text(encoding="utf-8")

    # Check custom properties
    custom_props = re.findall(r"--radius-[a-z]+:\s*([^;]+);", css_content)
    for prop_val in custom_props:
        val_clean = prop_val.strip()
        if val_clean.endswith("px"):
            px = float(val_clean.replace("px", ""))
            assert px <= 4.0, f"Custom property border-radius exceeds 4px: {val_clean}"

    # Check inline border-radius declarations
    radius_decls = re.findall(r"border(?:-[a-z]+)*-radius\s*:\s*([^;]+);", css_content)
    for decl in radius_decls:
        decl_clean = decl.strip()
        # Allow variables or 50%
        if decl_clean.startswith("var(") or decl_clean == "50%":
            continue
        if decl_clean.endswith("px"):
            px = float(decl_clean.replace("px", ""))
            assert px <= 4.0, f"border-radius exceeds 4px limit: {decl_clean}"


def test_js_contains_no_badge_or_pill_class_names():
    """Verify no JS file applies or contains class names matching 'badge' or 'pill'."""
    all_js_files = list(STATIC_DIR.glob("**/*.js"))

    # Regex matching class assignments or strings with badge or pill as class name
    class_pattern = re.compile(
        r"""(?:\bclass(?:Name)?\s*[:=]\s*["'][^"']*\b(badge|pill)\b[^"']*["'])|(?:["'][^"']*\b(badge|pill)\b[^"']*["'])""",
        re.IGNORECASE,
    )

    for js_path in all_js_files:
        code = js_path.read_text(encoding="utf-8")
        for idx, line in enumerate(code.splitlines(), 1):
            line_strip = line.strip()
            # Ignore comments
            if (
                line_strip.startswith("//")
                or line_strip.startswith("*")
                or line_strip.startswith("/*")
            ):
                continue
            # Check for badge or pill in active code
            match = class_pattern.search(line_strip)
            assert match is None, (
                f"Forbidden badge/pill class name found in {js_path.name}:{idx} -> {line_strip}"
            )


# ---------------------------------------------------------------------
# 8. Full-Window Landing Hero Constraints & Header Separation
# ---------------------------------------------------------------------
def test_landing_hero_viewport_and_css_rules():
    """Verify .landing-hero styling satisfies full-window layout constraints without fixed heights."""
    css_path = STATIC_DIR / "styles.css"
    css_content = css_path.read_text(encoding="utf-8")

    # Locate the .landing-hero block
    hero_block_match = re.search(r"\.landing-hero\s*\{([^}]+)\}", css_content)
    assert hero_block_match is not None, "Could not find .landing-hero rule in styles.css"
    hero_block = hero_block_match.group(1)

    # 1. Must use min-height with modern viewport units and header offset to prevent clipping
    assert "min-height: calc(100vh - var(--header-h));" in hero_block, (
        "Expected min-height: calc(100vh - var(--header-h)) on .landing-hero"
    )
    assert "min-height: calc(100svh - var(--header-h));" in hero_block, (
        "Expected min-height: calc(100svh - var(--header-h)) on .landing-hero"
    )
    assert "min-height: calc(100dvh - var(--header-h));" in hero_block, (
        "Expected min-height: calc(100dvh - var(--header-h)) on .landing-hero"
    )

    # 2. Must use isolation and overflow hidden so seal never escapes
    assert "isolation: isolate;" in hero_block, "Expected isolation: isolate on .landing-hero"
    assert "overflow: hidden;" in hero_block, "Expected overflow: hidden on .landing-hero"

    # 3. Must not use fixed height: 100vh on .landing-hero (to avoid content truncation on small screens/zoom)
    height_match = re.search(r"(?<!min-)(?<!max-)\bheight\s*:\s*100[s|d]?vh", hero_block)
    assert height_match is None, (
        f"Found forbidden fixed height in .landing-hero: {height_match.group(0)}"
    )

    # 4. Seal generator must use createElementNS with standard SVG namespace
    seal_path = STATIC_DIR / "js" / "lib" / "seal.js"
    assert seal_path.exists(), "seal.js missing in static/js/lib/"
    seal_code = seal_path.read_text(encoding="utf-8")
    assert "createElementNS(" in seal_code and "http://www.w3.org/2000/svg" in seal_code, (
        "seal.js must construct SVG nodes using document.createElementNS with SVG namespace"
    )


def test_opaque_header_and_page_shell_tokens():
    """Verify header is solid opaque paper-colour token background and shared container rules."""
    css_path = STATIC_DIR / "styles.css"
    css_content = css_path.read_text(encoding="utf-8")

    # Header must be opaque paper color
    header_match = re.search(r"\.app-header\s*\{([^}]+)\}", css_content)
    assert header_match is not None, "Could not find .app-header rule in styles.css"
    assert "var(--color-paper)" in header_match.group(1), (
        "Expected .app-header background-color: var(--color-paper)"
    )

    # Header must never be transparent on landing
    assert "body.is-landing-route .app-header:not(.is-scrolled)" not in css_content, (
        "Found forbidden transparent header override on landing route"
    )


def test_no_statutory_or_regional_market_data_in_static():
    """Verify neither 'statutory' nor 'regional market data' appears anywhere in static/."""
    for file_path in STATIC_DIR.rglob("*"):
        if file_path.suffix in [".html", ".css", ".js"]:
            content = file_path.read_text(encoding="utf-8").lower()
            assert "statutory" not in content, f"Found forbidden 'statutory' in {file_path.name}"
            assert "regional market data" not in content, (
                f"Found forbidden 'regional market data' in {file_path.name}"
            )


def test_node_test_suites_pass():
    """Run all Node.js unit tests and verify zero failures."""
    import shutil
    import subprocess

    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js binary not available in environment")

    test_files = [
        BASE_DIR / "tests" / "js" / "test_ics_router.mjs",
        BASE_DIR / "tests" / "js" / "test_seal.mjs",
        BASE_DIR / "tests" / "js" / "test_lifecycle.mjs",
    ]

    for tf in test_files:
        assert tf.exists(), f"Test file {tf.name} missing"
        res = subprocess.run([node_bin, str(tf)], capture_output=True, text=True)
        assert res.returncode == 0, (
            f"Node test suite {tf.name} failed:\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
        )
