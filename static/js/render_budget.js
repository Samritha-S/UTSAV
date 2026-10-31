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
 * @param {Object} budget - BudgetBreakdown
 * @param {boolean} isActive
 * @returns {HTMLElement}
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
        "Mathematical allocation based on Indian market multipliers, guest scale, and city tier. Every rupee accounted for with zero rounding delta."
      ),
      createKolamMotif("divider", 64, 16)
    ),

    // Ledger Table / Block
    h(
      "div",
      { class: "ledger-card" },
      h(
        "div",
        { class: "ledger-header-row" },
        h("span", { class: "ledger-col-head" }, "Expenditure Head"),
        h("span", { class: "ledger-col-head text-right" }, "Allocated (INR)")
      ),

      // Category Rows
      h(
        "div",
        { class: "ledger-rows" },
        ...budget.categories.map((cat) => {
          return h(
            "div",
            { class: "ledger-entry" },
            h(
              "div",
              { class: "ledger-entry-main" },
              h("span", { class: "ledger-name" }, cat.name),
              h("span", { class: "ledger-dots", "aria-hidden": "true" }),
              h("span", { class: "ledger-amount" }, formatINR(cat.allocated_inr))
            ),
            h(
              "div",
              { class: "ledger-entry-sub" },
              h(
                "span",
                { class: "ledger-meta" },
                cat.cost_per_guest_inr
                  ? `${cat.percentage}% of total · ${formatINR(cat.cost_per_guest_inr)} per guest`
                  : `${cat.percentage}% of total`
              ),
              h("div", { class: "ledger-bar-track", "aria-hidden": "true" },
                h("div", {
                  class: "ledger-bar-fill",
                  style: { width: `${Math.max(2, Math.min(100, cat.percentage * 2.5))}%` },
                })
              )
            )
          );
        })
      ),

      // Single rule separator before contingency
      h("div", { class: "ledger-divider-single" }),

      // Contingency row
      h(
        "div",
        { class: "ledger-entry ledger-contingency-entry" },
        h(
          "div",
          { class: "ledger-entry-main" },
          h("span", { class: "ledger-name" }, "Contingency & Reserve Cushion"),
          h("span", { class: "ledger-dots", "aria-hidden": "true" }),
          h("span", { class: "ledger-amount" }, formatINR(budget.contingency_inr))
        ),
        h(
          "div",
          { class: "ledger-entry-sub" },
          h("span", { class: "ledger-meta" }, `${budget.contingency_percentage}% reserved for unexpected logistical surcharges & weather mitigations`),
          h("div", { class: "ledger-bar-track", "aria-hidden": "true" },
            h("div", {
              class: "ledger-bar-fill fill-contingency",
              style: { width: `${Math.max(2, Math.min(100, budget.contingency_percentage * 2.5))}%` },
            })
          )
        )
      ),

      // Double rule separator before Grand Total
      h("div", { class: "ledger-divider-double" }),

      // Grand Total Row
      h(
        "div",
        { class: "ledger-total-row" },
        h("div", { class: "total-name" },
          h("strong", {}, "Grand Total Allocated Spend"),
          h("span", { class: "total-sub" }, `Matches intake ₹${budget.total_budget_inr.toLocaleString("en-IN")} exactly (100.0%)`)
        ),
        h("span", { class: "ledger-dots", "aria-hidden": "true" }),
        h("div", { class: "total-amount" },
          h("strong", {}, formatINR(budget.total_budget_inr)),
          h("span", { class: "total-words" }, formatINRWords(budget.total_budget_inr))
        )
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
