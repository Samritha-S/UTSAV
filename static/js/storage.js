/**
 * Utsav Planner - LocalStorage Persistence Module
 *
 * Persists user form inputs, generated plan, checked checklist items,
 * and active tab state across page reloads.
 *
 * Features:
 * - Versioned schema (`utsav_v1`) to discard outdated/incompatible structures.
 * - Defensive try/catch wrapping around all localStorage access to gracefully
 *   tolerate private browsing modes, quota limits, or disabled storage.
 */

export const STORAGE_KEY = "utsav_planner_state";
export const SCHEMA_VERSION = "utsav_v1";

/**
 * Save application state to localStorage.
 * @param {Object} state
 * @param {Object} state.formInputs
 * @param {Object|null} state.currentPlan
 * @param {Array<string>} state.checkedItems
 * @param {string} state.activeTab
 * @returns {boolean} Success indicator
 */
export function savePlanState(state) {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    const payload = {
      version: SCHEMA_VERSION,
      timestamp: Date.now(),
      formInputs: state.formInputs || {},
      currentPlan: state.currentPlan || null,
      checkedItems: Array.from(state.checkedItems || []),
      activeTab: state.activeTab || "tab-budget",
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn("Utsav Planner: Could not save state to localStorage", err);
    return false;
  }
}

/**
 * Load persisted application state from localStorage.
 * @returns {Object|null} State object if valid, null otherwise
 */
export function loadPlanState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || data.version !== SCHEMA_VERSION) {
      // Discard stale or mismatched schema version
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      formInputs: data.formInputs || {},
      currentPlan: data.currentPlan || null,
      checkedItems: new Set(Array.isArray(data.checkedItems) ? data.checkedItems : []),
      activeTab: data.activeTab || "tab-budget",
    };
  } catch (err) {
    console.warn("Utsav Planner: Could not load state from localStorage", err);
    return null;
  }
}

/**
 * Remove all persisted state from localStorage.
 * @returns {boolean}
 */
export function clearPlanState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn("Utsav Planner: Could not clear localStorage", err);
    return false;
  }
}
