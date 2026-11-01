/**
 * Utsav Planner - Render Checklist
 *
 * Typesets the vendor diligence & compliance checklist grouped by category.
 * Displays category budget lines beside headings, real 44px+ checkboxes,
 * native <progress> element, and small text labels for verification stages.
 *
 * STRICT SECURITY: Zero innerHTML/outerHTML/eval. Uses safe h().
 * NO pills or badges anywhere.
 */

import { formatINR, h, createKolamMotif } from "./utils.js";
import { store } from "./state.js";

// Local module-level filter state
let showOnlyPending = false;

/**
 * Render the Checklist Panel.
 * @param {Object} checklist - ChecklistPlan
 * @param {Object} budget - BudgetBreakdown (for category spend alignment)
 * @param {Set<string>} checkedItems
 * @param {boolean} isActive
 * @returns {HTMLElement}
 */
export function renderChecklistPanel(checklist, budget, checkedItems, isActive) {
  // Build map of category_slug to allocated_inr
  const budgetMap = {};
  if (budget && budget.categories) {
    budget.categories.forEach((c) => {
      budgetMap[c.category_slug] = c.allocated_inr;
    });
  }

  const totalItems = checklist.total_items;
  const completedCount = checkedItems.size;
  const percentDone = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const panel = h(
    "section",
    {
      id: "panel-checklist",
      role: "tabpanel",
      "aria-labelledby": "tab-checklist",
      tabindex: "0",
      class: `programme-panel ${isActive ? "" : "is-hidden"}`,
    },

    // Masthead
    h(
      "div",
      { class: "panel-masthead" },
      h("h3", { class: "panel-headline" }, "Vendor Diligence & Compliance Checklist"),
      h("p", { class: "panel-deck" },
        "Things to confirm with each vendor. Rules and costs vary by city, so verify locally."
      ),
      h("hr", { class: "panel-divider-rule", "aria-hidden": "true" })
    ),

    // Progress Tracker Bar (Native HTML5 <progress>)
    h(
      "div",
      { class: "checklist-progress-bar-container" },
      h(
        "div",
        { class: "progress-meta-line" },
        h("span", { class: "progress-text" },
          h("strong", {}, `${completedCount}`),
          ` of ${totalItems} items completed (${percentDone}%)`
        ),
        h(
          "button",
          {
            type: "button",
            class: "btn btn-outline btn-xs",
            onClick: (e) => {
              showOnlyPending = !showOnlyPending;
              e.target.textContent = showOnlyPending ? "Show all tasks" : "Show only pending tasks";
              // Re-filter displayed checklist rows
              filterChecklistRows(panel);
            },
          },
          showOnlyPending ? "Show all tasks" : "Show only pending tasks"
        )
      ),
      h("progress", {
        class: "native-checklist-progress",
        value: completedCount,
        max: totalItems,
        "aria-label": "Checklist completion progress",
      })
    ),

    // Checklist Categories
    h(
      "div",
      { class: "checklist-categories" },
      ...checklist.categories.map((cat) => {
        const allocatedInr = budgetMap[cat.category_slug];
        const budgetText = allocatedInr !== undefined ? `— ${formatINR(allocatedInr)} allocated` : "";

        return h(
          "div",
          { class: "checklist-category-group" },
          h(
            "div",
            { class: "category-group-header" },
            h("h4", { class: "category-group-title" }, cat.category_name),
            h("span", { class: "category-group-budget" }, budgetText)
          ),
          h(
            "ul",
            { class: "checklist-items-list" },
            ...cat.items.map((item) => renderChecklistItem(item, checkedItems))
          )
        );
      })
    )
  );

  return panel;
}

/**
 * Render an individual checklist item with a native checkbox and accessible label.
 * @param {Object} item
 * @param {Set<string>} checkedItems
 * @returns {HTMLElement}
 */
function renderChecklistItem(item, checkedItems) {
  const isChecked = checkedItems.has(item.item_id);
  const inputId = `chk-${item.item_id}`;

  const stageLabels = {
    shortlist: "[SHORTLIST]",
    quote: "[QUOTE]",
    book: "[BOOKING]",
    deposit: "[DEPOSIT]",
    confirm: "[CONFIRMATION]",
  };

  const typeLabels = {
    ask: "[ASK VENDOR]",
    verify: "[VERIFY LICENSE]",
    document: "[GET AGREEMENT]",
    payment: "[MILESTONE PAY]",
  };

  return h(
    "li",
    {
      class: `checklist-item-row ${isChecked ? "is-completed" : ""}`,
      dataset: { itemId: item.item_id, completed: String(isChecked) },
    },
    h(
      "div",
      { class: "checklist-control-cell" },
      h("input", {
        type: "checkbox",
        id: inputId,
        class: "checklist-checkbox",
        checked: isChecked,
        onChange: () => {
          store.toggleChecklistItem(item.item_id);
        },
      })
    ),
    h(
      "div",
      { class: "checklist-body-cell" },
      h(
        "label",
        { for: inputId, class: "checklist-label" },
        h("span", { class: "checklist-title" }, item.text || item.title || "Checklist Task"),
        item.mandatory ? h("span", { class: "mandatory-marker" }, " *Mandatory") : null
      ),
      h(
        "div",
        { class: "checklist-tags-line" },
        h("span", { class: "stage-tag" }, stageLabels[item.stage] || `[${item.stage}]`),
        h("span", { class: "type-tag" }, typeLabels[item.item_type || item.type] || `[${item.item_type || item.type || "check"}]`)
      ),
      h("p", { class: "checklist-guidance" },
        (item.what_to_ask && item.what_to_ask.length ? `Ask: ${item.what_to_ask.join(" · ")}` : "") ||
        (item.what_to_verify && item.what_to_verify.length ? `Verify: ${item.what_to_verify.join(" · ")}` : "") ||
        item.guidance ||
        ""
      )
    )
  );
}

/**
 * Filter visibility of checklist rows based on showOnlyPending flag.
 * @param {HTMLElement} panel
 */
function filterChecklistRows(panel) {
  const rows = panel.querySelectorAll(".checklist-item-row");
  rows.forEach((row) => {
    const isCompleted = row.dataset.completed === "true";
    if (showOnlyPending && isCompleted) {
      row.classList.add("is-hidden");
    } else {
      row.classList.remove("is-hidden");
    }
  });
}
