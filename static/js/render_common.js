/**
 * Utsav Planner - Render Common Components
 *
 * Implements the editorial summary ("Your plan at a glance"), WAI-ARIA tab navigation,
 * action bars, and shared ornaments.
 *
 * STRICT SECURITY: Zero innerHTML/outerHTML/eval. Uses safe h() and svg().
 * NO pills or badges anywhere.
 */

import { formatINR, formatINRWords, formatDate, h, createKolamMotif, humanLabel } from "./utils.js";
import { store } from "./state.js";

/**
 * Editorial "Your plan at a glance" summary block.
 * @param {Object} plan - PlanResponse
 * @returns {HTMLElement}
 */
export function createPlanSummary(plan) {
  const ev = plan.event_summary;
  const b = plan.budget;
  const t = plan.timeline;

  const typeNames = {
    wedding: "Traditional Wedding",
    birthday: "Birthday Celebration",
    community: "Community Festival & Gathering",
  };

  const titleText = `${typeNames[ev.event_type] || ev.event_type} in ${ev.city}`;
  const daysText = t.days_remaining === 0
    ? "Today"
    : t.days_remaining === 1
    ? "Tomorrow"
    : `${t.days_remaining} days away (${t.weeks_remaining} weeks)`;

  // Find the single most urgent task
  let mostUrgentTask = null;
  if (t.tasks && t.tasks.length > 0) {
    const parseDateMs = (d) => {
      if (!d) return 9999999999999;
      const parts = d.split("-");
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
    };
    const sorted = [...t.tasks].sort((a, b) => {
      const da = a.days_until_deadline !== undefined ? a.days_until_deadline : parseDateMs(a.target_date || a.deadline_date);
      const db = b.days_until_deadline !== undefined ? b.days_until_deadline : parseDateMs(b.target_date || b.deadline_date);
      return da - db;
    });
    mostUrgentTask = sorted.find((task) => task.status === "overdue_compressed") ||
      sorted.find((task) => task.priority === "critical") ||
      sorted[0];
  }

  // Verdict text in a sentence
  const verdictMap = {
    comfortable: "Comfortable — Your planned budget affords premium venue choices and ample buffer.",
    realistic: "Realistic — Your planned spend aligns well with regional benchmarks.",
    tight: "Tight — Budget is below typical benchmarks; careful vendor shortlisting recommended.",
    unrealistic: "Unrealistic — Allocation is significantly below basic operational costs for this guest scale.",
  };
  const verdictSentence = verdictMap[b.feasibility.verdict] || b.feasibility.message;

  const container = h(
    "section",
    { class: "programme-summary", "aria-labelledby": "plan-summary-heading" },

    // Header with Kolam mark & Title
    h(
      "div",
      { class: "summary-masthead" },
      h("div", { class: "masthead-ornament" }, createKolamMotif("mark", 22)),
      h("div", { class: "masthead-text" },
        h("p", { class: "masthead-kicker" }, "The Event Programme"),
        h("h2", { id: "plan-summary-heading", class: "summary-headline" }, titleText),
        h("p", { class: "masthead-meta" },
          `${formatDate(ev.event_date)} · ${daysText} · ${humanLabel(ev.city_tier)} · ${humanLabel(ev.venue_setting)}`
        )
      )
    ),

    // Four core metrics presented cleanly with tabular numerals
    h(
      "div",
      { class: "summary-ledger-stats" },
      h(
        "div",
        { class: "stat-cell" },
        h("span", { class: "stat-label" }, "Expected Guests"),
        h("p", { class: "stat-value" }, `${ev.guest_count.toLocaleString("en-IN")}`),
        h("span", { class: "stat-note" }, `Attendees`)
      ),
      h(
        "div",
        { class: "stat-cell" },
        h("span", { class: "stat-label" }, "Total Budget"),
        h("p", { class: "stat-value" }, formatINR(b.total_budget_inr)),
        h("span", { class: "stat-note" }, formatINRWords(b.total_budget_inr).replace(/[()]/g, ""))
      ),
      h(
        "div",
        { class: "stat-cell" },
        h("span", { class: "stat-label" }, "Planned Per Guest"),
        h("p", { class: "stat-value" }, formatINR(b.cost_per_guest_inr)),
        h("span", { class: "stat-note" }, `Floor: ${formatINR(b.feasibility.floor_per_guest_inr)}`)
      ),
      h(
        "div",
        { class: "stat-cell" },
        h("span", { class: "stat-label" }, "Safety Contingency"),
        h("p", { class: "stat-value" }, formatINR(b.contingency_inr)),
        h("span", { class: "stat-note" }, `${b.contingency_percentage}% reserve`)
      )
    ),

    // Feasibility verdict statement
    h(
      "div",
      { class: "summary-verdict-line" },
      h("strong", { class: "verdict-lead" }, "Feasibility Assessment: "),
      h("span", { class: "verdict-body" }, verdictSentence)
    ),

    // Urgent next action callout
    mostUrgentTask
      ? h(
          "div",
          { class: "urgent-action-strip" },
          h("div", { class: "urgent-action-text" },
            h("span", { class: "urgent-label" }, mostUrgentTask.status === "overdue_compressed" ? "■ IMMEDIATE ACTION REQUIRED" : "■ PRIORITY NEXT STEP"),
            h("p", { class: "urgent-task-title" }, `${mostUrgentTask.title} — ${mostUrgentTask.target_date || mostUrgentTask.deadline_date ? `Target: ${formatDate(mostUrgentTask.target_date || mostUrgentTask.deadline_date)}` : ""}`)
          ),
          h(
            "button",
            {
              type: "button",
              class: "btn btn-outline btn-sm",
              onClick: () => {
                store.setActiveTab("tab-timeline");
                setTimeout(() => {
                  const targetEl = document.getElementById(`task-${mostUrgentTask.task_id}`);
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    targetEl.focus();
                  }
                }, 100);
              },
            },
            "View in Timeline →"
          )
        )
      : null,

    // Actions: Edit Details, Print, Start Over
    h(
      "div",
      { class: "summary-toolbar no-print" },
      h(
        "button",
        {
          type: "button",
          id: "edit-intake-btn",
          class: "btn btn-outline btn-sm",
          onClick: () => {
            const formSection = document.querySelector(".form-card");
            const resultsSection = document.getElementById("results-container");
            if (formSection && resultsSection) {
              resultsSection.classList.add("is-hidden");
              formSection.classList.remove("is-hidden");
              formSection.scrollIntoView({ behavior: "smooth" });
              const firstInput = document.getElementById("event-date");
              if (firstInput) firstInput.focus();
            }
          },
        },
        "Edit details"
      ),
      h(
        "button",
        {
          type: "button",
          id: "print-plan-btn",
          class: "btn btn-outline btn-sm",
          onClick: () => window.print(),
        },
        "Print / PDF Programme"
      ),
      h(
        "button",
        {
          type: "button",
          id: "start-over-btn",
          class: "btn btn-text btn-sm",
          onClick: () => {
            if (window.confirm("Are you sure you want to clear this plan and start over?")) {
              store.reset();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          },
        },
        "Start over"
      )
    )
  );

  return container;
}

