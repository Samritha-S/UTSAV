/**
 * Utsav Planner - Safe DOM Rendering Module
 *
 * Implements accessible, semantic rendering of the planning dashboard.
 *
 * STRICT SECURITY:
 * - Built 100% using the safe `h()` DOM helper (document.createElement/textContent).
 * - Zero occurrences of innerHTML, outerHTML, insertAdjacentHTML, document.write, or eval.
 * - All text from API and AI is treated as untrusted text.
 */

import { formatINR, formatINRWords, formatDate, h } from "./utils.js";
import { store } from "./state.js";
import { refinePlan } from "./api.js";

/**
 * Render complete results view inside the dashboard container.
 * @param {HTMLElement} container
 * @param {Object} plan - PlanResponse
 * @param {string} activeTabId
 * @param {Set<string>} checkedItems
 */
export function renderDashboard(container, plan, activeTabId, checkedItems) {
  // Clear container safely without innerHTML
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (!plan) return;

  const frag = document.createDocumentFragment();

  // 1. Summary Header Card
  frag.appendChild(createSummaryHeader(plan));

  // 2. Global Actions Bar (Print & Start Over)
  frag.appendChild(createDashboardActions(plan));

  // 3. Tab Navigation (WAI-ARIA Tablist)
  frag.appendChild(createTablist(activeTabId));

  // 4. Tab Panels
  const panelsContainer = h("div", { class: "tabpanels-container" });
  panelsContainer.appendChild(renderBudgetPanel(plan.budget, activeTabId === "tab-budget"));
  panelsContainer.appendChild(renderTimelinePanel(plan.timeline, activeTabId === "tab-timeline"));
  panelsContainer.appendChild(renderChecklistPanel(plan.checklist, checkedItems, activeTabId === "tab-checklist"));
  panelsContainer.appendChild(renderIdeasPanel(plan.ideas, plan.event_summary, activeTabId === "tab-ideas"));

  frag.appendChild(panelsContainer);
  container.appendChild(frag);
}

/**
 * Summary Header with key milestone metrics.
 */
function createSummaryHeader(plan) {
  const ev = plan.event_summary;
  const b = plan.budget;
  const t = plan.timeline;

  const typeLabels = {
    wedding: "Traditional Wedding",
    birthday: "Birthday Celebration",
    community: "Community Festival",
  };

  return h(
    "section",
    { class: "summary-card", "aria-labelledby": "plan-summary-heading" },
    h(
      "div",
      { class: "summary-top" },
      h("h2", { id: "plan-summary-heading", class: "summary-title" }, typeLabels[ev.event_type] || ev.event_type),
      h("span", { class: "badge badge-primary" }, `${ev.city} (${ev.city_tier.toUpperCase()})`)
    ),
    h(
      "div",
      { class: "metrics-grid" },
      h(
        "div",
        { class: "metric-item" },
        h("span", { class: "metric-label" }, "Event Date"),
        h("strong", { class: "metric-value" }, formatDate(ev.event_date)),
        h("span", { class: "metric-subtext" }, `${t.days_remaining} days away (${t.weeks_remaining} weeks)`)
      ),
      h(
        "div",
        { class: "metric-item" },
        h("span", { class: "metric-label" }, "Attendees"),
        h("strong", { class: "metric-value" }, `${ev.guest_count} Guests`),
        h("span", { class: "metric-subtext" }, `Setting: ${ev.venue_setting}`)
      ),
      h(
        "div",
        { class: "metric-item" },
        h("span", { class: "metric-label" }, "Total Budget"),
        h("strong", { class: "metric-value" }, formatINR(b.total_budget_inr)),
        h("span", { class: "metric-subtext" }, formatINRWords(b.total_budget_inr))
      ),
      h(
        "div",
        { class: "metric-item" },
        h("span", { class: "metric-label" }, "Cost Per Guest"),
        h("strong", { class: "metric-value" }, formatINR(b.cost_per_guest_inr)),
        h("span", { class: "metric-subtext" }, `Benchmark floor: ${formatINR(b.feasibility.floor_per_guest_inr)}`)
      )
    )
  );
}

/**
 * Top action bar with Print / PDF and Start Over button.
 */
