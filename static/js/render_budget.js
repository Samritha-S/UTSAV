/**
 * Utsav Planner - Render Budget Ledger
 *
 * Typesets event budget as a traditional printed shopkeeper's ledger:
 * category names, dotted leaders, tabular figures, thin proportional rule bars,
 * contingency cushion, double rule divider, and exact sum match guarantee.
 *
 * STRICT SECURITY: Zero innerHTML/outerHTML/eval. Uses safe h().
 */

import { formatINR, formatINRWords, h, createKolamMotif } from "./utils.js";

/**
 * Render the Budget Panel as an editorial ledger.
 *
 * Typesets the budget breakdown as a traditional shopkeeper's ledger with
 * category rows, proportional rule bars, a contingency reserve row, and a
 * grand total row that sums to the exact budget figure. Also renders the
 * feasibility advisory section with any actionable suggestions.
 *
 * @param {Object} budget - BudgetBreakdown response object from the planner API.
 * @param {Object[]} budget.categories - Array of BudgetCategory allocation objects.
 * @param {number} budget.contingency_inr - Contingency reserve amount in INR.
 * @param {number} budget.contingency_percentage - Contingency as a percentage of total.
 * @param {number} budget.total_budget_inr - Total planned budget in INR.
 * @param {Object} budget.feasibility - BudgetFeasibility assessment object.
 * @param {boolean} isActive - Whether this panel should be visible (not hidden).
 * @returns {HTMLElement} The fully rendered `<section>` panel element.
 */
export function renderBudgetPanel(budget, isActive) {
  const panel = h(
    "section",
    {
      id: "panel-budget",
      role: "tabpanel",
      "aria-labelledby": "tab-budget",
      tabindex: "0",
      class: `programme-panel ${isActive ? "" : "is-hidden"}`,
    },

    // Panel Header
    h(
      "div",
      { class: "panel-masthead" },
      h("h3", { class: "panel-headline" }, "Budget Allocation & Spending Ledger"),
      h("p", { class: "panel-deck" },
        "Where every rupee goes. These are planning estimates, so treat them as a starting point."
      ),
      h("hr", { class: "panel-divider-rule", "aria-hidden": "true" })
    ),

    // Ledger Table / Block
    h(
      "div",
      { class: "ledger-card" },
      h(
        "div",
        { class: "ledger-grid-header", role: "row" },
        h("span", { class: "ledger-head-name", role: "columnheader" }, "Category"),
        h("span", { class: "ledger-head-amount", role: "columnheader" }, "Amount"),
        h("span", { class: "ledger-head-share", role: "columnheader" }, "Share")
      ),

      // Category Rows
      h(
        "div",
        { class: "ledger-entries-list", role: "rowgroup" },
        ...budget.categories.map((cat) => {
          const barFill = h("div", { class: "ledger-bar-fill" });
          barFill.style.width = `${Math.min(100, Math.max(2, cat.percentage))}%`;

          return h(
            "div",
            { class: "ledger-grid-row", role: "row" },
            h("span", { class: "ledger-row-name" }, cat.name),
            h("span", { class: "ledger-row-amount font-tabular" }, formatINR(cat.allocated_inr)),
            h("span", { class: "ledger-row-share font-tabular" }, `${cat.percentage.toFixed(1)}%`),
            cat.description
              ? h("p", { class: "ledger-row-desc" }, cat.description)
              : (cat.cost_per_guest_inr
                  ? h("p", { class: "ledger-row-desc" }, `${cat.percentage}% of total · ${formatINR(cat.cost_per_guest_inr)} per guest`)
                  : null),
            h("div", { class: "ledger-bar-track", "aria-hidden": "true" }, barFill)
          );
        })
      ),

      // Contingency row
      (() => {
        const contBarFill = h("div", { class: "ledger-bar-fill contingency-bar-fill" });
        contBarFill.style.width = `${Math.min(100, Math.max(2, budget.contingency_percentage))}%`;

        return h(
          "div",
          { class: "ledger-grid-row ledger-contingency-row", role: "row" },
          h("span", { class: "ledger-row-name" }, "Contingency reserve"),
          h("span", { class: "ledger-row-amount font-tabular" }, formatINR(budget.contingency_inr)),
          h("span", { class: "ledger-row-share font-tabular" }, `${budget.contingency_percentage}%`),
          h("p", { class: "ledger-row-desc" }, `${budget.contingency_percentage}% reserved for unexpected logistical surcharges & weather mitigations`),
          h("div", { class: "ledger-bar-track", "aria-hidden": "true" }, contBarFill)
        );
      })(),

      // Grand Total Row
      h(
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
      )
    ),

    // Feasibility Advisory Section
    h(
      "div",
      { class: "feasibility-editorial-box" },
      h("h4", { class: "feasibility-title" }, "Feasibility Assessment & Expert Guidance"),
      h("p", { class: "feasibility-message" }, budget.feasibility.message),
      h("p", { class: "feasibility-meta" },
        `Regional Per-Guest Operational Benchmark Floor: ${formatINR(budget.feasibility.floor_per_guest_inr)} (Variance: ${budget.feasibility.variance_percentage >= 0 ? `+${budget.feasibility.variance_percentage}` : budget.feasibility.variance_percentage}%)`
      ),

      budget.feasibility.suggestions && budget.feasibility.suggestions.length > 0
        ? h(
            "div",
            { class: "feasibility-suggestions" },
            h("p", { class: "suggestions-heading" }, "Recommended Practical Adjustments:"),
            h(
              "ol",
              { class: "suggestions-list" },
              ...budget.feasibility.suggestions.map((sug) => h("li", {}, sug))
            )
          )
        : null
    )
  );

  return panel;
}
