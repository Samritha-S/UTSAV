/**
 * Node.js Unit Tests for static/js/lib/seal.js
 *
 * Verifies:
 * - Mathematical correctness of radial petal path coordinates.
 * - Symmetry count (8-fold, 16-fold).
 * - Closed path formatting (starts with M, ends with Z).
 */

import assert from "node:assert/strict";
import { generateRadialPetalsPath } from "../../static/js/lib/seal.js";

function runTests() {
  console.log("Starting Node.js test suite for Kolam Seal generator...");

  // 1. Basic path structure
  const path8 = generateRadialPetalsPath(250, 250, 50, 100, 8);
  assert.ok(path8.startsWith("M "), "Path must begin with MoveTo (M)");
  assert.ok(path8.endsWith("Z"), "Path must close with Z");

  // 2. Petal count check (8 petals -> 16 quadratic bezier segments)
  const qMatches = path8.match(/Q /g) || [];
  assert.equal(qMatches.length, 16, "8-petal radial path must contain 16 Q segments");

  // 3. Different symmetry counts
  const path12 = generateRadialPetalsPath(250, 250, 40, 80, 12);
  const qMatches12 = path12.match(/Q /g) || [];
  assert.equal(qMatches12.length, 24, "12-petal radial path must contain 24 Q segments");

  // 4. Center coordinates consistency
  const pathCenter = generateRadialPetalsPath(0, 0, 10, 20, 4);
  assert.ok(pathCenter.includes("M 10.00 0.00"), "First point at angle 0 should start at (cx + rInner, cy)");

  console.log("All Kolam Seal Node.js tests passed successfully!");
}

runTests();