function createDashboardActions(plan) {
  return h(
    "div",
    { class: "dashboard-actions no-print" },
    h(
      "button",
      {
        type: "button",
        class: "btn btn-secondary btn-sm",
        onClick: () => window.print(),
        "aria-label": "Print or save this event plan as PDF",
      },
      "🖨️ Print / Save as PDF"
    ),
    h(
      "button",
      {
        type: "button",
        class: "btn btn-outline btn-sm",
        onClick: () => {
          if (window.confirm("Are you sure you want to start a new plan? This will clear your current plan.")) {
            store.reset();
            const form = document.getElementById("intake-form");
            if (form) form.scrollIntoView({ behavior: "smooth" });
          }
        },
        "aria-label": "Start over with a blank plan",
      },
      "🔄 Start over"
    )
  );
}

/**
 * Accessible WAI-ARIA Tablist Navigation.
 */
function createTablist(activeTabId) {
  const tabs = [
    { id: "tab-budget", panelId: "panel-budget", label: "💰 Budget & Splits" },
    { id: "tab-timeline", panelId: "panel-timeline", label: "📅 Milestone Timeline" },
    { id: "tab-checklist", panelId: "panel-checklist", label: "📋 Vendor Checklist" },
    { id: "tab-ideas", panelId: "panel-ideas", label: "✨ Creative Ideas" },
  ];

  return h(
    "div",
    { class: "tabs-wrapper no-print" },
    h(
      "div",
      {
        class: "tablist",
        role: "tablist",
        "aria-label": "Event Planning Sections",
      },
      ...tabs.map((tab) => {
        const isSelected = tab.id === activeTabId;
        return h(
          "button",
          {
            type: "button",
            role: "tab",
            id: tab.id,
            "aria-controls": tab.panelId,
            "aria-selected": isSelected ? "true" : "false",
            tabindex: isSelected ? "0" : "-1",
            class: `tab-btn ${isSelected ? "is-active" : ""}`,
            onClick: () => store.setActiveTab(tab.id),
          },
          tab.label
        );
      })
    )
  );
}

/**
 * ---------------------------------------------------------------------
 * Tab 1: Budget Panel
 * ---------------------------------------------------------------------
 */
