/**
 * Utsav Planner - Landing Page View (#/)
 *
 * Features:
 * - Confident typographic hero with one primary CTA.
 * - Three full-width ruled doors (Wedding, Birthday, Community) with typical lead times.
 * - Editorial "How It Works" in 3 numbered steps.
 * - Live Interactive Budget Ledger Demo:
 *   - Type switcher (Wedding, Birthday, Community).
 *   - Accessible guest slider and budget input with aria-valuetext.
 *   - Debounced (250ms) live updates via /api/budget.
 *   - In-memory cache and AbortController.
 *   - Loading-safe presentation (keeps previous values visible).
 *   - Calm plain-text error messages.
 *
 * STRICT SECURITY: Zero innerHTML/outerHTML/eval. Uses safe h().
 */

import { fetchBudget } from "../api.js";
import {
  formatINR,
  formatINRWords,
  formatPerGuestReaction,
  h,
  createKolamMotif,
} from "../utils.js";

// Session-level preselection hook for guided plan wizard
let preselectedEventType = "wedding";

export function getPreselectedEventType() {
  const current = preselectedEventType;
  preselectedEventType = "wedding"; // Reset after reading
  return current;
}

export function setPreselectedEventType(type) {
  preselectedEventType = type;
  try {
    sessionStorage.setItem("utsav_preselected_type", type);
  } catch {
    // Graceful fallback if storage disabled
  }
}

// In-memory demo budget calculation cache
const budgetCache = new Map();

// Preset defaults for the interactive live demo
const DEMO_PRESETS = {
  wedding: {
    event_type: "wedding",
    guests: 200,
    budget_inr: 1500000,
    city: "Jaipur",
    city_tier: "tier2",
    venue_setting: "indoor",
    dietary_preferences: ["vegetarian"],
    leadTime: "Typical lead time: 3 to 6 months",
    doorDesc: "Multi-day ceremonies, auspicious muhurats, vendor contracts, and festive hospitality.",
  },
  birthday: {
    event_type: "birthday",
    guests: 45,
    budget_inr: 65000,
    city: "Bengaluru",
    city_tier: "metro",
    venue_setting: "indoor",
    dietary_preferences: ["vegetarian"],
    age_group: "kids",
    leadTime: "Typical lead time: 3 to 4 weeks",
    doorDesc: "Milestone birthdays, themed decor, age-tailored activities, and artisanal cakes.",
  },
  community: {
    event_type: "community",
    guests: 500,
    budget_inr: 250000,
    city: "Pune",
    city_tier: "tier2",
    venue_setting: "outdoor",
    dietary_preferences: ["vegetarian"],
    leadTime: "Typical lead time: 1 to 2 months",
    doorDesc: "Diwali melas, society utsavs, cultural performances, and crowd-pleasing feasts.",
  },
};

