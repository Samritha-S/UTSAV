/**
 * Utsav Planner - Main Application Entry Point
 *
 * Coordinates state, event listeners, form validation, keyboard tab navigation,
 * and reactive rendering.
 *
 * STRICT SECURITY:
 * - Loaded as ES Module (<script type="module" src="/static/app.js">)
 * - Zero inline scripts, zero inline styles.
 * - No innerHTML, outerHTML, insertAdjacentHTML, document.write, or eval anywhere.
 */

import { formatINR, formatINRWords, getOffsetDateString, SAMPLE_PRESETS } from "./js/utils.js";
import { store } from "./js/state.js";
import { createPlan } from "./js/api.js";
import { renderDashboard } from "./js/render.js";

// DOM Element References
let formEl;
let budgetInputEl;
let budgetPreviewEl;
let themeNotesEl;
let themeNotesCounterEl;
let ageGroupContainerEl;
let sampleBtnEl;
let submitBtnEl;
let loadingEl;
let errorBannerEl;
let resultsContainerEl;

/**
 * Initialize application upon DOM readiness.
 */
document.addEventListener("DOMContentLoaded", () => {
  initElementReferences();
  initFormListeners();
  initTabKeyboardListeners();
  initGlobalErrorBanner();

  // Subscribe rendering pipeline to state changes
  store.subscribe(handleStateChange);

  // Initial state synchronization from storage
  const initial = store.getState();
  hydrateFormFromState(initial.formInputs);
  handleStateChange(initial);
});

/**
 * Cache primary DOM references.
 */
function initElementReferences() {
  formEl = document.getElementById("intake-form");
  budgetInputEl = document.getElementById("budget-inr");
  budgetPreviewEl = document.getElementById("budget-preview");
  themeNotesEl = document.getElementById("theme-notes");
  themeNotesCounterEl = document.getElementById("notes-counter");
  ageGroupContainerEl = document.getElementById("age-group-container");
  sampleBtnEl = document.getElementById("sample-plan-btn");
  submitBtnEl = document.getElementById("submit-plan-btn");
  loadingEl = document.getElementById("loading-indicator");
  errorBannerEl = document.getElementById("global-error");
  resultsContainerEl = document.getElementById("results-container");
}

/**
 * Bind form listeners: input validation, character counters, sample presets, and submission.
 */
function initFormListeners() {
  if (!formEl) return;

  // 1. Live Budget Preview
  if (budgetInputEl && budgetPreviewEl) {
    const updatePreview = () => {
      const val = parseInt(budgetInputEl.value, 10);
      if (!isNaN(val) && val > 0) {
        budgetPreviewEl.textContent = `${formatINR(val)} ${formatINRWords(val)}`;
      } else {
        budgetPreviewEl.textContent = "₹0";
      }
    };
    budgetInputEl.addEventListener("input", updatePreview);
    updatePreview();
  }

  // 2. Theme Notes Character Counter
  if (themeNotesEl && themeNotesCounterEl) {
    const updateCounter = () => {
      themeNotesCounterEl.textContent = `${themeNotesEl.value.length} / 400`;
    };
    themeNotesEl.addEventListener("input", updateCounter);
    updateCounter();
  }

  // 3. Event Type change: conditionally disclose Age Group for birthdays
  const typeRadios = formEl.querySelectorAll('input[name="event_type"]');
  typeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      toggleAgeGroupVisibility(e.target.value === "birthday");
    });
  });

  // 4. "Try a sample plan" Demo Button
  if (sampleBtnEl) {
    sampleBtnEl.addEventListener("click", () => {
      const selectedType = formEl.querySelector('input[name="event_type"]:checked')?.value || "wedding";
      const preset = SAMPLE_PRESETS[selectedType] || SAMPLE_PRESETS.wedding;
      hydrateFormFromState(preset);
      clearAllFieldErrors();
    });
  }

  // 5. Form Submit Handler
  formEl.addEventListener("submit", handleFormSubmit);
}

/**
 * Show or hide the birthday-specific age group selector.
 * @param {boolean} isBirthday
 */
function toggleAgeGroupVisibility(isBirthday) {
  if (!ageGroupContainerEl) return;
  if (isBirthday) {
    ageGroupContainerEl.classList.remove("is-hidden");
  } else {
    ageGroupContainerEl.classList.add("is-hidden");
    const ageSelect = document.getElementById("age-group");
    if (ageSelect) ageSelect.value = "";
  }
}