function renderBudgetPanel(budget, isActive) {
  const f = budget.feasibility;
  const verdictConfigs = {
    comfortable: {
      badgeClass: "badge-success",
      icon: "✅",
      title: "Comfortable Planning Budget",
      text: "Your allocated spend provides generous headroom across all critical verticals.",
    },
    tight: {
      badgeClass: "badge-warning",
      icon: "⚖️",
      title: "Tight Budget - Prioritization Advised",
      text: "Your per-guest spend is close to benchmark minimums. Watch catering and decor quotes closely.",
    },
    unrealistic: {
      badgeClass: "badge-danger",
      icon: "⚠️",
      title: "Budget Stretched - Action Needed",
      text: "Planned budget is below realistic commercial minimums for this attendee scale and city tier.",
    },
  };

  const vConfig = verdictConfigs[f.verdict] || verdictConfigs.tight;

  return h(
    "section",
    {
      role: "tabpanel",
      id: "panel-budget",
      "aria-labelledby": "tab-budget",
      tabindex: "0",
      class: `tabpanel ${isActive ? "" : "is-hidden"}`,
    },
    // Feasibility Banner
    h(
      "div",
      { class: `feasibility-banner ${f.verdict}` },
      h(
        "div",
        { class: "feasibility-header" },
        h("span", { class: `badge ${vConfig.badgeClass}` }, `${vConfig.icon} ${f.verdict.toUpperCase()}`),
        h("h3", { class: "feasibility-title" }, vConfig.title)
      ),
      h("p", { class: "feasibility-text" }, vConfig.text),
      h(
        "div",
        { class: "feasibility-stats" },
        h("span", {}, `Planned spend: ${formatINR(f.actual_per_guest_inr)} / guest`),
        h("span", {}, `• Safe market floor: ${formatINR(f.floor_per_guest_inr)} / guest`)
      ),
      f.suggestions && f.suggestions.length > 0
        ? h(
            "ul",
            { class: "feasibility-suggestions" },
            ...f.suggestions.map((s) => h("li", {}, s))
          )
        : null
    ),

    // Visual Category Bars & Detailed Breakdown Table
    h("h3", { class: "panel-section-title" }, "Itemized Category Allocation"),
    h(
      "div",
      { class: "category-bars-container" },
      ...budget.categories.map((cat) =>
        h(
          "div",
          { class: "category-bar-item" },
          h(
            "div",
            { class: "category-bar-label" },
            h("strong", {}, cat.name),
            h("span", { class: "category-bar-amount" }, `${formatINR(cat.allocated_inr)} (${cat.percentage.toFixed(1)}%)`)
          ),
          h(
            "div",
            { class: "bar-track", "aria-hidden": "true" },
            h("div", {
              class: "bar-fill",
              style: { width: `${Math.min(100, Math.max(3, cat.percentage))}%` },
            })
          ),
          h("p", { class: "category-bar-desc" }, cat.description)
        )
      )
    ),

    // Accessible Data Table
    h(
      "div",
      { class: "table-responsive" },
      h(
        "table",
        { class: "data-table", "aria-label": "Detailed Budget Categories" },
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            h("th", { scope: "col" }, "Expenditure Category"),
            h("th", { scope: "col", class: "text-right" }, "Share"),
            h("th", { scope: "col", class: "text-right" }, "Allocated (INR)"),
            h("th", { scope: "col" }, "Scope Description")
          )
        ),
        h(
          "tbody",
          {},
          ...budget.categories.map((cat) =>
            h(
              "tr",
              {},
              h("td", { class: "font-semibold" }, cat.name),
              h("td", { class: "text-right" }, `${cat.percentage.toFixed(1)}%`),
              h("td", { class: "text-right font-semibold" }, formatINR(cat.allocated_inr)),
              h("td", { class: "text-muted" }, cat.description)
            )
          ),
          // Contingency Row
          h(
            "tr",
            { class: "contingency-row" },
            h("td", { class: "font-semibold" }, "🛡️ Emergency Contingency Cushion"),
            h("td", { class: "text-right" }, `${budget.contingency_percentage.toFixed(1)}%`),
            h("td", { class: "text-right font-semibold" }, formatINR(budget.contingency_inr)),
            h("td", { class: "text-muted" }, "Uncommitted reserve held for unexpected surcharges, extra guest plates, or weather shifts.")
          )
        ),
        h(
          "tfoot",
          {},
          h(
            "tr",
            {},
            h("th", { scope: "row" }, "Total Planned Budget"),
            h("th", { class: "text-right" }, "100.0%"),
            h("th", { class: "text-right" }, formatINR(budget.total_budget_inr)),
            h("th", {}, "")
          )
        )
      )
    ),

    // Disclaimer
    h(
      "p",
      { class: "estimate-disclaimer" },
      "ℹ️ All budget figures are illustrative planning estimates calculated from regional tier benchmarks, not actual vendor quotes. Always verify local rates before signing contracts."
    )
  );
}

/**
 * ---------------------------------------------------------------------
 * Tab 2: Timeline Panel
 * ---------------------------------------------------------------------
 */
function renderTimelinePanel(timeline, isActive) {
  const statusBadge = {
    on_track: { class: "badge-success", text: "✓ On Track" },
    due_soon: { class: "badge-warning", text: "⏳ Due Soon" },
    overdue_compressed: { class: "badge-danger", text: "⚠️ Overdue / Compressed" },
  };

  return h(
    "section",
    {
      role: "tabpanel",
      id: "panel-timeline",
      "aria-labelledby": "tab-timeline",
      tabindex: "0",
      class: `tabpanel ${isActive ? "" : "is-hidden"}`,
    },
    // Most Urgent Action Card
    timeline.most_urgent_action
      ? h(
          "div",
          { class: "urgent-action-card" },
          h("span", { class: "urgent-icon", "aria-hidden": "true" }, "⚡"),
          h(
            "div",
            {},
            h("strong", { class: "urgent-label" }, "Most Urgent Next Step:"),
            h("p", { class: "urgent-text" }, timeline.most_urgent_action)
          )
        )
      : null,

    // Crunch Plan Banner
    timeline.is_crunch_plan
      ? h(
          "div",
          { class: "crunch-banner", role: "alert" },
          h("span", { class: "crunch-icon", "aria-hidden": "true" }, "🚨"),
          h(
            "div",
            {},
            h("strong", {}, "Crunch Planning Mode Active (Event <= 7 Days Away)"),
            h("p", {}, timeline.crunch_summary || "Timeline has been collapsed strictly to critical path deliverables.")
          )
        )
      : null,

    // Task list
    h("h3", { class: "panel-section-title" }, `Milestone Schedule (${timeline.tasks.length} Action Items)`),
    h(
      "div",
      { class: "timeline-list" },
      ...timeline.tasks.map((task) => {
        const badge = statusBadge[task.status] || statusBadge.on_track;
        return h(
          "article",
          { class: `timeline-card ${task.status}` },
          h(
            "div",
            { class: "timeline-card-header" },
            h("h4", { class: "task-title" }, task.title),
            h("span", { class: `badge ${badge.class}` }, badge.text)
          ),
          h(
            "div",
            { class: "task-meta" },
            h("span", { class: "task-deadline" }, `📅 Target Deadline: ${formatDate(task.target_date)}`),
            h("span", { class: "task-lead" }, `Ideal lead time: ${task.lead_time_days} days`),
            h("span", { class: "badge badge-neutral" }, `Priority: ${task.priority.toUpperCase()}`)
          ),
          task.advice
            ? h(
                "div",
                { class: "task-advice-box" },
                h("strong", {}, "💡 Alternative Action Advice: "),
                h("span", {}, task.advice)
              )
            : null
        );
      })
    )
  );
}

