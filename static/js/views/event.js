/**
 * Utsav Planner - Interactive Event Programme View (#/event/<id>)
 *
 * Implements the comprehensive event planning programme:
 * - Editorial headline with large serif countdown in Asia/Kolkata context.
 * - Ruled two-column key figures presentation (no identical stat boxes).
 * - Feasibility verdict statement and single most urgent next action button.
 * - WAI-ARIA tab navigation: Budget, Timeline, Checklist, Ideas.
 * - Interactive "Try different numbers" budget calculation calling /api/budget live.
 * - Timeline run-of-show with RFC 5545 "Add to Calendar" (.ics download).
 * - Vendor checklist with "Do this week" focus filter and quiet completion acknowledgements.
 * - Creative ideas with shortlist "Keep" / "Kept" toggle buttons and neutral re-generation.
 * - Plain-text "Copy summary" and print stylesheet integration.
 * - Zero emoji icons (clean typography and inline SVG marks only).
 * - Complete ban on innerHTML/outerHTML/eval. Uses safe h().
 */

import { fetchBudget, createPlan, refinePlan } from "../api.js";
import { getEventById, updateEvent } from "../storage.js";
import { generateICS, downloadICS } from "../lib/ics.js";
import {
  computeSliderRange,
  calculateTickPercentage,
  formatIndianAriaValuetext,
} from "../lib/ranges.js";
import {
  formatINR,
  formatCompactINR,
  formatINRWords,
  formatDiffINR,
  formatDate,
  getCountdownInfo,
  humanLabel,
  pluralize,
  h,
  createKolamMotif,
} from "../utils.js";