export const landingView = {
  activeAbortController: null,
  debounceTimer: null,

  mount(container, ctx) {
    ctx.setTitle("The Event Programme & Planning Ledger");
    ctx.announce("Welcome to Utsav Planner. Explore the event ledger or try the live demo.");

    let currentDemoType = "wedding";
    let currentDemoGuests = DEMO_PRESETS.wedding.guests;
    let currentDemoBudget = DEMO_PRESETS.wedding.budget_inr;

    // View Container
    const view = h("div", { class: "landing-view-container" });

    // -----------------------------------------------------------------
    // 1. Confident Typographic Hero
    // -----------------------------------------------------------------
    const heroSection = h(
      "section",
      { class: "landing-hero", "aria-labelledby": "hero-headline" },
      createKolamMotif("mark", 32, 32),
      h(
        "h1",
        { id: "hero-headline", class: "hero-headline", tabindex: "-1" },
        "Event Planning Run with Exact Math and Cultural Care"
      ),
      h(
        "p",
        { class: "hero-lead-promise" },
        "A mathematically balanced rupee ledger, backwards-scheduled milestone run-of-show, statutory compliance checklists, and culturally tailored creative ideas for Indian celebrations."
      ),
      h(
        "div",
        { class: "hero-cta-group" },
        h(
          "a",
          {
            href: "#/plan",
            class: "btn btn-primary btn-lg",
            onclick: (e) => {
              e.preventDefault();
              setPreselectedEventType("wedding");
              ctx.navigate("#/plan");
            },
          },
          "Plan Your Celebration"
        ),
        h(
          "a",
          {
            href: "#live-demo-section",
            class: "btn btn-outline",
            onclick: (e) => {
              e.preventDefault();
              const el = document.getElementById("live-demo-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
          },
          "Explore Live Demo ↓"
        )
      )
    );
    view.appendChild(heroSection);

    // -----------------------------------------------------------------
    // 2. Three Full-Width Ruled Doors
    // -----------------------------------------------------------------
    const doorsSection = h(
      "section",
      { class: "landing-doors-section", "aria-labelledby": "doors-headline" },
      h("h2", { id: "doors-headline", class: "section-eyebrow" }, "Choose Your Celebration"),
      h(
        "div",
        { class: "doors-list", role: "list" },
        ...[
          { type: "wedding", title: "Wedding Celebration", ...DEMO_PRESETS.wedding },
          { type: "birthday", title: "Milestone Birthday", ...DEMO_PRESETS.birthday },
          { type: "community", title: "Community Festival & Mela", ...DEMO_PRESETS.community },
        ].map((item) => {
          return h(
            "article",
            {
              class: "door-row",
              role: "listitem",
              tabindex: "0",
              onclick: () => {
                setPreselectedEventType(item.type);
                ctx.navigate("#/plan");
              },
              onkeydown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPreselectedEventType(item.type);
                  ctx.navigate("#/plan");
                }
              },
            },
            h(
              "div",
              { class: "door-content" },
              h("h3", { class: "door-title" }, item.title),
              h("p", { class: "door-desc" }, item.doorDesc),
              h("span", { class: "door-lead-time" }, item.leadTime)
            ),
            h(
              "div",
              { class: "door-action" },
              h("span", { class: "door-arrow", "aria-hidden": "true" }, "Start Plan →")
            )
          );
        })
      )
    );
    view.appendChild(doorsSection);

    // -----------------------------------------------------------------
    // 3. Editorial "How It Works" in 3 Steps
    // -----------------------------------------------------------------
    const howSection = h(
      "section",
      { class: "landing-how-section", "aria-labelledby": "how-headline" },
      h("h2", { id: "how-headline", class: "section-eyebrow" }, "The Planning Ledger Method"),
      h(
        "div",
        { class: "how-grid" },
        h(
          "div",
          { class: "how-step" },
          h("span", { class: "how-number", "aria-hidden": "true" }, "01"),
          h("h3", { class: "how-step-title" }, "Define Scope & Economy"),
          h(
            "p",
            { class: "how-step-desc" },
            "Enter your target date, guest headcount, and total budget. City tier multipliers instantly scale baseline rates to local market economics."
          )
        ),
        h(
          "div",
          { class: "how-step" },
          h("span", { class: "how-number", "aria-hidden": "true" }, "02"),
          h("h3", { class: "how-step-title" }, "Balanced Ledger & Timeline"),
          h(
            "p",
            { class: "how-step-desc" },
            "Deterministic algorithms balance expenditure across categories with zero rounding drift, and backwards-schedule vendor booking milestones."
          )
        ),
        h(
          "div",
          { class: "how-step" },
          h("span", { class: "how-number", "aria-hidden": "true" }, "03"),
          h("h3", { class: "how-step-title" }, "Atmosphere, Diligence & Polish"),
          h(
            "p",
            { class: "how-step-desc" },
            "Tailored creative themes, regional menu spreads, and vendor compliance checklists give you complete command over celebration day."
          )
        )
      )
    );
    view.appendChild(howSection);

    // -----------------------------------------------------------------
    // 4. Interactive Live Demo
    // -----------------------------------------------------------------
    const demoSection = h(
      "section",
      { id: "live-demo-section", class: "landing-demo-section", "aria-labelledby": "demo-headline" },
      h(
        "div",
        { class: "demo-header-strip" },
        h("div", {},
          h("h2", { id: "demo-headline", class: "demo-headline" }, "Live Budget Ledger Demo"),
          h("p", { class: "demo-subtext" }, "Adjust guest count and budget to observe deterministic re-allocation live.")
        ),
        h(
          "div",
          { class: "demo-type-tabs", role: "tablist", "aria-label": "Event Type Presets" },
          h(
            "button",
            {
              type: "button",
              class: "demo-type-btn is-active",
              role: "tab",
              "aria-selected": "true",
              onclick: (e) => switchDemoPreset("wedding", e.target),
            },
            "Wedding"
          ),
          h(
            "button",
            {
              type: "button",
              class: "demo-type-btn",
              role: "tab",
              "aria-selected": "false",
              onclick: (e) => switchDemoPreset("birthday", e.target),
            },
            "Birthday"
          ),
          h(
            "button",
            {
              type: "button",
              class: "demo-type-btn",
              role: "tab",
              "aria-selected": "false",
              onclick: (e) => switchDemoPreset("community", e.target),
            },
            "Community"
          )
        )
      ),

      // Demo Controls Card
      h(
        "div",
        { class: "demo-controls-bar" },
        // Guests Slider Control
        h(
          "div",
          { class: "demo-control-group" },
          h(
            "div",
            { class: "demo-control-label-row" },
            h("label", { for: "demo-guest-slider", class: "form-label" }, "Expected Guests"),
            h("span", { id: "demo-guest-display", class: "demo-val-display" }, `${currentDemoGuests} attendees`)
          ),
          h("input", {
            type: "range",
            id: "demo-guest-slider",
            min: "10",
            max: "1000",
            step: "5",
            value: String(currentDemoGuests),
            "aria-valuemin": "10",
            "aria-valuemax": "1000",
            "aria-valuenow": String(currentDemoGuests),
            "aria-valuetext": `${currentDemoGuests} guests`,
            class: "range-slider",
            oninput: (e) => {
              currentDemoGuests = parseInt(e.target.value, 10);
              const disp = document.getElementById("demo-guest-display");
              if (disp) disp.textContent = `${currentDemoGuests} attendees`;
              e.target.setAttribute("aria-valuenow", String(currentDemoGuests));
              e.target.setAttribute("aria-valuetext", `${currentDemoGuests} guests`);
              triggerDemoUpdate();
            },
          })
        ),

        // Budget Input Control
        h(
          "div",
          { class: "demo-control-group" },
          h(
            "div",
            { class: "demo-control-label-row" },
            h("label", { for: "demo-budget-input", class: "form-label" }, "Total Budget (INR)"),
            h("span", { id: "demo-budget-words", class: "demo-val-display" }, formatINRWords(currentDemoBudget))
          ),
          h("input", {
            type: "number",
            id: "demo-budget-input",
            min: "10000",
            max: "50000000",
            step: "5000",
            value: String(currentDemoBudget),
            class: "form-input",
            oninput: (e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 5000) {
                currentDemoBudget = val;
                const words = document.getElementById("demo-budget-words");
                if (words) words.textContent = formatINRWords(currentDemoBudget);
                triggerDemoUpdate();
              }
            },
          })
        )
      ),

      // Live Ledger Output Card
      h(
        "div",
        { id: "demo-ledger-card", class: "demo-ledger-card", "aria-live": "polite" },
        h(
          "div",
          { class: "demo-ledger-masthead" },
          h("span", { id: "demo-cpg-indicator", class: "demo-cpg-tag" }, formatPerGuestReaction(currentDemoBudget, currentDemoGuests)),
          h("span", { id: "demo-status-msg", class: "demo-status-text" }, "Mathematical allocation · Verified balance")
        ),
        h("div", { id: "demo-ledger-rows-container", class: "demo-ledger-rows" })
      ),

      // Disclaimer Note
      h(
        "p",
        { class: "demo-disclaimer" },
        "Figures are illustrative mathematical benchmarks based on regional market averages. Actual vendor quotations may vary by season and venue availability."
      )
    );
    view.appendChild(demoSection);

    // Append complete view
    container.appendChild(view);

    // Initial Live Demo calculation
    triggerDemoUpdate(true);

    // -----------------------------------------------------------------
    // Interactive Handlers
    // -----------------------------------------------------------------
    function switchDemoPreset(type, buttonEl) {
      currentDemoType = type;
      const preset = DEMO_PRESETS[type];
      currentDemoGuests = preset.guests;
      currentDemoBudget = preset.budget_inr;

      // Update active button state
      const buttons = demoSection.querySelectorAll(".demo-type-btn");
      buttons.forEach((btn) => {
        btn.classList.remove("is-active");
        btn.setAttribute("aria-selected", "false");
      });
      if (buttonEl) {
        buttonEl.classList.add("is-active");
        buttonEl.setAttribute("aria-selected", "true");
      }

      // Update control elements
      const guestSlider = document.getElementById("demo-guest-slider");
      const guestDisp = document.getElementById("demo-guest-display");
      if (guestSlider) {
        guestSlider.value = String(currentDemoGuests);
        guestSlider.setAttribute("aria-valuenow", String(currentDemoGuests));
        guestSlider.setAttribute("aria-valuetext", `${currentDemoGuests} guests`);
      }
      if (guestDisp) guestDisp.textContent = `${currentDemoGuests} attendees`;

      const budgetInput = document.getElementById("demo-budget-input");
      const budgetWords = document.getElementById("demo-budget-words");
      if (budgetInput) budgetInput.value = String(currentDemoBudget);
      if (budgetWords) budgetWords.textContent = formatINRWords(currentDemoBudget);

      triggerDemoUpdate(true);
    }

    function triggerDemoUpdate(immediate = false) {
      if (landingView.debounceTimer) {
        clearTimeout(landingView.debounceTimer);
      }

      if (immediate) {
        executeDemoFetch();
      } else {
        landingView.debounceTimer = setTimeout(executeDemoFetch, 250);
      }
    }

    async function executeDemoFetch() {
      const preset = DEMO_PRESETS[currentDemoType];
      const payload = {
        event_type: preset.event_type,
        event_date: getOffsetIsoDate(60),
        guest_count: currentDemoGuests,
        budget_inr: currentDemoBudget,
        city: preset.city,
        city_tier: preset.city_tier,
        dietary_preferences: preset.dietary_preferences,
        indoor_outdoor: preset.venue_setting,
      };
      if (preset.age_group) {
        payload.age_group = preset.age_group;
      }

      const cacheKey = `${payload.event_type}-${payload.guest_count}-${payload.budget_inr}-${payload.city_tier}`;

      // Check in-memory cache
      if (budgetCache.has(cacheKey)) {
        renderDemoLedger(budgetCache.get(cacheKey));
        return;
      }

      // Abort previous in-flight request
      if (landingView.activeAbortController) {
        landingView.activeAbortController.abort();
      }
      landingView.activeAbortController = new AbortController();

      const statusEl = document.getElementById("demo-status-msg");
      if (statusEl) {
        statusEl.textContent = "Calculating allocation...";
      }

      try {
        const result = await fetchBudget(payload, landingView.activeAbortController.signal);
        budgetCache.set(cacheKey, result);
        renderDemoLedger(result);
        if (statusEl) {
          statusEl.textContent = "Mathematical allocation · Verified balance";
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.warn("Live demo budget fetch failed", err);
        if (statusEl) {
          statusEl.textContent = err.userMessage || "Calculations temporarily busy. Please adjust slider.";
        }
      }
    }

    function renderDemoLedger(data) {
      if (!data || !data.budget) return;
      const budget = data.budget;

      const cpgEl = document.getElementById("demo-cpg-indicator");
      if (cpgEl) {
        cpgEl.textContent = `${formatINR(budget.cost_per_guest_inr)} per guest`;
      }

      const rowsContainer = document.getElementById("demo-ledger-rows-container");
      if (!rowsContainer) return;

      while (rowsContainer.firstChild) {
        rowsContainer.removeChild(rowsContainer.firstChild);
      }

      // Category breakdown rows
      budget.categories.forEach((cat) => {
        const row = h(
          "div",
          { class: "demo-ledger-row" },
          h(
            "div",
            { class: "demo-row-head" },
            h("span", { class: "demo-cat-name" }, cat.name),
            h("span", { class: "demo-cat-amount" }, `${formatINR(cat.allocated_inr)} (${cat.percentage.toFixed(1)}%)`)
          ),
          h(
            "div",
            { class: "demo-cat-bar-track", "aria-hidden": "true" },
            h("div", {
              class: "demo-cat-bar-fill",
              style: { width: `${Math.min(cat.percentage, 100)}%` },
            })
          )
        );
        rowsContainer.appendChild(row);
      });

      // Contingency cushion row
      const contRow = h(
        "div",
        { class: "demo-ledger-row demo-contingency-row" },
        h(
          "div",
          { class: "demo-row-head" },
          h("span", { class: "demo-cat-name" }, "Reserved Contingency Cushion"),
          h("span", { class: "demo-cat-amount" }, `${formatINR(budget.contingency_inr)} (${budget.contingency_percentage.toFixed(1)}%)`)
        ),
        h(
          "div",
          { class: "demo-cat-bar-track", "aria-hidden": "true" },
          h("div", {
            class: "demo-cat-bar-fill demo-contingency-fill",
            style: { width: `${Math.min(budget.contingency_percentage, 100)}%` },
          })
        )
      );
      rowsContainer.appendChild(contRow);

      // Exact Rupee Total Row
      const totalRow = h(
        "div",
        { class: "demo-ledger-total-row" },
        h("span", { class: "demo-total-label" }, "Total Balanced Programme"),
        h("span", { class: "demo-total-amount" }, formatINR(budget.total_budget_inr))
      );
      rowsContainer.appendChild(totalRow);
    }

    function getOffsetIsoDate(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  },

  unmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  },
};