/**
 * ---------------------------------------------------------------------
 * Tab 3: Vendor Diligence Checklist Panel
 * ---------------------------------------------------------------------
 */
function renderChecklistPanel(checklist, checkedItems, isActive) {
  // Compute overall completion stats
  let totalItems = 0;
  let doneItems = 0;

  checklist.categories.forEach((cat) => {
    cat.items.forEach((item) => {
      totalItems += 1;
      if (checkedItems.has(item.item_id)) {
        doneItems += 1;
      }
    });
  });

  const progressPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return h(
    "section",
    {
      role: "tabpanel",
      id: "panel-checklist",
      "aria-labelledby": "tab-checklist",
      tabindex: "0",
      class: `tabpanel ${isActive ? "" : "is-hidden"}`,
    },
    // Overall Progress Meter
    h(
      "div",
      { class: "checklist-progress-card" },
      h(
        "div",
        { class: "progress-label-row" },
        h("strong", {}, "Vendor Diligence Progress"),
        h("span", { class: "progress-count" }, `${doneItems} of ${totalItems} done (${progressPercent}%)`)
      ),
      h("progress", {
        class: "progress-bar-native",
        value: doneItems,
        max: totalItems,
        "aria-label": "Overall checklist progress",
      })
    ),

    // Categories
    ...checklist.categories.map((cat) => {
      const catTotal = cat.items.length;
      const catDone = cat.items.filter((item) => checkedItems.has(item.item_id)).length;

      return h(
        "div",
        { class: "checklist-category-card" },
        h(
          "div",
          { class: "checklist-cat-header" },
          h("h3", { class: "checklist-cat-title" }, cat.category_name),
          h("span", { class: "cat-progress-badge" }, `${catDone}/${catTotal}`)
        ),
        h(
          "ul",
          { class: "checklist-item-list" },
          ...cat.items.map((item) => {
            const isChecked = checkedItems.has(item.item_id);
            const inputId = `chk-${item.item_id}`;

            return h(
              "li",
              { class: `checklist-item ${isChecked ? "is-done" : ""}` },
              h(
                "div",
                { class: "checkbox-row" },
                h("input", {
                  type: "checkbox",
                  id: inputId,
                  checked: isChecked,
                  onChange: () => store.toggleChecklistItem(item.item_id),
                }),
                h(
                  "label",
                  { for: inputId, class: "checkbox-label" },
                  h("span", { class: "item-text" }, item.text)
                )
              ),
              h(
                "div",
                { class: "item-badges-row" },
                h("span", { class: "badge badge-neutral" }, `Type: ${item.item_type}`),
                h("span", { class: "badge badge-outline" }, `Stage: ${item.stage}`)
              ),
              (item.what_to_ask && item.what_to_ask.length > 0) || (item.what_to_verify && item.what_to_verify.length > 0)
                ? h(
                    "div",
                    { class: "item-guidance" },
                    item.what_to_ask && item.what_to_ask.length > 0
                      ? h(
                          "div",
                          { class: "guidance-block" },
                          h("strong", {}, "🗣️ Questions to Ask:"),
                          h("ul", {}, ...item.what_to_ask.map((q) => h("li", {}, q)))
                        )
                      : null,
                    item.what_to_verify && item.what_to_verify.length > 0
                      ? h(
                          "div",
                          { class: "guidance-block" },
                          h("strong", {}, "🔍 Verification & Compliance:"),
                          h("ul", {}, ...item.what_to_verify.map((v) => h("li", {}, v)))
                        )
                      : null
                  )
                : null
            );
          })
        )
      );
    })
  );
}

