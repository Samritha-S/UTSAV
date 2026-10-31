/**
 * Utsav Planner - Guided 3-Step Intake Wizard View (#/plan)
 *
 * Coordinates:
 * - Step 1: What are you celebrating (Event type, Celebration date, City)
 * - Step 2: The guests and the money (Guest count, Total budget INR, City tier)
 * - Step 3: Preferences & details (Venue setting, Dietary, Age group for birthdays, Theme notes)
 *
 * Features:
 * - Plain text step indicators ("Step 1 of 3: What are you celebrating").
 * - Client-side validation per step with accessible error banners.
 * - Values preserved across navigation.
 * - Staged honest loading animation ("Working out budget...", "Building timeline...", "Asking for creative ideas...").
 * - On success, generates a new short event ID, persists to utsav_v3 storage, and routes to #/event/<id>.
 * - Zero emoji icons (plain text labels and inline SVG marks only).
 * - Complete ban on innerHTML/outerHTML/eval. Uses safe h().
 */

import { createPlan } from "../api.js";
import { saveNewEvent } from "../storage.js";
import {
  formatINR,
  formatINRWords,
  getOffsetDateString,
  h,
  createKolamMotif,
} from "../utils.js";
import { getPreselectedEventType } from "./landing.js";

export const planView = {
  activeStageTimer: null,
  currentStep: 1,
  formData: {
    event_type: "wedding",
    event_date: "",
    city: "Jaipur",
    guest_count: 200,
    budget_inr: 1500000,
    city_tier: "tier2",
    venue_setting: "indoor",
    dietary_preferences: ["vegetarian"],
    age_group: "",
    theme_notes: "",
  },

  mount(container, ctx) {
    ctx.setTitle("Plan an Event — Guided Intake");
    ctx.announce("Step 1 of 3: What are you celebrating. Please fill out event type, date and city.");

    // Check for preselected event type from landing door or session
    const preselected = getPreselectedEventType() || "wedding";
    this.formData.event_type = preselected;
    if (!this.formData.event_date) {
      this.formData.event_date = getOffsetDateString(60);
    }
    this.currentStep = 1;

    const view = h("div", { class: "intake-view-container" });

    // Header strip
    const header = h(
      "div",
      { class: "intake-masthead" },
      createKolamMotif("mark", 28, 28),
      h("h1", { class: "intake-headline", tabindex: "-1" }, "Event Intake & Requirements"),
      h(
        "p",
        { id: "step-indicator-text", class: "step-indicator-deck", "aria-live": "polite" },
        "Step 1 of 3: What are you celebrating"
      ),
      h(
        "div",
        { class: "intake-quick-actions" },
        h(
          "button",
          {
            type: "button",
            class: "btn btn-outline btn-sm",
            onclick: () => this.populateSamplePreset(),
          },
          "Try a sample plan"
        )
      )
    );
    view.appendChild(header);

    // Global Error Banner
    const globalError = h("div", {
      id: "intake-error-banner",
      class: "error-banner is-hidden",
      role: "alert",
      "aria-live": "assertive",
    });
    view.appendChild(globalError);

    // Form element
    const form = h("form", { id: "intake-form", novalidate: true });

    // -----------------------------------------------------------------
    // STEP 1: What are you celebrating
    // -----------------------------------------------------------------
    const step1 = h(
      "div",
      { id: "step-1-panel", class: "intake-step-panel" },
      h(
        "fieldset",
        { class: "form-fieldset" },
        h("legend", { class: "fieldset-legend" }, "Celebration Category"),
        h(
          "div",
          { class: "radio-cards-grid" },
          ...[
            { val: "wedding", label: "Wedding", desc: "Multi-day traditional celebration & ceremonies" },
            { val: "birthday", label: "Birthday", desc: "Milestone family celebration & party" },
            { val: "community", label: "Community", desc: "Festival, Utsav, or residential society mela" },
          ].map((item) => {
            const isChecked = this.formData.event_type === item.val;
            return h(
              "div",
              { class: "radio-card" },
              h("input", {
                type: "radio",
                id: `type-${item.val}`,
                name: "event_type",
                value: item.val,
                checked: isChecked,
                onchange: (e) => {
                  this.formData.event_type = e.target.value;
                  this.updateConditionalFields();
                },
              }),
              h(
                "label",
                { for: `type-${item.val}`, class: "radio-card-label" },
                h("span", { class: "radio-title" }, item.label),
                h("span", { class: "radio-desc" }, item.desc)
              )
            );
          })
        )
      ),

      // Date and City row
      h(
        "div",
        { class: "form-row form-row-2" },
        h(
          "div",
          { class: "form-group" },
          h("label", { for: "event-date", class: "form-label" }, "Event Date"),
          h("input", {
            type: "date",
            id: "event-date",
            name: "event_date",
            value: this.formData.event_date,
            required: true,
            class: "form-input",
            "aria-describedby": "date-hint date-error",
            oninput: (e) => {
              this.formData.event_date = e.target.value;
            },
          }),
          h("span", { id: "date-hint", class: "field-hint" }, "Target celebration day (must not be in the past)"),
          h("span", { id: "date-error", class: "field-error is-hidden", role: "alert" })
        ),
        h(
          "div",
          { class: "form-group" },
          h("label", { for: "city", class: "form-label" }, "City / Region"),
          h("input", {
            type: "text",
            id: "city",
            name: "city",
            value: this.formData.city,
            maxlength: "50",
            required: true,
            placeholder: "e.g. Jaipur, Pune, Bengaluru",
            class: "form-input",
            "aria-describedby": "city-hint city-error",
            oninput: (e) => {
              this.formData.city = e.target.value;
            },
          }),
          h("span", { id: "city-hint", class: "field-hint" }, "Location where vendor services will be contracted"),
          h("span", { id: "city-error", class: "field-error is-hidden", role: "alert" })
        )
      ),

      // Step 1 Actions
      h(
        "div",
        { class: "step-nav-actions" },
        h("span"),
        h(
          "button",
          {
            type: "button",
            id: "step-1-next-btn",
            class: "btn btn-primary",
            onclick: () => this.goToStep(2),
          },
          "Next: Guests & Budget &rarr;"
        )
      )
    );
    form.appendChild(step1);

    // -----------------------------------------------------------------
    // STEP 2: The guests and the money
    // -----------------------------------------------------------------
    const step2 = h(
      "div",
      { id: "step-2-panel", class: "intake-step-panel is-hidden" },
      h(
        "div",
        { class: "form-row form-row-2" },
        h(
          "div",
          { class: "form-group" },
          h("label", { for: "guest-count", class: "form-label" }, "Expected Guest Count"),
          h("input", {
            type: "number",
            id: "guest-count",
            name: "guest_count",
            min: "10",
            max: "5000",
            step: "1",
            value: String(this.formData.guest_count),
            required: true,
            class: "form-input",
            "aria-describedby": "guest-hint guest-error",
            oninput: (e) => {
              this.formData.guest_count = parseInt(e.target.value, 10) || 0;
              this.updateBudgetReaction();
            },
          }),
          h("span", { id: "guest-hint", class: "field-hint" }, "10 to 5,000 attendees"),
          h("span", { id: "guest-error", class: "field-error is-hidden", role: "alert" })
        ),
        h(
          "div",
          { class: "form-group" },
          h("label", { for: "budget-inr", class: "form-label" }, "Total Allocated Budget (INR)"),
          h("input", {
            type: "number",
            id: "budget-inr",
            name: "budget_inr",
            min: "10000",
            max: "100000000",
            step: "5000",
            value: String(this.formData.budget_inr),
            required: true,
            class: "form-input",
            "aria-describedby": "budget-preview-box budget-hint budget-error",
            oninput: (e) => {
              this.formData.budget_inr = parseInt(e.target.value, 10) || 0;
              this.updateBudgetReaction();
            },
          }),
          h(
            "div",
            { id: "budget-preview-box", class: "budget-reaction-box", "aria-live": "polite" },
            `${formatINR(this.formData.budget_inr)} ${formatINRWords(this.formData.budget_inr)}`
          ),
          h("span", { id: "budget-hint", class: "field-hint" }, "₹10,000 to ₹10 Crore"),
          h("span", { id: "budget-error", class: "field-error is-hidden", role: "alert" })
        )
      ),

      // City Cost Tier
      h(
        "div",
        { class: "form-group" },
        h("label", { for: "city-tier", class: "form-label" }, "City Cost Tier"),
        h(
          "select",
          {
            id: "city-tier",
            name: "city_tier",
            class: "form-select",
            "aria-describedby": "tier-hint tier-error",
            onchange: (e) => {
              this.formData.city_tier = e.target.value;
            },
          },
          h(
            "option",
            { value: "metro", selected: this.formData.city_tier === "metro" },
            "Metro — Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune (highest venue & catering baselines)"
          ),
          h(
            "option",
            { value: "tier2", selected: this.formData.city_tier === "tier2" },
            "Tier 2 — Jaipur, Lucknow, Chandigarh, Kochi, Ahmedabad (balanced regional vendor rates)"
          ),
          h(
            "option",
            { value: "tier3", selected: this.formData.city_tier === "tier3" },
            "Tier 3 — Smaller district headquarters and towns (cost-effective local sourcing)"
          )
        ),
        h("span", { id: "tier-hint", class: "field-hint" }, "Scales realistic category benchmarks to local market economics"),
        h("span", { id: "tier-error", class: "field-error is-hidden", role: "alert" })
      ),

      // Step 2 Actions
      h(
        "div",
        { class: "step-nav-actions" },
        h(
          "button",
          {
            type: "button",
            class: "btn btn-outline",
            onclick: () => this.goToStep(1),
          },
          "&larr; Back"
        ),
        h(
          "button",
          {
            type: "button",
            class: "btn btn-primary",
            onclick: () => this.goToStep(3),
          },
          "Next: Preferences &rarr;"
        )
      )
    );
    form.appendChild(step2);

    // -----------------------------------------------------------------
    // STEP 3: Preferences & Details
    // -----------------------------------------------------------------
    const step3 = h(
      "div",
      { id: "step-3-panel", class: "intake-step-panel is-hidden" },
      // Venue Setting
      h(
        "div",
        { class: "form-group" },
        h("label", { for: "venue-setting", class: "form-label" }, "Venue Setting"),
        h(
          "select",
          {
            id: "venue-setting",
            name: "venue_setting",
            class: "form-select",
            "aria-describedby": "venue-hint venue-error",
            onchange: (e) => {
              this.formData.venue_setting = e.target.value;
            },
          },
          h("option", { value: "indoor", selected: this.formData.venue_setting === "indoor" }, "Indoor (Banquet hall, hotel ballroom, auditorium)"),
          h("option", { value: "outdoor", selected: this.formData.venue_setting === "outdoor" }, "Outdoor (Lawn, open courtyard — activates weather & sound diligence)"),
          h("option", { value: "both", selected: this.formData.venue_setting === "both" }, "Both (Indoor banquet hall with adjoining open lawn)")
        ),
        h("span", { id: "venue-hint", class: "field-hint" }, "Adapts sound permits, generator, and rainproofing requirements"),
        h("span", { id: "venue-error", class: "field-error is-hidden", role: "alert" })
      ),

      // Dietary Preferences
      h(
        "fieldset",
        { class: "form-fieldset" },
        h("legend", { class: "fieldset-legend" }, "Dietary Requirements"),
        h(
          "div",
          { class: "checkboxes-grid" },
          ...[
            { val: "vegetarian", label: "Vegetarian (Pure veg, no meat or fish)" },
            { val: "jain", label: "Jain (No root vegetables, onions, garlic)" },
            { val: "vegan", label: "Vegan (100% plant-based, no dairy or ghee)" },
            { val: "halal", label: "Halal (Certified meat preparation)" },
          ].map((item) => {
            const isChecked = this.formData.dietary_preferences.includes(item.val);
            return h(
              "div",
              { class: "checkbox-item" },
              h("input", {
                type: "checkbox",
                id: `diet-${item.val}`,
                name: "dietary",
                value: item.val,
                checked: isChecked,
                onchange: (e) => {
                  if (e.target.checked) {
                    if (!this.formData.dietary_preferences.includes(item.val)) {
                      this.formData.dietary_preferences.push(item.val);
                    }
                  } else {
                    this.formData.dietary_preferences = this.formData.dietary_preferences.filter(
                      (d) => d !== item.val
                    );
                  }
                },
              }),
              h("label", { for: `diet-${item.val}`, class: "checkbox-box-label" }, item.label)
            );
          })
        )
      ),

      // Birthday Age Demographic (disclosed only for birthdays)
      h(
        "div",
        {
          id: "age-group-group",
          class: `form-group ${this.formData.event_type === "birthday" ? "" : "is-hidden"}`,
        },
        h("label", { for: "age-group", class: "form-label" }, "Target Demographic (Birthday)"),
        h(
          "select",
          {
            id: "age-group",
            name: "age_group",
            class: "form-select",
            onchange: (e) => {
              this.formData.age_group = e.target.value;
            },
          },
          h("option", { value: "" }, "Select demographic (optional)"),
          h("option", { value: "kids", selected: this.formData.age_group === "kids" }, "Kids (0–12 years) — activates carnival games & kid-friendly food"),
          h("option", { value: "teens", selected: this.formData.age_group === "teens" }, "Teens (13–19 years) — activates interactive music & mocktail bars"),
          h("option", { value: "adults", selected: this.formData.age_group === "adults" }, "Adults (20–59 years) — activates formal dining & evening lounge"),
          h("option", { value: "seniors", selected: this.formData.age_group === "seniors" }, "Seniors (60+ years) — activates seating comfort & ghazal music")
        ),
        h("span", { class: "field-hint" }, "Tailors activities, pacing, and musical selections")
      ),

      // Theme Notes
      h(
        "div",
        { class: "form-group" },
        h("label", { for: "theme-notes", class: "form-label" }, "Theme Concept & Special Wishes (Optional)"),
        h("textarea", {
          id: "theme-notes",
          name: "theme_notes",
          maxlength: "400",
          rows: "3",
          placeholder: "e.g. Traditional Marwar aesthetic with marigold florals, sunset varmala, live classical sitar recital...",
          class: "form-textarea",
          value: this.formData.theme_notes,
          oninput: (e) => {
            this.formData.theme_notes = e.target.value;
            const counter = document.getElementById("theme-notes-counter");
            if (counter) counter.textContent = `${e.target.value.length} / 400`;
          },
        }),
        h(
          "div",
          { class: "field-footer" },
          h("span", { id: "theme-notes-counter", class: "char-counter" }, `${this.formData.theme_notes.length} / 400`),
          h("span", { id: "theme-notes-error", class: "field-error is-hidden", role: "alert" })
        )
      ),

      // Step 3 Actions
      h(
        "div",
        { class: "step-nav-actions" },
        h(
          "button",
          {
            type: "button",
            class: "btn btn-outline",
            onclick: () => this.goToStep(2),
          },
          "&larr; Back"
        ),
        h(
          "button",
          {
            type: "button",
            id: "submit-plan-btn",
            class: "btn btn-primary btn-lg",
            onclick: () => this.submitPlan(ctx),
          },
          "Generate Event Plan"
        )
      )
    );
    form.appendChild(step3);

    // Staged Loading Indicator Screen
    const loadingScreen = h(
      "div",
      { id: "staged-loading-screen", class: "loading-state is-hidden", "aria-live": "polite" },
      createKolamMotif("spinner", 40, 40),
      h("p", { id: "staged-loading-text", class: "loading-stage-text" }, "Working out your budget allocations..."),
      h("p", { class: "loading-notice-text" }, "Generative AI suggestions formulated via Google Gemini require about 8–15 seconds."),
      h(
        "div",
        { class: "loading-skeleton-lines", "aria-hidden": "true" },
        h("div", { class: "skeleton-line skeleton-long" }),
        h("div", { class: "skeleton-line skeleton-medium" }),
        h("div", { class: "skeleton-line skeleton-short" })
      )
    );
    form.appendChild(loadingScreen);

    view.appendChild(form);
    container.appendChild(view);
  },

  goToStep(step) {
    if (step > this.currentStep && !this.validateCurrentStep()) {
      return;
    }

    this.currentStep = step;
    const step1 = document.getElementById("step-1-panel");
    const step2 = document.getElementById("step-2-panel");
    const step3 = document.getElementById("step-3-panel");
    const indicator = document.getElementById("step-indicator-text");

    if (step1) step1.classList.toggle("is-hidden", step !== 1);
    if (step2) step2.classList.toggle("is-hidden", step !== 2);
    if (step3) step3.classList.toggle("is-hidden", step !== 3);

    const stepTitles = {
      1: "Step 1 of 3: What are you celebrating",
      2: "Step 2 of 3: The guests and the money",
      3: "Step 3 of 3: Preferences & details",
    };
    if (indicator) {
      indicator.textContent = stepTitles[step] || "";
    }
  },

  validateCurrentStep() {
    this.clearErrors();
    let isValid = true;

    if (this.currentStep === 1) {
      const dateEl = document.getElementById("event-date");
      const cityEl = document.getElementById("city");

      if (!this.formData.event_date) {
        this.showFieldError("date-error", "Please choose a valid event date.");
        isValid = false;
      } else {
        const selected = new Date(this.formData.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) {
          this.showFieldError("date-error", "Event date cannot be in the past.");
          isValid = false;
        }
      }

      if (!this.formData.city || this.formData.city.trim().length < 2) {
        this.showFieldError("city-error", "City name must be at least 2 characters.");
        isValid = false;
      }
    } else if (this.currentStep === 2) {
      if (!this.formData.guest_count || this.formData.guest_count < 5 || this.formData.guest_count > 5000) {
        this.showFieldError("guest-error", "Guest count must be between 5 and 5,000.");
        isValid = false;
      }
      if (!this.formData.budget_inr || this.formData.budget_inr < 5000 || this.formData.budget_inr > 100000000) {
        this.showFieldError("budget-error", "Total budget must be between ₹5,000 and ₹10 Crore.");
        isValid = false;
      }
    }

    return isValid;
  },

  showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.remove("is-hidden");
    }
  },

  clearErrors() {
    const errorEls = document.querySelectorAll(".field-error");
    errorEls.forEach((el) => {
      el.textContent = "";
      el.classList.add("is-hidden");
    });
    const globalBanner = document.getElementById("intake-error-banner");
    if (globalBanner) {
      globalBanner.textContent = "";
      globalBanner.classList.add("is-hidden");
    }
  },

  updateConditionalFields() {
    const ageGroupContainer = document.getElementById("age-group-group");
    if (ageGroupContainer) {
      ageGroupContainer.classList.toggle("is-hidden", this.formData.event_type !== "birthday");
    }
  },

  updateBudgetReaction() {
    const box = document.getElementById("budget-preview-box");
    if (box) {
      const budget = this.formData.budget_inr || 0;
      const guests = this.formData.guest_count || 1;
      const perGuest = Math.round(budget / guests);
      box.textContent = `${formatINR(budget)} ${formatINRWords(budget)} — about ${formatINR(perGuest)} per guest`;
    }
  },

  populateSamplePreset() {
    const presets = {
      wedding: {
        event_type: "wedding",
        event_date: getOffsetDateString(90),
        guest_count: 250,
        budget_inr: 1800000,
        city: "Jaipur",
        city_tier: "tier2",
        venue_setting: "both",
        dietary_preferences: ["vegetarian", "jain"],
        age_group: "",
        theme_notes: "Royal Marwar aesthetic with marigold floral decor, sunset varmala, and live Shehnai recital.",
      },
      birthday: {
        event_type: "birthday",
        event_date: getOffsetDateString(25),
        guest_count: 45,
        budget_inr: 65000,
        city: "Bengaluru",
        city_tier: "metro",
        venue_setting: "indoor",
        dietary_preferences: ["vegetarian"],
        age_group: "kids",
        theme_notes: "Jungle safari wildlife explorer party with DIY animal masks and chocolate truffle cake.",
      },
      community: {
        event_type: "community",
        event_date: getOffsetDateString(45),
        guest_count: 500,
        budget_inr: 250000,
        city: "Pune",
        city_tier: "tier2",
        venue_setting: "outdoor",
        dietary_preferences: ["vegetarian"],
        age_group: "",
        theme_notes: "Diwali Anand Mela with lantern canopies, traditional rangoli competition, and live Dandiya circle.",
      },
    };

    const chosen = presets[this.formData.event_type] || presets.wedding;
    Object.assign(this.formData, chosen);

    // Refresh UI inputs
    const dateInput = document.getElementById("event-date");
    if (dateInput) dateInput.value = this.formData.event_date;
    const cityInput = document.getElementById("city");
    if (cityInput) cityInput.value = this.formData.city;
    const guestInput = document.getElementById("guest-count");
    if (guestInput) guestInput.value = String(this.formData.guest_count);
    const budgetInput = document.getElementById("budget-inr");
    if (budgetInput) budgetInput.value = String(this.formData.budget_inr);
    const notesInput = document.getElementById("theme-notes");
    if (notesInput) notesInput.value = this.formData.theme_notes;

    this.updateBudgetReaction();
    this.updateConditionalFields();
  },

  async submitPlan(ctx) {
    if (!this.validateCurrentStep()) return;

    const payload = {
      event_type: this.formData.event_type,
      event_date: this.formData.event_date,
      guest_count: this.formData.guest_count,
      budget_inr: this.formData.budget_inr,
      city: this.formData.city,
      city_tier: this.formData.city_tier,
      dietary_preferences: this.formData.dietary_preferences.length > 0 ? this.formData.dietary_preferences : ["vegetarian"],
      indoor_outdoor: this.formData.venue_setting,
      theme_notes: this.formData.theme_notes || "",
    };
    if (this.formData.event_type === "birthday" && this.formData.age_group) {
      payload.age_group = this.formData.age_group;
    }

    // Hide steps, show staged loading screen
    const step3 = document.getElementById("step-3-panel");
    const loading = document.getElementById("staged-loading-screen");
    const stageText = document.getElementById("staged-loading-text");
    if (step3) step3.classList.add("is-hidden");
    if (loading) loading.classList.remove("is-hidden");

    // Staged progress messages
    const stages = [
      "Working out your budget allocations...",
      "Building your timeline run-of-show...",
      "Asking for creative ideas... (this can take about 10 seconds)",
    ];
    let stageIdx = 0;
    this.activeStageTimer = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length && stageText) {
        stageText.textContent = stages[stageIdx];
      }
    }, 3200);

    try {
      const planResponse = await createPlan(payload);
      clearInterval(this.activeStageTimer);

      // Determine an editorial title
      const themeTitle = planResponse.ideas?.themes?.[0]?.name || "Celebration";
      const eventType = payload.event_type.charAt(0).toUpperCase() + payload.event_type.slice(1);
      const title = `${themeTitle} ${eventType}`;

      // Save into utsav_v3 multi-event store
      const saveResult = saveNewEvent({
        title,
        formInputs: payload,
        plan: planResponse,
        checkedItems: [],
        shortlist: [],
        scenarioBudget: null,
      });

      const eventId = saveResult.ok && saveResult.event ? saveResult.event.id : "demo";
      ctx.navigate(`#/event/${eventId}`);
    } catch (err) {
      clearInterval(this.activeStageTimer);
      if (loading) loading.classList.add("is-hidden");
      if (step3) step3.classList.remove("is-hidden");

      const globalError = document.getElementById("intake-error-banner");
      if (globalError) {
        globalError.textContent = err.userMessage || "An error occurred while synthesizing your event plan. Please try again.";
        globalError.classList.remove("is-hidden");
        globalError.focus();
      }
    }
  },

  unmount() {
    if (this.activeStageTimer) {
      clearInterval(this.activeStageTimer);
      this.activeStageTimer = null;
    }
  },
};
