/**
 * Utsav Planner - Slider Range & Numeric Normalization Utilities
 *
 * Pure helpers for What-If scenario sliders:
 * - Dynamic slider bounds centered around the saved plan (50% to 150%)
 * - Sensible step resolution based on Indian rupee bands
 * - Indian number formatting for aria-valuetext (guests, lakh, crore)
 * - Tick mark percentage calculation
 *
 * STRICT SECURITY: Pure computation & string formatting functions. No DOM access.
 */

/** Minimum number of guests allowed for any event. */
export const ALLOWED_GUESTS_MIN = 5;

/** Maximum number of guests allowed for any event. */
export const ALLOWED_GUESTS_MAX = 5000;

/** Step increment size for the guest count slider. */
export const GUESTS_STEP = 5;

/** Minimum budget allowed in INR (₹5,000). */
export const ALLOWED_BUDGET_MIN = 5000;

/** Maximum budget allowed in INR (₹10 Crore / 100,000,000). */
export const ALLOWED_BUDGET_MAX = 100000000; // 10 Crore

/**
 * Determine sensible step size for budget based on magnitude.
 * - Under 20 Lakh (< 2,000,000): 10,000 INR
 * - 20 Lakh to 1 Crore (2,000,000 to 10,000,000): 25,000 INR
 * - Above 1 Crore (> 10,000,000): 100,000 INR (1 Lakh)
 *
 * @param {number} budgetInr
 * @returns {number}
 */
export function getBudgetStep(budgetInr) {
  const val = Number(budgetInr) || 0;
  if (val < 2000000) {
    return 10000;
  }
  if (val <= 10000000) {
    return 25000;
  }
  return 100000;
}

/**
 * Compute dynamic slider min, max, step centered on saved plan value.
 * Range: [max(allowed_min, 50% of saved), min(allowed_max, 150% of saved)]
 * Aligned to nearest step so saved value is reachable and sits near the middle.
 *
 * @param {"guests" | "budget"} type
 * @param {number} savedValue
 * @returns {{ min: number, max: number, step: number, savedValue: number }}
 * @throws {Error} If an unsupported slider type is provided.
 */
export function computeSliderRange(type, savedValue) {
  const val = Math.max(1, Number(savedValue) || 1);

  if (type === "guests") {
    const step = GUESTS_STEP;
    const rawMin = Math.max(ALLOWED_GUESTS_MIN, Math.round(val * 0.5));
    const rawMax = Math.min(ALLOWED_GUESTS_MAX, Math.round(val * 1.5));

    let min = Math.floor(rawMin / step) * step;
    let max = Math.ceil(rawMax / step) * step;

    if (min < ALLOWED_GUESTS_MIN) min = ALLOWED_GUESTS_MIN;
    if (max > ALLOWED_GUESTS_MAX) max = ALLOWED_GUESTS_MAX;

    // Ensure min < val < max where possible
    if (min >= val) min = Math.max(ALLOWED_GUESTS_MIN, val - step * 2);
    if (max <= val) max = Math.min(ALLOWED_GUESTS_MAX, val + step * 2);

    return { min, max, step, savedValue: val };
  }

  if (type === "budget") {
    const step = getBudgetStep(val);
    const rawMin = Math.max(ALLOWED_BUDGET_MIN, Math.round(val * 0.5));
    const rawMax = Math.min(ALLOWED_BUDGET_MAX, Math.round(val * 1.5));

    let min = Math.floor(rawMin / step) * step;
    let max = Math.ceil(rawMax / step) * step;

    if (min < ALLOWED_BUDGET_MIN) min = ALLOWED_BUDGET_MIN;
    if (max > ALLOWED_BUDGET_MAX) max = ALLOWED_BUDGET_MAX;

    if (min >= val) min = Math.max(ALLOWED_BUDGET_MIN, val - step * 2);
    if (max <= val) max = Math.min(ALLOWED_BUDGET_MAX, val + step * 2);

    return { min, max, step, savedValue: val };
  }

  throw new Error(`Unsupported slider type: ${type}`);
}

/**
 * Calculate percentage offset for tick mark (0 to 100).
 *
 * @param {number} min
 * @param {number} max
 * @param {number} value
 * @returns {number}
 */
export function calculateTickPercentage(min, max, value) {
  if (max <= min) return 50;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

/**
 * Format aria-valuetext in readable Indian formats.
 * E.g. "250 guests", "18 lakh rupees", "1.5 crore rupees", "75 thousand rupees".
 *
 * @param {"guests" | "budget"} type
 * @param {number} value
 * @returns {string}
 */
export function formatIndianAriaValuetext(type, value) {
  const val = Math.round(Number(value) || 0);

  if (type === "guests") {
    return `${val.toLocaleString("en-IN")} guests`;
  }

  if (type === "budget") {
    if (val >= 10000000) {
      const cr = (val / 10000000).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
      return `${cr} crore rupees`;
    }
    if (val >= 100000) {
      const lakh = (val / 100000).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
      return `${lakh} lakh rupees`;
    }
    if (val >= 1000) {
      const k = (val / 1000).toFixed(1).replace(/\.0$/, "");
      return `${k} thousand rupees`;
    }
    return `${val} rupees`;
  }

  return String(value);
}