/**
 * ---------------------------------------------------------------------
 * Tab 4: Creative Ideas Panel & Refinement Form
 * ---------------------------------------------------------------------
 */
function renderIdeasPanel(ideas, eventSummary, isActive) {
  const isAi = ideas.source === "ai";

  return h(
    "section",
    {
      role: "tabpanel",
      id: "panel-ideas",
      "aria-labelledby": "tab-ideas",
      tabindex: "0",
      class: `tabpanel ${isActive ? "" : "is-hidden"}`,
    },
    // Source Tag Banner
    h(
      "div",
      { class: "ideas-source-banner" },
      h(
        "span",
        { class: `badge ${isAi ? "badge-ai" : "badge-fallback"}` },
        isAi ? "✨ AI-Generated Cultural Plan" : "📜 Curated Benchmark Suggestions"
      ),
      h(
        "p",
        { class: "source-note" },
        isAi
          ? "Synthesized specifically for your event parameters by Google Gemini."
          : "Curated cultural benchmark tailored to your city tier and guest scale (Gemini API offline or unconfigured)."
      )
    ),

    // Budget Fit Note
    ideas.budget_fit_note
      ? h(
          "div",
          { class: "budget-fit-card" },
          h("strong", {}, "💡 Creative Budget Alignment: "),
          h("span", {}, ideas.budget_fit_note)
        )
      : null,

    // 1. Themes
    h("h3", { class: "panel-section-title" }, "Thematic Concepts"),
    h(
      "div",
      { class: "ideas-grid" },
      ...ideas.themes.map((theme) =>
        h(
          "article",
          { class: "idea-card" },
          h("h4", { class: "idea-card-title" }, theme.name),
          h("p", { class: "idea-card-desc" }, theme.description),
          theme.decor_elements && theme.decor_elements.length > 0
            ? h(
                "div",
                { class: "idea-elements" },
                h("strong", {}, "Visual Elements: "),
                h("span", {}, theme.decor_elements.join(" • "))
              )
            : null,
          theme.dress_code
            ? h(
                "div",
                { class: "idea-dresscode" },
                h("strong", {}, "Attire: "),
                h("span", {}, theme.dress_code)
              )
            : null
        )
      )
    ),

    // 2. Menu Suggestions
    h("h3", { class: "panel-section-title" }, "Curated Catering & Hospitality Spread"),
    h(
      "div",
      { class: "menu-grid" },
      ...ideas.menu_suggestions.map((course) =>
        h(
          "article",
          { class: "menu-card" },
          h(
            "div",
            { class: "menu-card-header" },
            h("h4", { class: "menu-type" }, course.meal_type),
            h(
              "div",
              { class: "menu-tags" },
              ...course.dietary_tags.map((t) => h("span", { class: "badge badge-sm badge-outline" }, t))
            )
          ),
          h(
            "ul",
            { class: "menu-dish-list" },
            ...course.dishes.map((dish) => h("li", {}, dish))
          )
        )
      )
    ),

    // 3. Activities
    h("h3", { class: "panel-section-title" }, "Engagement & Cultural Activities"),
    h(
      "div",
      { class: "ideas-grid" },
      ...ideas.activities.map((act) =>
        h(
          "article",
          { class: "idea-card" },
          h(
            "div",
            { class: "activity-card-header" },
            h("h4", { class: "idea-card-title" }, act.title),
            h("span", { class: "badge badge-sm badge-neutral" }, act.suitable_for)
          ),
          h("p", { class: "idea-card-desc" }, act.description)
        )
      )
    ),

    // 4. Decor Styling
    h("h3", { class: "panel-section-title" }, "Venue Decor & Spatial Styling"),
    h(
      "div",
      { class: "ideas-grid" },
      ...ideas.decor_ideas.map((dec) =>
        h(
          "article",
          { class: "idea-card" },
          h("h4", { class: "idea-card-title" }, `Zone: ${dec.area}`),
          h("p", { class: "idea-card-desc" }, dec.concept),
          dec.suggested_materials && dec.suggested_materials.length > 0
            ? h(
                "p",
                { class: "idea-materials" },
                h("strong", {}, "Materials: "),
                dec.suggested_materials.join(", ")
              )
            : null
        )
      )
    ),

    // Refinement Form & One-Tap Quick Chips
    h("hr", { class: "panel-divider" }),
    renderRefineSection(eventSummary)
  );
}

