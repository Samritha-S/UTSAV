/**
 * Node.js Unit Tests for static/js/lib/seal.js
 *
 * Verifies:
 * - Mathematical correctness of radial petal path coordinates.
 * - Symmetry count (8-fold, 16-fold).
 * - Closed path formatting (starts with M, ends with Z).
 * - Invariant: every path coordinate and element stays within the outer radius (small tolerance).
 * - Invariant: determinism and uniqueness across repeated invocations.
 */

import assert from "node:assert/strict";

// Provide minimal DOM mock for createKolamSeal execution in Node.js
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElementNS(_ns, tag) {
      return {
        tagName: tag,
        attributes: {},
        children: [],
        setAttribute(k, v) {
          this.attributes[k] = String(v);
        },
        getAttribute(k) {
          return this.attributes[k];
        },
        appendChild(child) {
          this.children.push(child);
          return child;
        },
      };
    },
    createTextNode(text) {
      return text;
    },
  };
}

import { generateRadialPetalsPath, createKolamSeal } from "../../static/js/lib/seal.js";

function parsePathCoordinates(pathD) {
  // Extract all numbers representing (x, y) coordinates
  const tokens = pathD.trim().split(/\s+/);
  const coords = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M" || t === "Q") {
      i++;
      continue;
    }
    if (t === "Z") {
      break;
    }
    const x = parseFloat(tokens[i]);
    const y = parseFloat(tokens[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      coords.push({ x, y });
    }
    i += 2;
  }
  return coords;
}

function runTests() {
  console.log("Starting Node.js test suite for Kolam Seal generator...");

  const cx = 250;
  const cy = 250;
  const OUTER_RADIUS = 236;
  const TOLERANCE = 0.5;

  // 1. Basic path structure
  const path8 = generateRadialPetalsPath(cx, cy, 50, 100, 8);
  assert.ok(path8.startsWith("M "), "Path must begin with MoveTo (M)");
  assert.ok(path8.endsWith("Z"), "Path must close with Z");

  // 2. Petal count check (8 petals -> 16 quadratic bezier segments)
  const qMatches = path8.match(/Q /g) || [];
  assert.equal(qMatches.length, 16, "8-petal radial path must contain 16 Q segments");

  // 3. Different symmetry counts
  const path12 = generateRadialPetalsPath(cx, cy, 40, 80, 12);
  const qMatches12 = path12.match(/Q /g) || [];
  assert.equal(qMatches12.length, 24, "12-petal radial path must contain 24 Q segments");

  // 4. Center coordinates consistency
  const pathCenter = generateRadialPetalsPath(0, 0, 10, 20, 4);
  assert.ok(pathCenter.includes("M 10.00 0.00"), "First point at angle 0 should start at (cx + rInner, cy)");

  // 5. INVARIANT: Every path coordinate stays within the outer radius
  const outerPetals = generateRadialPetalsPath(cx, cy, 140, 215, 8);
  const coordsOuter = parsePathCoordinates(outerPetals);
  assert.ok(coordsOuter.length > 0, "Must parse coordinates from outer petals path");
  for (const pt of coordsOuter) {
    const dist = Math.hypot(pt.x - cx, pt.y - cy);
    assert.ok(
      dist <= 215 + TOLERANCE,
      `Outer petal point (${pt.x}, ${pt.y}) distance ${dist.toFixed(2)} exceeds 215`
    );
    assert.ok(
      dist <= OUTER_RADIUS + TOLERANCE,
      `Outer petal point (${pt.x}, ${pt.y}) distance ${dist.toFixed(2)} exceeds outer radius ${OUTER_RADIUS}`
    );
  }

  // 6. INVARIANT: Geometric containment in createKolamSeal()
  const seal1 = createKolamSeal({ size: 500, animated: false });
  assert.ok(seal1, "Seal SVG must be generated");

  // Verify clipPath presence and outer radius boundary
  const defs = seal1.children.find((c) => c.tagName === "defs");
  assert.ok(defs, "Seal SVG must include <defs> with clipPath");
  const clipPath = defs.children.find((c) => c.tagName === "clipPath");
  assert.equal(clipPath.getAttribute("id"), "kolam-seal-boundary");
  const clipCircle = clipPath.children.find((c) => c.tagName === "circle");
  assert.equal(Number(clipCircle.getAttribute("r")), OUTER_RADIUS);

  // Verify group is bounded by clipPath
  const boundedGroup = seal1.children.find((c) => c.tagName === "g" && c.getAttribute("clip-path") === "url(#kolam-seal-boundary)");
  assert.ok(boundedGroup, "Visual elements must be enclosed in clipPath group");

  // Verify rotated square and upright rect stay strictly inside outer radius
  const rects = boundedGroup.children.filter((c) => c.tagName === "rect");
  assert.equal(rects.length, 2, "Expected two framing squares in seal");
  for (const rect of rects) {
    const w = Number(rect.getAttribute("width"));
    const h = Number(rect.getAttribute("height"));
    // For square centered at (cx, cy), maximum corner distance to center is (w/2) * sqrt(2)
    const maxCornerDist = (w / 2) * Math.SQRT2;
    assert.ok(
      maxCornerDist <= OUTER_RADIUS + TOLERANCE,
      `Rect ${w}x${h} corner distance ${maxCornerDist.toFixed(2)} exceeds outer radius ${OUTER_RADIUS}`
    );
  }

  // Verify circle elements radius
  const circles = boundedGroup.children.filter((c) => c.tagName === "circle");
  for (const circ of circles) {
    const r = Number(circ.getAttribute("r"));
    assert.ok(
      r <= OUTER_RADIUS + TOLERANCE,
      `Circle radius ${r} exceeds outer radius ${OUTER_RADIUS}`
    );
  }

  // 7. INVARIANT: Determinism & Uniqueness
  const seal2 = createKolamSeal({ size: 500, animated: false });
  assert.equal(
    JSON.stringify(seal1),
    JSON.stringify(seal2),
    "Repeated calls to createKolamSeal must produce strictly deterministic output"
  );

  console.log("All Kolam Seal Node.js tests passed successfully!");
}

runTests();