/**
 * Handle intake form submission with strict inline validation and focus management.
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  clearAllFieldErrors();
  hideGlobalError();

  const values = readFormValues();
  const errors = validateFormValues(values);

  if (Object.keys(errors).length > 0) {
    displayFieldErrors(errors);
    // Accessibility: Focus the first invalid field
    const firstInvalidKey = Object.keys(errors)[0];
    const firstInvalidEl = getFieldElementByKey(firstInvalidKey);
    if (firstInvalidEl && typeof firstInvalidEl.focus === "function") {
      firstInvalidEl.focus();
    }
    return;
  }

  // Store form inputs in state
  store.updateFormInputs(values);
  store.setLoading(true);

  try {
    const plan = await createPlan(values);
    store.setPlan(plan);

    // Accessibility: shift focus to results summary heading
    setTimeout(() => {
      const summaryHeading = document.getElementById("plan-summary-heading");
      if (summaryHeading) {
        summaryHeading.setAttribute("tabindex", "-1");
        summaryHeading.focus();
      }
    }, 100);
  } catch (err) {
    store.setError(err);
    showGlobalError(err);
  }
}

/**
 * Extract values from intake form fields into API payload format.
 * @returns {Object}
 */
function readFormValues() {
  const selectedType = formEl.querySelector('input[name="event_type"]:checked')?.value || "wedding";
  const dateVal = document.getElementById("event-date")?.value || "";
  const guestsVal = parseInt(document.getElementById("guest-count")?.value, 10);
  const budgetVal = parseInt(document.getElementById("budget-inr")?.value, 10);
  const cityVal = (document.getElementById("city")?.value || "").trim();
  const tierVal = document.getElementById("city-tier")?.value || "metro";
  const venueVal = document.getElementById("venue-setting")?.value || "indoor";
  const ageVal = document.getElementById("age-group")?.value || null;
  const notesVal = (document.getElementById("theme-notes")?.value || "").trim();

  // Dietary preferences checkboxes
  const dietEls = formEl.querySelectorAll('input[name="dietary"]:checked');
  const diets = Array.from(dietEls).map((el) => el.value);

  const payload = {
    event_type: selectedType,
    event_date: dateVal,
    guest_count: isNaN(guestsVal) ? 0 : guestsVal,
    budget_inr: isNaN(budgetVal) ? 0 : budgetVal,
    city: cityVal,
    city_tier: tierVal,
    venue_setting: venueVal,
    dietary_preferences: diets.length > 0 ? diets : ["vegetarian"],
    theme_notes: notesVal,
  };

  if (selectedType === "birthday" && ageVal) {
    payload.age_group = ageVal;
  }

  return payload;
}

/**
 * Client-side inline form validation matching backend rules.
 * @param {Object} values
 * @returns {Object<string, string>} Map of field key to error message
 */
function validateFormValues(values) {
  const errors = {};

  // Event Date
  if (!values.event_date) {
    errors.event_date = "Please select an event date.";
  } else {
    const selectedDate = new Date(values.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      errors.event_date = "Event date cannot be in the past.";
    }
  }

  // Guest Count (10 to 5,000)
  if (!values.guest_count || values.guest_count < 10 || values.guest_count > 5000) {
    errors.guest_count = "Guest count must be between 10 and 5,000 attendees.";
  }

  // Budget INR (10,000 to 100,000,000)
  if (!values.budget_inr || values.budget_inr < 10000 || values.budget_inr > 100000000) {
    errors.budget_inr = "Total budget must be between ₹10,000 and ₹10,00,00,000 (10 Cr).";
  }

  // City (2 to 50 chars)
  if (!values.city || values.city.length < 2 || values.city.length > 50) {
    errors.city = "City name must be between 2 and 50 characters.";
  }

  // Theme notes max 400
  if (values.theme_notes && values.theme_notes.length > 400) {
    errors.theme_notes = "Theme notes must not exceed 400 characters.";
  }

  return errors;
}

/**
 * Display inline field validation errors and set aria-invalid.
 * @param {Object<string, string>} errors
 */
function displayFieldErrors(errors) {
  for (const [key, msg] of Object.entries(errors)) {
    const fieldEl = getFieldElementByKey(key);
    const errorEl = getErrorElementByKey(key);
    if (fieldEl) {
      fieldEl.setAttribute("aria-invalid", "true");
      fieldEl.classList.add("input-error");
    }
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove("is-hidden");
    }
  }
}

/**
 * Clear all inline field validation states.
 */
function clearAllFieldErrors() {
  const errorEls = formEl.querySelectorAll(".field-error");
  errorEls.forEach((el) => {
    el.textContent = "";
    el.classList.add("is-hidden");
  });

  const inputEls = formEl.querySelectorAll(".input-error");
  inputEls.forEach((el) => {
    el.removeAttribute("aria-invalid");
    el.classList.remove("input-error");
  });
}

function getFieldElementByKey(key) {
  const map = {
    event_date: "event-date",
    guest_count: "guest-count",
    budget_inr: "budget-inr",
    city: "city",
    city_tier: "city-tier",
    venue_setting: "venue-setting",
    theme_notes: "theme-notes",
    age_group: "age-group",
  };
  return document.getElementById(map[key] || key);
}