/**
 * Creative Refinement Section with one-tap chips and max 200 char counter.
 */
function renderRefineSection(eventSummary) {
  const currentState = store.getState();
  const textareaId = "refine-prompt-input";
  const counterId = "refine-char-counter";
  const statusId = "refine-status-msg";

  const chips = [
    "Make it budget-friendly and simpler",
    "Add more traditional heritage decor",
    "Include more fun activities for kids",
    "Eco-friendly zero-plastic celebration",
  ];

  const handleChipClick = (chipText) => {
    const input = document.getElementById(textareaId);
    if (input) {
      input.value = chipText;
      const counter = document.getElementById(counterId);
      if (counter) counter.textContent = `${chipText.length} / 200`;
      input.focus();
    }
  };

  const handleRefineSubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById(textareaId);
    if (!input) return;

    const promptText = input.value.trim();
    if (promptText.length < 3) {
      store.setRefineError(new Error("Please enter at least 3 characters."));
      return;
    }
    if (promptText.length > 200) {
      store.setRefineError(new Error("Refinement prompt must not exceed 200 characters."));
      return;
    }

    store.setRefineLoading(true);

    try {
      const updatedIdeas = await refinePlan(eventSummary, promptText);
      store.updateIdeas(updatedIdeas);
      input.value = "";
      const counter = document.getElementById(counterId);
      if (counter) counter.textContent = "0 / 200";
    } catch (err) {
      store.setRefineError(err);
    }
  };

  return h(
    "div",
    { class: "refine-container" },
    h("h3", { class: "panel-section-title" }, "🎨 Refine Creative Ideas"),
    h(
      "p",
      { class: "text-muted" },
      "Want to shift the aesthetic, add regional rituals, or adjust entertainment? Send a short instruction (max 200 characters)."
    ),

    // Quick Chips
    h(
      "div",
      { class: "chips-group", "aria-label": "Quick refinement suggestions" },
      ...chips.map((chip) =>
        h(
          "button",
          {
            type: "button",
            class: "chip-btn",
            onClick: () => handleChipClick(chip),
          },
          chip
        )
      )
    ),

    // Form
    h(
      "form",
      { onSubmit: handleRefineSubmit, class: "refine-form" },
      h(
        "div",
        { class: "form-group" },
        h("label", { for: textareaId, class: "form-label" }, "Refinement Instructions"),
        h("textarea", {
          id: textareaId,
          maxlength: "200",
          rows: "2",
          placeholder: "e.g. More royal Rajasthani palace elements with live folk music...",
          class: "form-input",
          disabled: currentState.refineLoading,
          onInput: (e) => {
            const counter = document.getElementById(counterId);
            if (counter) counter.textContent = `${e.target.value.length} / 200`;
          },
        }),
        h(
          "div",
          { class: "field-footer" },
          h("span", { id: counterId, class: "char-counter" }, "0 / 200"),
          h(
            "button",
            {
              type: "submit",
              class: "btn btn-primary btn-sm",
              disabled: currentState.refineLoading,
            },
            currentState.refineLoading ? "Adapting ideas..." : "Apply Refinement"
          )
        )
      ),

      // Status message (aria-live)
      h(
        "div",
        {
          id: statusId,
          class: "refine-status",
          "aria-live": "polite",
          "aria-atomic": "true",
        },
        currentState.refineLoading ? "Refining creative ideas with Gemini..." : "",
        currentState.refineError
          ? h("span", { class: "text-danger" }, currentState.refineError.userMessage || currentState.refineError.message)
          : null
      )
    )
  );
}
