/**
 * Utsav Planner - Safe DOM Rendering Coordinator
 *
 * Coordinates the editorial rendering of the event planning programme.
 * Assembles the plan summary, section navigation, and modular tab panels.
 *
 * STRICT SECURITY:
 * - 100% built using safe DOM creation (createElement/textContent).
 * - Zero innerHTML, outerHTML, insertAdjacentHTML, document.write, or eval.
 * - All text treated as untrusted text.
 * - NO badges or pills anywhere.
 */

import { h } from "./utils.js";
import { createPlanSummary, createTablist } from "./render_common.js";
import { renderBudgetPanel } from "./render_budget.js";
import { renderTimelinePanel } from "./render_timeline.js";
import { renderChecklistPanel } from "./render_checklist.js";
import { renderIdeasPanel } from "./render_ideas.js";

/**
 * Render complete results programme inside the dashboard container.
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

  // 1. "Your plan at a glance" Summary Masthead
  frag.appendChild(createPlanSummary(plan));

  // 2. Section Navigation Tablist
  frag.appendChild(createTablist(activeTabId));

  // 3. Tab Panels Container
  const panelsContainer = h("div", { class: "programme-panels-container" });
  panelsContainer.appendChild(renderBudgetPanel(plan.budget, activeTabId === "tab-budget"));
  panelsContainer.appendChild(renderTimelinePanel(plan.timeline, activeTabId === "tab-timeline"));
  panelsContainer.appendChild(renderChecklistPanel(plan.checklist, plan.budget, checkedItems, activeTabId === "tab-checklist"));
  panelsContainer.appendChild(renderIdeasPanel(plan.ideas, plan.event_summary, activeTabId === "tab-ideas"));

  frag.appendChild(panelsContainer);
  container.appendChild(frag);
}