function getErrorElementByKey(key) {
  const map = {
    event_date: "date-error",
    guest_count: "guest-error",
    budget_inr: "budget-error",
    city: "city-error",
    city_tier: "tier-error",
    venue_setting: "venue-error",
    theme_notes: "notes-error",
    age_group: "age-error",
  };
  return document.getElementById(map[key]);
}

/**
 * Populate form inputs from a state or preset object.
 * @param {Object} inputs
 */
function hydrateFormFromState(inputs) {
  if (!inputs || !formEl) return;

  if (inputs.event_type) {
    const radio = formEl.querySelector(`input[name="event_type"][value="${inputs.event_type}"]`);
    if (radio) radio.checked = true;
    toggleAgeGroupVisibility(inputs.event_type === "birthday");
  }

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };

  setVal("event-date", inputs.event_date || getOffsetDateString(60));
  setVal("guest-count", inputs.guest_count || 100);
  setVal("budget-inr", inputs.budget_inr || 1000000);
  setVal("city", inputs.city || "Jaipur");
  setVal("city-tier", inputs.city_tier || "tier2");
  setVal("venue-setting", inputs.venue_setting || "indoor");
  setVal("age-group", inputs.age_group || "");
  setVal("theme-notes", inputs.theme_notes || "");

  // Dietary checkboxes
  const diets = inputs.dietary_preferences || ["vegetarian"];
  formEl.querySelectorAll('input[name="dietary"]').forEach((chk) => {
    chk.checked = diets.includes(chk.value);
  });

  // Trigger live updates
  if (budgetInputEl) budgetInputEl.dispatchEvent(new Event("input"));
  if (themeNotesEl) themeNotesEl.dispatchEvent(new Event("input"));
}

/**
 * Display global error banner with retry action.
 * @param {Error|ApiError} err
 */
function showGlobalError(err) {
  if (!errorBannerEl) return;

  while (errorBannerEl.firstChild) {
    errorBannerEl.removeChild(errorBannerEl.firstChild);
  }

  const msgText = err.userMessage || err.message || "An unexpected error occurred.";
  const iconSpan = document.createElement("span");
  iconSpan.textContent = "⚠️ ";
  errorBannerEl.appendChild(iconSpan);

  const textSpan = document.createElement("span");
  textSpan.textContent = msgText;
  errorBannerEl.appendChild(textSpan);

  // If retryable, add a retry button
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "btn btn-outline btn-sm";
  retryBtn.textContent = "Try again";
  retryBtn.addEventListener("click", () => {
    hideGlobalError();
    if (formEl) formEl.dispatchEvent(new Event("submit", { cancelable: true }));
  });
  errorBannerEl.appendChild(retryBtn);

  errorBannerEl.classList.remove("is-hidden");
  errorBannerEl.focus();
}

function hideGlobalError() {
  if (!errorBannerEl) return;
  errorBannerEl.classList.add("is-hidden");
  while (errorBannerEl.firstChild) {
    errorBannerEl.removeChild(errorBannerEl.firstChild);
  }
}

/**
 * WAI-ARIA Tabs Keyboard Navigation Handler.
 * Supports Left/Right arrow keys, Home, End, and roving tabindex.
 */
function initTabKeyboardListeners() {
  document.addEventListener("keydown", (e) => {
    const activeTab = document.activeElement;
    if (!activeTab || activeTab.getAttribute("role") !== "tab") return;

    const tablist = activeTab.closest('[role="tablist"]');
    if (!tablist) return;

    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const index = tabs.indexOf(activeTab);
    if (index === -1) return;

    let targetIndex = -1;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex = index === 0 ? tabs.length - 1 : index - 1;
        break;
      case "ArrowRight":
      case "ArrowDown":
        targetIndex = index === tabs.length - 1 ? 0 : index + 1;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetTab = tabs[targetIndex];
      targetTab.focus();
      store.setActiveTab(targetTab.id);
    }
  });
}

/**
 * Reactive state update coordinator.
 * @param {Object} state
 */
function handleStateChange(state) {
  // 1. Loading UI
  if (loadingEl) {
    if (state.loading) {
      loadingEl.classList.remove("is-hidden");
    } else {
      loadingEl.classList.add("is-hidden");
    }
  }

  // 2. Submit Button state
  if (submitBtnEl) {
    submitBtnEl.disabled = state.loading;
    submitBtnEl.textContent = state.loading ? "Synthesizing Event Plan..." : "Generate Event Plan";
  }

  // 3. Render Results Dashboard
  if (resultsContainerEl) {
    if (state.currentPlan) {
      resultsContainerEl.classList.remove("is-hidden");
      renderDashboard(resultsContainerEl, state.currentPlan, state.activeTab, state.checkedItems);
    } else {
      resultsContainerEl.classList.add("is-hidden");
      while (resultsContainerEl.firstChild) {
        resultsContainerEl.removeChild(resultsContainerEl.firstChild);
      }
    }
  }
}

function initGlobalErrorBanner() {
  if (errorBannerEl) {
    errorBannerEl.setAttribute("tabindex", "-1");
  }
}