/**
 * Editorial section navigation bar using WAI-ARIA tablist pattern.
 * @param {string} activeTabId
 * @returns {HTMLElement}
 */
export function createTablist(activeTabId) {
  const tabs = [
    { id: "tab-budget", panelId: "panel-budget", label: "Budget Ledger" },
    { id: "tab-timeline", panelId: "panel-timeline", label: "Run-of-Show Timeline" },
    { id: "tab-checklist", panelId: "panel-checklist", label: "Vendor Checklist" },
    { id: "tab-ideas", panelId: "panel-ideas", label: "Creative Programme" },
  ];

  const nav = h(
    "nav",
    { class: "programme-nav no-print", "aria-label": "Event plan sections" },
    h(
      "div",
      { role: "tablist", class: "tablist-track", "aria-label": "Programme sections" },
      ...tabs.map((tab) => {
        const isSelected = tab.id === activeTabId;
        return h(
          "button",
          {
            type: "button",
            role: "tab",
            id: tab.id,
            "aria-selected": String(isSelected),
            "aria-controls": tab.panelId,
            tabindex: isSelected ? "0" : "-1",
            class: `programme-tab ${isSelected ? "is-active" : ""}`,
            onClick: () => store.setActiveTab(tab.id),
          },
          tab.label
        );
      })
    )
  );

  return nav;
}