export const eventView = {
  event: null,
  activeTab: "tab-budget",
  whatifDebounceTimer: null,
  whatifAbortController: null,
  whatifCache: new Map(),
  checklistFilter: "this_week", // "this_week" | "all" | "pending"
  refining: false,

  async mount(container, ctx) {
    const eventId = ctx.params.id;
    const loadedEvent = getEventById(eventId);

    if (!loadedEvent || !loadedEvent.plan) {
      ctx.setTitle("Event Not Found");
      container.appendChild(
        h(
          "div",
          { class: "not-found-card" },
          createKolamMotif("mark", 32, 32),
          h("h1", { class: "not-found-title", tabindex: "-1" }, "Event Programme Not Found"),
          h(
            "p",
            { class: "not-found-desc" },
            "This celebration plan is no longer in your saved ledger or may have been deleted."
          ),
          h(
            "a",
            {
              href: "#/events",
              class: "btn btn-primary",
              onclick: (e) => {
                e.preventDefault();
                ctx.navigate("#/events");
              },
            },
            "View All Saved Events"
          )
        )
      );
      return;
    }

    this.event = loadedEvent;
    const plan = loadedEvent.plan;
    const ev = loadedEvent.formInputs;
    const budget = loadedEvent.scenarioBudget || plan.budget;
    const timeline = plan.timeline;
    const checklist = plan.checklist;
    const ideas = plan.ideas;

    ctx.setTitle(this.event.title);
    ctx.announce(`Viewing programme for ${this.event.title}.`);

    const view = h("div", { class: "event-view-container", "data-view": "event" });

    // Breadcrumb line above event title
    const breadcrumb = h(
      "nav",
      { class: "programme-breadcrumb", "aria-label": "Breadcrumb" },
      h(
        "a",
        {
          href: "#/events",
          class: "breadcrumb-link",
          onclick: (e) => {
            e.preventDefault();
            ctx.navigate("#/events");
          },
        },
        "← My saved events"
      )
    );
    view.appendChild(breadcrumb);

    // -----------------------------------------------------------------
    // 1. Editorial Header & Large Countdown
    // -----------------------------------------------------------------
    const countdownInfo = this.computeCountdown(ev.event_date);
    const summarySentence = this.buildSummarySentence(ev, budget);

    const layout = h("div", { class: "programme-two-column-layout" });

    // LEFT Column: Breadcrumbs, Serif Title, Tear-off Countdown with Date, Single-Column Figures, Urgent Action, 2x2 Actions
    const sidebar = h(
      "aside",
      { class: "programme-sidebar", "aria-labelledby": "event-main-heading" },
      breadcrumb,
      h("h1", { id: "event-main-heading", class: "sidebar-event-title", tabindex: "-1" }, this.event.title),
      h(
        "div",
        { class: "sidebar-countdown-card", "aria-label": `Countdown: ${countdownInfo.text}` },
        h(
          "div",
          { class: "countdown-tear-off" },
          h("span", { class: "countdown-num" }, countdownInfo.days > 0 ? String(countdownInfo.days) : (countdownInfo.days === 0 ? "0" : String(Math.abs(countdownInfo.days)))),
          h("span", { class: "countdown-label" }, countdownInfo.days > 0 ? (countdownInfo.days === 1 ? "day to go" : "days to go") : (countdownInfo.days === 0 ? "today" : "days ago"))
        ),
        h("span", { class: "sidebar-countdown-date" }, formatDate(ev.event_date))
      ),

      // Single-Column Key Figures Definition List
      h(
        "dl",
        { class: "sidebar-figures-dl", "aria-label": "Key celebration figures" },
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "Guests"),
          h("dd", { class: "sidebar-dl-def" }, pluralize(ev.guest_count, "guest"))
        ),
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "Total budget"),
          h("dd", { class: "sidebar-dl-def font-tabular" }, formatINR(budget.total_budget_inr))
        ),
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "Per guest"),
          h("dd", { class: "sidebar-dl-def font-tabular" }, formatINR(budget.cost_per_guest_inr))
        ),
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "Contingency"),
          h("dd", { class: "sidebar-dl-def font-tabular" }, `${formatINR(budget.contingency_inr)} (${budget.contingency_percentage}%)`)
        ),
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "City"),
          h("dd", { class: "sidebar-dl-def" }, `${ev.city} (${humanLabel(ev.city_tier)})`)
        ),
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "Venue"),
          h("dd", { class: "sidebar-dl-def" }, humanLabel(ev.indoor_outdoor || ev.venue_setting || "indoor"))
        ),
        h(
          "div",
          { class: "sidebar-dl-row" },
          h("dt", { class: "sidebar-dl-term" }, "Food"),
          h("dd", { class: "sidebar-dl-def" }, (ev.dietary_preferences || ["vegetarian"]).map(humanLabel).join(", "))
        )
      ),

      // Single Most Urgent Next Action
      this.renderMostUrgentAction(timeline),

      // 2x2 Equal Action Buttons Grid
      h(
        "div",
        { class: "sidebar-actions-grid no-print" },
        h(
          "a",
          {
            href: `#/plan/${ev.event_type || "wedding"}`,
            class: "btn btn-outline sidebar-action-btn",
            onclick: (e) => {
              e.preventDefault();
              ctx.navigate(`#/plan/${ev.event_type || "wedding"}`);
            },
          },
          "Edit details"
        ),
        h(
          "button",
          {
            type: "button",
            id: "copy-summary-btn",
            class: "btn btn-outline sidebar-action-btn",
            onclick: (e) => this.copySummaryToClipboard(e.target),
          },
          "Copy summary"
        ),
        h(
          "button",
          {
            type: "button",
            class: "btn btn-outline sidebar-action-btn",
            onclick: () => window.print(),
          },
          "Print / PDF"
        ),
        h(
          "button",
          {
            type: "button",
            id: "start-over-btn",
            class: "btn btn-outline sidebar-action-btn",
            onclick: () => {
              const confirmed = window.confirm("Start over? This will reset all checklist progress and scenario adjustments for this celebration.");
              if (confirmed) {
                updateEvent(this.event.id, { checkedItems: [], scenarioBudget: null });
                this.event.checkedItems = [];
                this.event.scenarioBudget = null;
                ctx.announce("Celebration progress reset to original plan.");
                const checkboxes = document.querySelectorAll(".checklist-item-row input[type='checkbox']");
                checkboxes.forEach((cb) => { cb.checked = false; });
                const resetBtn = document.getElementById("whatif-reset-btn");
                if (resetBtn) resetBtn.click();
              }
            },
          },
          "Start over"
        )
      )
    );

    // RIGHT Column: Tabs and Panels
    const mainColumn = h("div", { class: "programme-main-column" });

    // -----------------------------------------------------------------
    // WAI-ARIA Tab Navigation
    // -----------------------------------------------------------------
    const tabsList = h(
      "div",
      { class: "tab-navigation-bar", role: "tablist", "aria-label": "Programme Sections" },
      ...[
        { id: "tab-budget", panelId: "panel-budget", label: "Budget" },
        { id: "tab-timeline", panelId: "panel-timeline", label: "Timeline" },
        { id: "tab-checklist", panelId: "panel-checklist", label: "Checklist" },
        { id: "tab-ideas", panelId: "panel-ideas", label: "Ideas" },
      ].map((t) => {
        const isSelected = this.activeTab === t.id;
        return h(
          "button",
          {
            type: "button",
            id: t.id,
            role: "tab",
            class: `programme-tab ${isSelected ? "is-active" : ""}`,
            "aria-selected": String(isSelected),
            "aria-controls": t.panelId,
            tabindex: isSelected ? "0" : "-1",
            onclick: () => this.switchTab(t.id),
            onkeydown: (e) => this.handleTabKeydown(e),
          },
          t.label
        );
      })
    );
    mainColumn.appendChild(tabsList);

    // -----------------------------------------------------------------
    // Panels Container
    // -----------------------------------------------------------------
    const panelsContainer = h("div", { id: "panels-container", class: "panels-container" });

    // Panel A: Budget Ledger & What-If Simulator
    panelsContainer.appendChild(this.buildBudgetPanel(budget, plan.budget, ev, ctx));

    // Panel B: Timeline Run-of-Show with Calendar Export
    panelsContainer.appendChild(this.buildTimelinePanel(timeline, this.event.id, this.event.title));

    // Panel C: Vendor Checklist with Focus Filter
    panelsContainer.appendChild(this.buildChecklistPanel(checklist, timeline, this.event.checkedItems));

    // Panel D: Creative Ideas with Shortlist
    panelsContainer.appendChild(this.buildIdeasPanel(ideas, ev, this.event.shortlist, ctx));

    mainColumn.appendChild(panelsContainer);

    layout.appendChild(sidebar);
    layout.appendChild(mainColumn);
    view.appendChild(layout);

    container.replaceChildren(view);
  },

  // -------------------------------------------------------------------
  // Tab Switching & Keyboard Navigation
  // -------------------------------------------------------------------
  switchTab(targetTabId) {
    this.activeTab = targetTabId;
    const tabButtons = document.querySelectorAll(".programme-tab");
    tabButtons.forEach((btn) => {
      const isSelected = btn.id === targetTabId;
      btn.classList.toggle("is-active", isSelected);
      btn.setAttribute("aria-selected", String(isSelected));
      btn.setAttribute("tabindex", isSelected ? "0" : "-1");
    });

    const panels = document.querySelectorAll(".programme-panel");
    panels.forEach((p) => {
      const isOwner = p.getAttribute("aria-labelledby") === targetTabId;
      p.classList.toggle("is-hidden", !isOwner);
    });
  },

  handleTabKeydown(e) {
    const tabs = Array.from(document.querySelectorAll(".programme-tab"));
    const currentIdx = tabs.indexOf(e.target);
    let nextIdx = -1;

    if (e.key === "ArrowRight") {
      nextIdx = (currentIdx + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = tabs.length - 1;
    }

    if (nextIdx !== -1) {
      e.preventDefault();
      tabs[nextIdx].focus();
      this.switchTab(tabs[nextIdx].id);
    }
  },

  // -------------------------------------------------------------------
  // Component Builders: Budget Panel with "Try different numbers"
  // -------------------------------------------------------------------
  buildBudgetPanel(currentBudget, originalBudget, ev, ctx) {
    let scenarioGuests = ev.guest_count;
    let scenarioBudgetInr = currentBudget.total_budget_inr;

    const guestRange = computeSliderRange("guests", ev.guest_count);
    const budgetRange = computeSliderRange("budget", originalBudget.total_budget_inr);

    const panel = h(
      "section",
      {
        id: "panel-budget",
        role: "tabpanel",
        "aria-labelledby": "tab-budget",
        tabindex: "0",
        class: `programme-panel ${this.activeTab === "tab-budget" ? "" : "is-hidden"}`,
      },

      // Panel Masthead
      h(
        "div",
        { class: "panel-masthead" },
        h("h2", { class: "panel-headline" }, "Budget allocation and spending ledger"),
        h("p", { class: "panel-deck" }, "Where every rupee goes. These are planning estimates, so treat them as a starting point."),
        h("hr", { class: "panel-divider-rule", "aria-hidden": "true" })
      )
    );

    // Guest Controls
    const guestDisplay = h("span", { id: "whatif-guest-display", class: "what-if-field-display font-tabular" }, `${scenarioGuests} guests`);
    const guestNumInput = h("input", {
      type: "number",
      id: "whatif-guests-input",
      class: "whatif-number-input font-tabular",
      min: String(guestRange.min),
      max: String(guestRange.max),
      step: String(guestRange.step),
      value: String(scenarioGuests),
      "aria-label": "Guests headcount",
    });

    const guestSlider = h("input", {
      type: "range",
      id: "whatif-guests-slider",
      min: String(guestRange.min),
      max: String(guestRange.max),
      step: String(guestRange.step),
      value: String(scenarioGuests),
      "aria-valuenow": String(scenarioGuests),
      "aria-valuetext": formatIndianAriaValuetext("guests", scenarioGuests),
      class: "whatif-range-slider",
    });

    const guestTick = h(
      "div",
      { class: "whatif-plan-tick", "aria-hidden": "true" },
      h("span", { class: "whatif-tick-line" }),
      h("span", { class: "whatif-tick-text" }, "Your plan")
    );
    guestTick.style.left = `${calculateTickPercentage(guestRange.min, guestRange.max, guestRange.savedValue)}%`;

    // Budget Controls
    const budgetDisplay = h("span", { id: "whatif-budget-display", class: "what-if-field-display font-tabular" }, formatINR(scenarioBudgetInr));
    const budgetNumInput = h("input", {
      type: "number",
      id: "whatif-budget-input",
      class: "whatif-number-input font-tabular",
      min: String(budgetRange.min),
      max: String(budgetRange.max),
      step: String(budgetRange.step),
      value: String(scenarioBudgetInr),
      "aria-label": "Total budget in rupees",
    });

    const budgetSlider = h("input", {
      type: "range",
      id: "whatif-budget-slider",
      min: String(budgetRange.min),
      max: String(budgetRange.max),
      step: String(budgetRange.step),
      value: String(scenarioBudgetInr),
      "aria-valuenow": String(scenarioBudgetInr),
      "aria-valuetext": formatIndianAriaValuetext("budget", scenarioBudgetInr),
      class: "whatif-range-slider",
    });

    const budgetTick = h(
      "div",
      { class: "whatif-plan-tick", "aria-hidden": "true" },
      h("span", { class: "whatif-tick-line" }),
      h("span", { class: "whatif-tick-text" }, "Your plan")
    );
    budgetTick.style.left = `${calculateTickPercentage(budgetRange.min, budgetRange.max, budgetRange.savedValue)}%`;

    // Connect Guest inputs
    guestSlider.oninput = (e) => {
      scenarioGuests = parseInt(e.target.value, 10);
      guestNumInput.value = String(scenarioGuests);
      guestDisplay.textContent = `${scenarioGuests} guests`;
      guestSlider.setAttribute("aria-valuenow", String(scenarioGuests));
      guestSlider.setAttribute("aria-valuetext", formatIndianAriaValuetext("guests", scenarioGuests));
      debounceWhatIfCalculation();
    };

    guestNumInput.oninput = (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) return;
      if (val < guestRange.min) val = guestRange.min;
      if (val > guestRange.max) val = guestRange.max;
      scenarioGuests = val;
      guestSlider.value = String(scenarioGuests);
      guestDisplay.textContent = `${scenarioGuests} guests`;
      guestSlider.setAttribute("aria-valuenow", String(scenarioGuests));
      guestSlider.setAttribute("aria-valuetext", formatIndianAriaValuetext("guests", scenarioGuests));
      debounceWhatIfCalculation();
    };

    // Connect Budget inputs
    budgetSlider.oninput = (e) => {
      scenarioBudgetInr = parseInt(e.target.value, 10);
      budgetNumInput.value = String(scenarioBudgetInr);
      budgetDisplay.textContent = formatINR(scenarioBudgetInr);
      budgetSlider.setAttribute("aria-valuenow", String(scenarioBudgetInr));
      budgetSlider.setAttribute("aria-valuetext", formatIndianAriaValuetext("budget", scenarioBudgetInr));
      debounceWhatIfCalculation();
    };

    budgetNumInput.oninput = (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) return;
      if (val < budgetRange.min) val = budgetRange.min;
      if (val > budgetRange.max) val = budgetRange.max;
      scenarioBudgetInr = val;
      budgetSlider.value = String(scenarioBudgetInr);
      budgetDisplay.textContent = formatINR(scenarioBudgetInr);
      budgetSlider.setAttribute("aria-valuenow", String(scenarioBudgetInr));
      budgetSlider.setAttribute("aria-valuetext", formatIndianAriaValuetext("budget", scenarioBudgetInr));
      debounceWhatIfCalculation();
    };

    const diffText = h("p", { id: "whatif-diff-text", class: "what-if-diff-sentence" }, "Matches your saved plan.");

    // "Try different numbers" Card
    const whatIfCard = h(
      "div",
      { class: "what-if-card" },
      h(
        "div",
        { class: "what-if-header" },
        h("h3", { class: "what-if-title" }, "Try different numbers"),
        h("p", { class: "what-if-desc" }, "Drag the sliders to see how guests and budget change the split. Nothing is saved until you press Keep.")
      ),
      h(
        "div",
        { class: "what-if-controls-grid" },
        // Guest Column
        h(
          "div",
          { class: "what-if-col" },
          h(
            "div",
            { class: "what-if-field-header" },
            h("label", { for: "whatif-guests-slider", class: "what-if-field-label" }, "Guests"),
            guestDisplay
          ),
          h(
            "div",
            { class: "what-if-input-row" },
            h(
              "div",
              { class: "what-if-slider-track-wrap" },
              guestSlider,
              guestTick
            ),
            guestNumInput
          )
        ),

        // Budget Column
        h(
          "div",
          { class: "what-if-col" },
          h(
            "div",
            { class: "what-if-field-header" },
            h("label", { for: "whatif-budget-slider", class: "what-if-field-label" }, "Total budget"),
            budgetDisplay
          ),
          h(
            "div",
            { class: "what-if-input-row" },
            h(
              "div",
              { class: "what-if-slider-track-wrap" },
              budgetSlider,
              budgetTick
            ),
            budgetNumInput
          )
        )
      ),

      // Plain language difference sentence
      diffText,

      // Action row below sliders
      h(
        "div",
        { class: "what-if-actions-row" },
        h(
          "button",
          {
            type: "button",
            id: "whatif-save-scenario-btn",
            class: "btn btn-primary btn-sm",
            onclick: () => {
              updateEvent(this.event.id, {
                scenarioBudget: currentBudget,
              });
              this.event.scenarioBudget = currentBudget;
              const diffMsg = document.getElementById("whatif-diff-text");
              if (diffMsg) {
                diffMsg.textContent = "Saved as the active ledger balance for this celebration.";
              }
              if (ctx) ctx.announce("Saved new numbers to plan.");
            },
          },
          "Keep these numbers"
        ),
        h(
          "button",
          {
            type: "button",
            id: "whatif-reset-btn",
            class: "btn btn-text btn-sm",
            onclick: () => {
              updateEvent(this.event.id, { scenarioBudget: null });
              this.event.scenarioBudget = null;
              scenarioGuests = ev.guest_count;
              scenarioBudgetInr = originalBudget.total_budget_inr;

              guestSlider.value = String(scenarioGuests);
              guestNumInput.value = String(scenarioGuests);
              guestDisplay.textContent = `${scenarioGuests} guests`;

              budgetSlider.value = String(scenarioBudgetInr);
              budgetNumInput.value = String(scenarioBudgetInr);
              budgetDisplay.textContent = formatINR(scenarioBudgetInr);

              currentBudget = originalBudget;
              const ledgerBox = document.getElementById("active-ledger-container");
              if (ledgerBox) {
                ledgerBox.replaceChildren(this.renderLedgerContent(currentBudget));
              }

              const diffMsg = document.getElementById("whatif-diff-text");
              if (diffMsg) {
                diffMsg.textContent = "Matches your saved plan.";
              }
              if (ctx) ctx.announce("Reset budget to original plan.");
            },
          },
          "Reset to original"
        )
      ),

      // Polite screen reader live announcer
      h("div", { id: "whatif-live-announcer", class: "sr-only", "aria-live": "polite", "aria-atomic": "true" })
    );

    panel.appendChild(whatIfCard);

    // Ledger Card Container
    const ledgerCard = h(
      "div",
      { id: "active-ledger-container", class: "ledger-card" },
      this.renderLedgerContent(currentBudget)
    );
    panel.appendChild(ledgerCard);

    const debounceWhatIfCalculation = () => {
      if (this.whatifDebounceTimer) clearTimeout(this.whatifDebounceTimer);
      this.whatifDebounceTimer = setTimeout(async () => {
        const payload = {
          event_type: ev.event_type,
          event_date: ev.event_date,
          guest_count: scenarioGuests,
          budget_inr: scenarioBudgetInr,
          city: ev.city,
          city_tier: ev.city_tier,
          dietary_preferences: ev.dietary_preferences || ["vegetarian"],
          indoor_outdoor: ev.indoor_outdoor || ev.venue_setting || "indoor",
        };
        const cacheKey = `${payload.event_type}-${payload.guest_count}-${payload.budget_inr}-${payload.city_tier}`;

        // Announce politely
        const announcer = document.getElementById("whatif-live-announcer");
        if (announcer) {
          announcer.textContent = `Calculating allocation for ${formatIndianAriaValuetext("guests", scenarioGuests)} and ${formatIndianAriaValuetext("budget", scenarioBudgetInr)}`;
        }

        if (this.whatifCache.has(cacheKey)) {
          applyScenarioResult(this.whatifCache.get(cacheKey));
          return;
        }

        if (this.whatifAbortController) this.whatifAbortController.abort();
        this.whatifAbortController = new AbortController();

        try {
          const res = await fetchBudget(payload, this.whatifAbortController.signal);
          this.whatifCache.set(cacheKey, res);
          applyScenarioResult(res);
        } catch (err) {
          if (err && err.name === "AbortError") return;
          console.warn("What-if calculation failed", err);
        }
      }, 250);
    };

    const applyScenarioResult = (result) => {
      if (!result || !result.budget) return;
      currentBudget = result.budget;

      // Update ledger container
      const ledgerBox = document.getElementById("active-ledger-container");
      if (ledgerBox) {
        ledgerBox.replaceChildren(this.renderLedgerContent(currentBudget));
      }

      // Calculate plain language diff sentence
      const diffInr = currentBudget.total_budget_inr - originalBudget.total_budget_inr;
      const diffGuests = scenarioGuests - ev.guest_count;

      let maxDiffCat = null;
      let maxDiffVal = 0;
      if (currentBudget.categories && originalBudget.categories) {
        currentBudget.categories.forEach((cat) => {
          const orig = originalBudget.categories.find((c) => c.category_slug === cat.category_slug);
          if (orig) {
            const delta = cat.allocated_inr - orig.allocated_inr;
            if (Math.abs(delta) > Math.abs(maxDiffVal)) {
              maxDiffVal = delta;
              maxDiffCat = cat.name;
            }
          }
        });
      }

      const diffTextEl = document.getElementById("whatif-diff-text");
      if (diffTextEl) {
        if (maxDiffCat && maxDiffVal !== 0) {
          const dir = maxDiffVal > 0 ? "more" : "less";
          diffTextEl.textContent = `That's ${formatINR(Math.abs(maxDiffVal))} ${dir} on ${maxDiffCat.toLowerCase()} than your plan.`;
        } else if (diffInr !== 0) {
          const dir = diffInr > 0 ? "more" : "less";
          diffTextEl.textContent = `That's ${formatINR(Math.abs(diffInr))} ${dir} overall than your plan.`;
        } else if (diffGuests !== 0) {
          const gDir = diffGuests > 0 ? "more" : "fewer";
          diffTextEl.textContent = `That's ${Math.abs(diffGuests)} ${gDir} guests than your plan.`;
        } else {
          diffTextEl.textContent = "Matches your saved plan.";
        }
      }
    };

    return panel;
  },

  renderLedgerContent(budget) {
    const root = h("div", { class: "ledger-rows-block" });

    // Table Header Row: Category | Amount | Share
    root.appendChild(
      h(
        "div",
        { class: "ledger-grid-header", role: "row" },
        h("span", { class: "ledger-head-name", role: "columnheader" }, "Category"),
        h("span", { class: "ledger-head-amount", role: "columnheader" }, "Amount"),
        h("span", { class: "ledger-head-share", role: "columnheader" }, "Share")
      )
    );

    // Categories List
    const rowsContainer = h("div", { class: "ledger-entries-list", role: "rowgroup" });
    budget.categories.forEach((cat) => {
      const barFill = h("div", { class: "ledger-bar-fill" });
      barFill.style.width = `${Math.min(100, Math.max(2, cat.percentage))}%`;

      const row = h(
        "div",
        { class: "ledger-grid-row", role: "row" },
        h("span", { class: "ledger-row-name" }, cat.name),
        h("span", { class: "ledger-row-amount font-tabular" }, formatINR(cat.allocated_inr)),
        h("span", { class: "ledger-row-share font-tabular" }, `${cat.percentage.toFixed(1)}%`),
        cat.description ? h("p", { class: "ledger-row-desc" }, cat.description) : null,
        h("div", { class: "ledger-bar-track", "aria-hidden": "true" }, barFill)
      );
      rowsContainer.appendChild(row);
    });
    root.appendChild(rowsContainer);

    // Contingency reserve Row (separated by single rule)
    const contingencyBarFill = h("div", { class: "ledger-bar-fill contingency-bar-fill" });
    contingencyBarFill.style.width = `${Math.min(100, Math.max(2, budget.contingency_percentage))}%`;

    const contingencyRow = h(
      "div",
      { class: "ledger-grid-row ledger-contingency-row", role: "row" },
      h("span", { class: "ledger-row-name" }, "Contingency reserve"),
      h("span", { class: "ledger-row-amount font-tabular" }, formatINR(budget.contingency_inr)),
      h("span", { class: "ledger-row-share font-tabular" }, `${budget.contingency_percentage}%`),
      h("p", { class: "ledger-row-desc" }, "Reserved for unexpected logistical contingencies and weather mitigations."),
      h("div", { class: "ledger-bar-track", "aria-hidden": "true" }, contingencyBarFill)
    );
    root.appendChild(contingencyRow);

    // Total Row (heavier double rule above)
    const totalRow = h(
      "div",
      { class: "ledger-total-row", role: "row" },
      h(
        "div",
        { class: "ledger-total-label-cell" },
        h("span", { class: "ledger-total-name" }, "Total"),
        h("span", { class: "ledger-total-note" }, "Adds up to your budget, to the rupee.")
      ),
      h("span", { class: "ledger-total-amount font-tabular" }, formatINR(budget.total_budget_inr)),
      h("span", { class: "ledger-total-share font-tabular" }, "100%")
    );
    root.appendChild(totalRow);

    return root;
  },
  },

  // -------------------------------------------------------------------
  // Component Builders: Timeline with Calendar Export
  // -------------------------------------------------------------------
  buildTimelinePanel(timeline, eventId, eventTitle) {
    const panel = h(
      "section",
      {
        id: "panel-timeline",
        role: "tabpanel",
        "aria-labelledby": "tab-timeline",
        tabindex: "0",
        class: `programme-panel ${this.activeTab === "tab-timeline" ? "" : "is-hidden"}`,
      },
      h(
        "div",
        { class: "panel-masthead" },
        h("h2", { class: "panel-headline" }, "Backwards-scheduled run-of-show timeline"),
        h("p", { class: "panel-deck" }, "Key milestones leading up to the celebration, followed by a minute-by-minute schedule for the day itself."),
        h("hr", { class: "panel-divider-rule", "aria-hidden": "true" })
      ),

      // Calendar Export Action Banner
      h(
        "div",
        { class: "timeline-export-banner" },
        h("div", {},
          h("strong", {}, "Sync with Calendar: "),
          h("span", {}, "Export milestone deadlines to Google Calendar, Apple Calendar, or Outlook.")
        ),
        h(
          "button",
          {
            type: "button",
            class: "btn btn-outline btn-sm",
            onclick: () => {
              const icsText = generateICS(eventId, eventTitle, timeline.tasks);
              downloadICS(icsText, `${eventId}-timeline.ics`);
            },
          },
          "Add to Calendar (.ics)"
        )
      ),

      // Timeline Schedule List
      h(
        "div",
        { class: "timeline-schedule" },
        ...timeline.tasks.map((task) => {
          const isOverdue = task.status === "overdue_compressed";
          const deadline = task.target_date || task.deadline_date;
          return h(
            "article",
            { id: `task-${task.task_id}`, class: `timeline-card ${isOverdue ? "is-overdue" : ""}`, tabindex: "0" },
            h(
              "div",
              { class: "task-status-rail" },
              h("span", { class: "task-rail-glyph" }, isOverdue ? "!" : "·")
            ),
            h(
              "div",
              { class: "task-body" },
              h(
                "div",
                { class: "task-header-row" },
                h("h3", { class: "task-title" }, task.title),
                h("span", { class: "task-deadline-tag" }, deadline ? formatDate(deadline) : `${task.lead_time_days || 0} days prior`)
              ),
              h("p", { class: "task-description" }, task.advice || task.description || ""),
              h(
                "div",
                { class: "task-meta-foot" },
                h("span", { class: "task-priority-tag" }, `Priority: ${humanLabel(task.priority || "important")}`),
                h("span", { class: "task-vendor-stage" }, `Status: ${humanLabel(task.status || "on_track")}`)
              )
            )
          );
        })
      )
    );

    return panel;
  },

  // -------------------------------------------------------------------
  // Component Builders: Vendor Checklist with Focus Filter
  // -------------------------------------------------------------------
  buildChecklistPanel(checklist, timeline, checkedArray) {
    const checkedSet = new Set(Array.isArray(checkedArray) ? checkedArray : []);
    const allItems = checklist.categories ? checklist.categories.flatMap((c) => c.items || []) : (checklist.items || []);
    const totalItems = allItems.length;
    const completedCount = checkedSet.size;

    const panel = h(
      "section",
      {
        id: "panel-checklist",
        role: "tabpanel",
        "aria-labelledby": "tab-checklist",
        tabindex: "0",
        class: `programme-panel ${this.activeTab === "tab-checklist" ? "" : "is-hidden"}`,
      },
      h(
        "div",
        { class: "panel-masthead" },
        h("h2", { class: "panel-headline" }, "Vendor diligence and compliance checklist"),
        h("p", { class: "panel-deck" }, "Practical tasks to tackle, organized by priority so you can focus on what matters next."),
        h("hr", { class: "panel-divider-rule", "aria-hidden": "true" })
      ),

      // Progress & Filter Toolbar
      h(
        "div",
        { class: "checklist-toolbar" },
        h(
          "div",
          { class: "progress-counter-box" },
          h("span", { id: "chk-progress-text", class: "progress-label" }, `${completedCount} of ${totalItems} items completed`),
          h("progress", {
            id: "chk-progress-bar",
            class: "native-checklist-progress",
            value: completedCount,
            max: Math.max(1, totalItems),
            "aria-label": "Checklist completion progress",
          })
        ),

        // Filter Toggle Buttons (Do this week / All / Only left)
        h(
          "div",
          { class: "checklist-filter-buttons", role: "group", "aria-label": "Checklist view filters" },
          h(
            "button",
            {
              type: "button",
              class: `btn btn-xs ${this.checklistFilter === "this_week" ? "btn-primary" : "btn-outline"}`,
              onclick: (e) => this.setChecklistFilter("this_week", e.target),
            },
            "Do this week"
          ),
          h(
            "button",
            {
              type: "button",
              class: `btn btn-xs ${this.checklistFilter === "all" ? "btn-primary" : "btn-outline"}`,
              onclick: (e) => this.setChecklistFilter("all", e.target),
            },
            "All items"
          ),
          h(
            "button",
            {
              type: "button",
              class: `btn btn-xs ${this.checklistFilter === "pending" ? "btn-primary" : "btn-outline"}`,
              onclick: (e) => this.setChecklistFilter("pending", e.target),
            },
            "Only left"
          )
        )
      ),

      // Categories and Checklist Items
      h(
        "div",
        { id: "checklist-categories-list", class: "checklist-categories-list" },
        ...checklist.categories.map((cat) => {
          return h(
            "div",
            { class: "checklist-category-block", "data-cat-slug": cat.category_slug },
            h("h3", { class: "category-headline" }, cat.category_name),
            h(
              "div",
              { class: "category-items-list" },
              ...cat.items.map((item) => {
                const isChecked = checkedSet.has(item.item_id);
                const isThisWeek = this.isTaskDueThisWeek(item, timeline);

                return h(
                  "div",
                  {
                    class: `checklist-item-row ${isChecked ? "is-completed" : ""}`,
                    "data-item-id": item.item_id,
                    "data-checked": String(isChecked),
                    "data-this-week": String(isThisWeek),
                  },
                  h("input", {
                    type: "checkbox",
                    id: `chk-${item.item_id}`,
                    class: "checklist-checkbox",
                    checked: isChecked,
                    onchange: (e) => {
                      if (e.target.checked) {
                        checkedSet.add(item.item_id);
                      } else {
                        checkedSet.delete(item.item_id);
                      }
                      updateEvent(this.event.id, {
                        checkedItems: Array.from(checkedSet),
                      });
                      this.updateChecklistProgress(checkedSet.size, totalItems);
                      e.target.closest(".checklist-item-row").classList.toggle("is-completed", e.target.checked);
                      e.target.closest(".checklist-item-row").dataset.checked = String(e.target.checked);
                      this.checkCategoryCompletion(cat.category_slug);
                    },
                  }),
                  h(
                    "label",
                    { for: `chk-${item.item_id}`, class: "checklist-item-label" },
                    h("span", { class: "checklist-task-title" }, item.text || item.task || item.title || "Checklist Item"),
                    (item.what_to_ask && item.what_to_ask.length)
                      ? h("span", { class: "checklist-task-detail" }, `Ask: ${item.what_to_ask[0]}`)
                      : (item.what_to_verify && item.what_to_verify.length)
                      ? h("span", { class: "checklist-task-detail" }, `Verify: ${item.what_to_verify[0]}`)
                      : item.description
                      ? h("span", { class: "checklist-task-detail" }, item.description)
                      : null
                  )
                );
              })
            ),
            h("div", { id: `cat-ack-${cat.category_slug}`, class: "category-completion-ack is-hidden" }, "All diligence items in this category completed.")
          );
        })
      )
    );

    // Initial filter pass
    requestAnimationFrame(() => this.filterChecklistRows(panel));
    return panel;
  },

  isTaskDueThisWeek(checklistItem, timeline) {
    if (!timeline || !timeline.tasks) return true;
    const task = timeline.tasks.find((t) => t.category === checklistItem.category_slug || t.task_id === checklistItem.item_id);
    if (!task) return true;
    if (task.status === "overdue_compressed" || task.status === "due_soon") return true;
    const deadline = task.target_date || task.deadline_date;
    if (deadline) {
      const parts = String(deadline).split("-");
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
    }
    return (task.days_until_deadline !== undefined) ? task.days_until_deadline <= 7 : true;
  },

  setChecklistFilter(filterKey, buttonEl) {
    this.checklistFilter = filterKey;
    const buttons = document.querySelectorAll(".checklist-filter-buttons button");
    buttons.forEach((b) => {
      b.classList.remove("btn-primary");
      b.classList.add("btn-outline");
    });
    if (buttonEl) {
      buttonEl.classList.add("btn-primary");
      buttonEl.classList.remove("btn-outline");
    }
    const panel = document.getElementById("panel-checklist");
    if (panel) this.filterChecklistRows(panel);
  },

  filterChecklistRows(panel) {
    const rows = panel.querySelectorAll(".checklist-item-row");
    rows.forEach((row) => {
      const isChecked = row.dataset.checked === "true";
      const isThisWeek = row.dataset.thisWeek === "true";

      if (this.checklistFilter === "this_week") {
        row.classList.toggle("is-hidden", !isThisWeek);
      } else if (this.checklistFilter === "pending") {
        row.classList.toggle("is-hidden", isChecked);
      } else {
        row.classList.remove("is-hidden");
      }
    });
  },

  updateChecklistProgress(completed, total) {
    const textEl = document.getElementById("chk-progress-text");
    const barEl = document.getElementById("chk-progress-bar");
    if (textEl) textEl.textContent = `${completed} of ${total} items completed`;
    if (barEl) barEl.value = completed;
  },

  checkCategoryCompletion(categorySlug) {
    const catBlock = document.querySelector(`.checklist-category-block[data-cat-slug="${categorySlug}"]`);
    if (!catBlock) return;
    const checkboxes = Array.from(catBlock.querySelectorAll(".checklist-checkbox"));
    const allChecked = checkboxes.length > 0 && checkboxes.every((cb) => cb.checked);
    const ack = document.getElementById(`cat-ack-${categorySlug}`);
    if (ack) {
      ack.classList.toggle("is-hidden", !allChecked);
    }
  },

  // -------------------------------------------------------------------
  // Component Builders: Creative Ideas with Shortlist
  // -------------------------------------------------------------------
  buildIdeasPanel(ideas, ev, shortlistArray, ctx) {
    const shortlistSet = new Set(Array.isArray(shortlistArray) ? shortlistArray : []);

    const panel = h(
      "section",
      {
        id: "panel-ideas",
        role: "tabpanel",
        "aria-labelledby": "tab-ideas",
        tabindex: "0",
        class: `programme-panel ${this.activeTab === "tab-ideas" ? "" : "is-hidden"}`,
      },
      h(
        "div",
        { class: "panel-masthead" },
        h("h2", { class: "panel-headline" }, "Creative themes and culinary concepts"),
        h("p", { class: "panel-deck" }, "Themes, menus and cultural touches tailored to your celebration. Pick what resonates and ignore the rest."),
        h(
          "p",
          { class: "programme-source-notice" },
          ideas.source === "ai"
            ? "Written specifically for your celebration by Google Gemini."
            : "From our curated collection."
        ),
        h("hr", { class: "panel-divider-rule", "aria-hidden": "true" })
      ),

      // "Your Shortlist" Block
      h(
        "div",
        { id: "shortlist-card-block", class: "shortlist-curation-card" },
        h("h3", { class: "shortlist-headline" }, "Your Shortlist"),
        h("div", { id: "shortlist-chips-container", class: "shortlist-chips-list" },
          ...this.renderShortlistChips(shortlistSet)
        )
      ),

      // Creative Themes
      h(
        "div",
        { class: "ideas-group" },
        h("h3", { class: "ideas-group-title" }, "Celebratory Themes"),
        h(
          "div",
          { class: "themes-grid" },
          ...ideas.themes.map((theme) => {
            const isKept = shortlistSet.has(theme.name);
            return h(
              "article",
              { class: "theme-item-card" },
              h(
                "div",
                { class: "item-header-row" },
                h("h4", { class: "item-title" }, theme.name),
                h(
                  "button",
                  {
                    type: "button",
                    class: `shortlist-toggle-btn ${isKept ? "is-kept" : ""}`,
                    "aria-pressed": String(isKept),
                    onclick: (e) => this.toggleShortlist(theme.name, e.target, shortlistSet),
                  },
                  isKept ? "Kept" : "Keep"
                )
              ),
              h("p", { class: "item-deck" }, theme.description),
              theme.dress_code ? h("p", { class: "theme-dress-code" }, `Dress Code: ${theme.dress_code}`) : null,
              h(
                "ul",
                { class: "theme-elements-list" },
                ...(theme.decor_elements || []).map((el) => h("li", {}, el))
              )
            );
          })
        )
      ),

      // Activities
      h(
        "div",
        { class: "ideas-group" },
        h("h3", { class: "ideas-group-title" }, "Atmosphere & Engaging Activities"),
        h(
          "div",
          { class: "activities-grid" },
          ...ideas.activities.map((act) => {
            const isKept = shortlistSet.has(act.title);
            return h(
              "article",
              { class: "activity-card" },
              h(
                "div",
                { class: "item-header-row" },
                h("h4", { class: "item-title" }, act.title),
                h(
                  "button",
                  {
                    type: "button",
                    class: `shortlist-toggle-btn ${isKept ? "is-kept" : ""}`,
                    "aria-pressed": String(isKept),
                    onclick: (e) => this.toggleShortlist(act.title, e.target, shortlistSet),
                  },
                  isKept ? "Kept" : "Keep"
                )
              ),
              h("p", { class: "item-deck" }, act.description),
              h("span", { class: "activity-audience" }, `Ideal for: ${act.suitable_for || "All Guests"}`)
            );
          })
        )
      ),

      // Refinement Strip with Neutral "Show me different ideas"
      h(
        "div",
        { class: "refinement-dock" },
        h("h3", { class: "refinement-headline" }, "Refine or Refresh Creative Ideas"),
        h(
          "div",
          { class: "refinement-form-row" },
          h("label", { for: "refinement-prompt-input", class: "sr-only" }, "Refinement prompt"),
          h("input", {
            type: "text",
            id: "refinement-prompt-input",
            placeholder: "e.g. More traditional Rajasthani folk music, royal velvet decor...",
            maxlength: "200",
            class: "form-input",
          }),
          h(
            "button",
            {
              type: "button",
              class: "btn btn-primary",
              onclick: () => this.handleCustomRefinement(ev, ctx),
            },
            "Refine"
          ),
          h(
            "button",
            {
              type: "button",
              class: "btn btn-outline",
              onclick: () => this.handleShowDifferentIdeas(ev, ctx),
            },
            "Show me different ideas"
          )
        ),
        h("div", { id: "refinement-status-msg", class: "refine-status-line", "aria-live": "polite" })
      )
    );

    return panel;
  },

  renderShortlistChips(shortlistSet) {
    if (shortlistSet.size === 0) {
      return [
        h(
          "span",
          { class: "shortlist-empty-text" },
          "No items shortlisted yet. Click 'Keep' on any theme or activity below to curate your favorites."
        ),
      ];
    }
    return Array.from(shortlistSet).map((name) => {
      return h(
        "span",
        { class: "shortlist-item-chip" },
        name,
        h(
          "button",
          {
            type: "button",
            class: "chip-remove-btn",
            "aria-label": `Remove ${name} from shortlist`,
            onclick: () => {
              shortlistSet.delete(name);
              updateEvent(this.event.id, { shortlist: Array.from(shortlistSet) });
              this.refreshShortlistUI(shortlistSet);
            },
          },
          "×"
        )
      );
    });
  },

  toggleShortlist(itemName, buttonEl, shortlistSet) {
    if (shortlistSet.has(itemName)) {
      shortlistSet.delete(itemName);
      if (buttonEl) {
        buttonEl.classList.remove("is-kept");
        buttonEl.setAttribute("aria-pressed", "false");
        buttonEl.textContent = "Keep";
      }
    } else {
      shortlistSet.add(itemName);
      if (buttonEl) {
        buttonEl.classList.add("is-kept");
        buttonEl.setAttribute("aria-pressed", "true");
        buttonEl.textContent = "Kept";
      }
    }
    updateEvent(this.event.id, { shortlist: Array.from(shortlistSet) });
    this.refreshShortlistUI(shortlistSet);
  },

  refreshShortlistUI(shortlistSet) {
    const container = document.getElementById("shortlist-chips-container");
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    this.renderShortlistChips(shortlistSet).forEach((ch) => container.appendChild(ch));

    // Update button states on ideas cards
    const buttons = document.querySelectorAll(".shortlist-toggle-btn");
    buttons.forEach((b) => {
      const cardTitle = b.closest("article")?.querySelector(".item-title")?.textContent;
      if (cardTitle) {
        const isKept = shortlistSet.has(cardTitle);
        b.classList.toggle("is-kept", isKept);
        b.setAttribute("aria-pressed", String(isKept));
        b.textContent = isKept ? "Kept" : "Keep";
      }
    });
  },

  async handleCustomRefinement(ev, ctx) {
    const input = document.getElementById("refinement-prompt-input");
    const prompt = input ? input.value.trim() : "";
    if (!prompt || prompt.length < 3) {
      window.alert("Please enter at least 3 characters for your refinement instructions.");
      return;
    }
    this.executeRefinement(ev, prompt, ctx);
  },

  async handleShowDifferentIdeas(ev, ctx) {
    this.executeRefinement(ev, "Provide alternative creative themes, cultural activities, and decor concepts", ctx);
  },

  async executeRefinement(ev, prompt, ctx) {
    if (this.refining) return;
    this.refining = true;

    const statusMsg = document.getElementById("refinement-status-msg");
    const refineBtns = document.querySelectorAll(".refinement-actions .btn");
    refineBtns.forEach((b) => {
      b.disabled = true;
    });
    if (statusMsg) statusMsg.textContent = "Generating fresh ideas from Google Gemini...";

    try {
      const newIdeas = await refinePlan(ev, prompt);
      this.refining = false;
      refineBtns.forEach((b) => {
        b.disabled = false;
      });
      const updatedPlan = { ...this.event.plan, ideas: newIdeas };
      this.event.plan = updatedPlan;
      updateEvent(this.event.id, { plan: updatedPlan });
      if (statusMsg) statusMsg.textContent = "Ideas refreshed.";
      if (ctx) ctx.announce("Fresh ideas generated.");

      // Replace the ideas panel contents in place without navigating
      const panelIdeas = document.getElementById("panel-ideas");
      if (panelIdeas && panelIdeas.parentNode) {
        const newPanel = this.buildIdeasPanel(newIdeas, ev, this.event.shortlist, ctx);
        panelIdeas.parentNode.replaceChild(newPanel, panelIdeas);
      }
    } catch (err) {
      this.refining = false;
      refineBtns.forEach((b) => {
        b.disabled = false;
      });
      if (statusMsg) statusMsg.textContent = err.userMessage || "Could not refresh ideas. Please try again.";
    }
  },

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  computeCountdown(dateStr) {
    if (!dateStr) return { days: 0, text: "" };
    try {
      const parts = dateStr.split("-");
      const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return { days: 0, text: "Today is the day of celebration" };
      if (diffDays === 1) return { days: 1, text: "1 day to go — tomorrow is the day!" };
      if (diffDays > 1) return { days: diffDays, text: `${diffDays} days to go` };
      const past = Math.abs(diffDays);
      return { days: diffDays, text: `Celebrated ${past} ${past === 1 ? "day" : "days"} ago` };
    } catch {
      return { days: 0, text: "" };
    }
  },

  buildSummarySentence(ev, budget) {
    const type = humanLabel(ev.event_type || "celebration");
    const city = ev.city || "your city";
    const guests = pluralize(ev.guest_count || 100, "attendee");
    const amount = formatINR(budget.total_budget_inr);
    const setting = humanLabel(ev.indoor_outdoor || ev.venue_setting || "indoor");
    return `A ${amount} ${setting.toLowerCase()} ${type.toLowerCase()} in ${city} for ${guests} with balanced category allocations.`;
  },

  formatFeasibilitySentence(feasibility) {
    if (!feasibility) return "Feasibility confirmed.";
    const verdicts = {
      comfortable: "Comfortable — Planned spend allows premium hospitality benchmarks and comfortable vendor margins.",
      tight: "Tight — Spend is below typical market baselines; strict negotiation and lean guest counts advised.",
      unrealistic: "Unrealistic — Allocation is significantly below essential venue and food floors for this headcount.",
    };
    return verdicts[feasibility.verdict] || feasibility.message || "Balanced planning allocation.";
  },

  renderMostUrgentAction(timeline) {
    if (!timeline || !timeline.tasks || timeline.tasks.length === 0) return null;
    const urgent = timeline.tasks.find((t) => t.status === "overdue_compressed") ||
                   timeline.tasks.find((t) => t.priority === "critical") ||
                   timeline.tasks[0];
    if (!urgent) return null;

    const deadline = urgent.target_date || urgent.deadline_date;
    const deadlineText = deadline ? `Due ${formatDate(deadline)}` : "";

    return h(
      "div",
      { class: "urgent-action-banner" },
      h("div", { class: "urgent-text-content" },
        h("span", { class: "urgent-marker" }, urgent.status === "overdue_compressed" ? "Immediate Action Required" : "Most Urgent Milestone"),
        h("p", { class: "urgent-task-line" }, `${urgent.title}${deadlineText ? ` — ${deadlineText}` : ""}`)
      ),
      h(
        "button",
        {
          type: "button",
          class: "btn btn-outline btn-sm",
          onclick: () => {
            this.switchTab("tab-timeline");
            setTimeout(() => {
              const el = document.getElementById(`task-${urgent.task_id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.focus();
              }
            }, 100);
          },
        },
        "Jump to Task →"
      )
    );
  },

  async copySummaryToClipboard(btnEl) {
    if (!this.event) return;
    const ev = this.event.formInputs;
    const b = this.event.scenarioBudget || this.event.plan.budget;
    const summaryLines = [
      `=== ${this.event.title.toUpperCase()} ===`,
      `Date: ${formatDate(ev.event_date)} (${this.computeCountdown(ev.event_date).text})`,
      `Location: ${ev.city} (${ev.city_tier})`,
      `Attendees: ${ev.guest_count}`,
      `Total Budget: ${formatINR(b.total_budget_inr)} (${formatINR(b.cost_per_guest_inr)} / guest)`,
      `Contingency Cushion: ${formatINR(b.contingency_inr)} (${b.contingency_percentage}%)`,
      "",
      "--- CATEGORY ALLOCATIONS ---",
      ...b.categories.map((c) => `• ${c.name}: ${formatINR(c.allocated_inr)} (${c.percentage.toFixed(1)}%)`),
      "",
      `Generated with Utsav Planner`,
    ];

    const textToCopy = summaryLines.join("\n");
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (btnEl) {
      const origText = btnEl.textContent;
      btnEl.textContent = copied ? "Copied!" : "Selected";
      setTimeout(() => {
        btnEl.textContent = origText;
      }, 2000);
    }
  },

  unmount() {
    this.refining = false;
    if (this.whatifDebounceTimer) {
      clearTimeout(this.whatifDebounceTimer);
      this.whatifDebounceTimer = null;
    }
    if (this.whatifAbortController) {
      this.whatifAbortController.abort();
      this.whatifAbortController = null;
    }
  },
};
