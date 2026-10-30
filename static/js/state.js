/**
 * Utsav Planner - Central Reactive State Store
 *
 * Coordinates application state, manages subscribers for UI re-rendering,
 * and synchronizes state updates with localStorage.
 */

import { clearPlanState, loadPlanState, savePlanState } from "./storage.js";

class Store {
  constructor() {
    this.listeners = new Set();

    // Hydrate state from localStorage or use defaults
    const saved = loadPlanState();
    this.state = {
      formInputs: saved?.formInputs || {
        event_type: "wedding",
        event_date: "",
        guest_count: 200,
        budget_inr: 1500000,
        city: "Jaipur",
        city_tier: "tier2",
        venue_setting: "indoor",
        dietary_preferences: ["vegetarian"],
        age_group: "",
        theme_notes: "",
      },
      currentPlan: saved?.currentPlan || null,
      checkedItems: saved?.checkedItems || new Set(),
      activeTab: saved?.activeTab || "tab-budget",
      loading: false,
      error: null,
      refineLoading: false,
      refineError: null,
    };
  }

  /**
   * Subscribe a listener function to state changes.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all registered listeners and persist state to localStorage.
   */
  notify() {
    // Persist current state snapshot
    savePlanState({
      formInputs: this.state.formInputs,
      currentPlan: this.state.currentPlan,
      checkedItems: this.state.checkedItems,
      activeTab: this.state.activeTab,
    });

    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error("State listener error:", err);
      }
    }
  }

  /**
   * Get current state snapshot.
   */
  getState() {
    return this.state;
  }

  /**
   * Update form input fields.
   * @param {Object} partialInputs
   */
  updateFormInputs(partialInputs) {
    this.state.formInputs = { ...this.state.formInputs, ...partialInputs };
    this.notify();
  }

  /**
   * Set loading state during plan generation.
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    this.state.loading = isLoading;
    if (isLoading) {
      this.state.error = null;
    }
    this.notify();
  }

  /**
   * Set error during plan generation.
   * @param {Error|null} error
   */
  setError(error) {
    this.state.error = error;
    this.state.loading = false;
    this.notify();
  }

  /**
   * Store new plan response and reset checklist checkboxes if new plan.
   * @param {Object} plan - PlanResponse
   */
  setPlan(plan) {
    this.state.currentPlan = plan;
    this.state.loading = false;
    this.state.error = null;
    this.state.checkedItems = new Set();
    this.state.activeTab = "tab-budget";
    this.notify();
  }

  /**
   * Set active dashboard tab.
   * @param {string} tabId - e.g. 'tab-budget', 'tab-timeline', 'tab-checklist', 'tab-ideas'
   */
  setActiveTab(tabId) {
    this.state.activeTab = tabId;
    this.notify();
  }

  /**
   * Toggle a checklist item's completion status.
   * @param {string} itemId
   */
  toggleChecklistItem(itemId) {
    if (this.state.checkedItems.has(itemId)) {
      this.state.checkedItems.delete(itemId);
    } else {
      this.state.checkedItems.add(itemId);
    }
    // Re-create set reference to ensure reactivity
    this.state.checkedItems = new Set(this.state.checkedItems);
    this.notify();
  }

  /**
   * Set loading state for creative ideas refinement.
   * @param {boolean} isRefining
   */
  setRefineLoading(isRefining) {
    this.state.refineLoading = isRefining;
    if (isRefining) {
      this.state.refineError = null;
    }
    this.notify();
  }

  /**
   * Set error during ideas refinement.
   * @param {Error|null} error
   */
  setRefineError(error) {
    this.state.refineError = error;
    this.state.refineLoading = false;
    this.notify();
  }

  /**
   * Update only the ideas section of the current plan.
   * @param {Object} updatedIdeas - CreativeIdeas
   */
  updateIdeas(updatedIdeas) {
    if (this.state.currentPlan) {
      this.state.currentPlan.ideas = updatedIdeas;
    }
    this.state.refineLoading = false;
    this.state.refineError = null;
    this.notify();
  }

  /**
   * Reset all planner state and wipe localStorage.
   */
  reset() {
    clearPlanState();
    this.state.currentPlan = null;
    this.state.checkedItems = new Set();
    this.state.activeTab = "tab-budget";
    this.state.loading = false;
    this.state.error = null;
    this.state.refineLoading = false;
    this.state.refineError = null;
    this.notify();
  }
}

export const store = new Store();
