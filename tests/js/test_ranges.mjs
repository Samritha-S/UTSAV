import assert from "node:assert/strict";
import {
  computeSliderRange,
  getBudgetStep,
  calculateTickPercentage,
  formatIndianAriaValuetext,
  ALLOWED_GUESTS_MIN,
  ALLOWED_GUESTS_MAX,
  ALLOWED_BUDGET_MIN,
  ALLOWED_BUDGET_MAX
} from "../../static/js/lib/ranges.js";

console.log("Starting tests for ranges.js...");

// 1. Step resolution tests
assert.equal(getBudgetStep(50000), 10000, "Under 20L step should be 10k");
assert.equal(getBudgetStep(1800000), 10000, "18L step should be 10k");
assert.equal(getBudgetStep(2000000), 25000, "20L step should be 25k");
assert.equal(getBudgetStep(5000000), 25000, "50L step should be 25k");
assert.equal(getBudgetStep(10000000), 25000, "1Cr step should be 25k");
assert.equal(getBudgetStep(15000000), 100000, "1.5Cr step should be 1L");

// 2. Guest slider range centered on saved value
const g200 = computeSliderRange("guests", 200);
assert.equal(g200.min, 100, "200 guests min = 100 (50%)");
assert.equal(g200.max, 300, "200 guests max = 300 (150%)");
assert.equal(g200.step, 5);
const g200Tick = calculateTickPercentage(g200.min, g200.max, 200);
assert.equal(g200Tick, 50, "Thumb position for 200 guests should be 50%");

// Edge case: near lower bound
const g10 = computeSliderRange("guests", 10);
assert(g10.min >= ALLOWED_GUESTS_MIN, "Min must not violate lower bound");
assert(g10.max <= ALLOWED_GUESTS_MAX, "Max must not violate upper bound");
assert(g10.min <= 10 && g10.max >= 10, "10 must be within [min, max]");

// Edge case: near upper bound
const g4500 = computeSliderRange("guests", 4500);
assert(g4500.max <= ALLOWED_GUESTS_MAX, "Max must be <= 5000");

// 3. Budget slider range centered on saved value
const b15L = computeSliderRange("budget", 1500000);
assert.equal(b15L.min, 750000, "15L min = 7.5L");
assert.equal(b15L.max, 2250000, "15L max = 22.5L");
assert.equal(b15L.step, 10000);
const b15LTick = calculateTickPercentage(b15L.min, b15L.max, 1500000);
assert.equal(b15LTick, 50, "Thumb position for 15L should be 50%");

// 4. Aria valuetext formatting
assert.equal(formatIndianAriaValuetext("guests", 250), "250 guests");
assert.equal(formatIndianAriaValuetext("budget", 1800000), "18 lakh rupees");
assert.equal(formatIndianAriaValuetext("budget", 15000000), "1.5 crore rupees");
assert.equal(formatIndianAriaValuetext("budget", 75000), "75 thousand rupees");
assert.equal(formatIndianAriaValuetext("budget", 500), "500 rupees");

console.log("All ranges.js tests passed successfully!");
