/**
 * Utsav Planner - Render Timeline Run-of-Show
 *
 * Typesets event milestones as a vertical run-of-show programme:
 * date in the left margin column, task details on the right,
 * grouped chronologically into editorial timeframes,
 * with thick vermilion left-rules for overdue/crunch tasks,
 * and alternative advice displayed directly beneath affected items.
 *
 * STRICT SECURITY: Zero innerHTML/outerHTML/eval. Uses safe h().
 */

import { formatDate, h, createKolamMotif } from "./utils.js";

/**
 * Render the Timeline Panel as a vertical run-of-show.
 * @param {Object} timeline - TimelinePlan
 * @param {boolean} isActive
 * @returns {HTMLElement}
 */
export function renderTimelinePanel(timeline, isActive) {
  const panel = h(
    "section",
    {
      id: "panel-timeline",
      role: "tabpanel",
      "aria-labelledby": "tab-timeline",
      tabindex: "0",
      class: `programme-panel ${isActive ? "" : "is-hidden"}`,
    },

    // Masthead
    h(
      "div",
      { class: "panel-masthead" },
      h("h3", { class: "panel-headline" }, "Milestone Run-of-Show & Backward Schedule"),
      h("p", { class: "panel-deck" },
        `Calculated backwards from ${formatDate(timeline.event_date)}. Total of ${timeline.total_tasks} sequenced planning milestones.`
      ),
      createKolamMotif("divider", 64, 16)
    ),

    // Crunch Mode Advisory Banner if active
    timeline.crunch_mode_active
      ? h(
          "div",
          { class: "crunch-advisory-box" },
          h("p", { class: "crunch-lead" }, "■ 7-DAY CRUNCH MODE ACTIVE"),
          h("p", { class: "crunch-text" },
            "Your celebration date is imminent. Non-essential decorative and optional milestones have been deprioritized to preserve focus on core statutory permits, caterer lock-in, and venue access."
          )
        )
      : null,

    // Run-of-Show Grouped Entries
    h(
      "div",
      { class: "run-of-show" },
      ...renderGroupedTasks(timeline.tasks)
    )
  );

  return panel;
}

/**
 * Group tasks into editorial time bands:
 * - "Immediate Actions & Overdue" (overdue or <= 7 days)
 * - "Upcoming Fortnight" (8 - 21 days)
 * - "Intermediate Milestones" (22 - 60 days)
 * - "Early Foundation & Lock-in" (> 60 days)
 *
 * @param {Array<Object>} tasks
 * @returns {Array<HTMLElement>}
 */
function renderGroupedTasks(tasks) {
  if (!tasks || tasks.length === 0) {
    return [h("p", { class: "empty-state" }, "No timeline tasks generated.")];
  }

  const groups = [
    { title: "Immediate Priority & Overdue Milestones", predicate: (t) => t.days_until_deadline <= 7 || t.status === "overdue_compressed" },
    { title: "Upcoming Fortnight (8 to 21 Days)", predicate: (t) => t.days_until_deadline > 7 && t.days_until_deadline <= 21 && t.status !== "overdue_compressed" },
    { title: "Intermediate Milestones (22 to 60 Days)", predicate: (t) => t.days_until_deadline > 21 && t.days_until_deadline <= 60 && t.status !== "overdue_compressed" },
    { title: "Long-Range Foundation Milestones (>60 Days)", predicate: (t) => t.days_until_deadline > 60 && t.status !== "overdue_compressed" },
  ];

  const elements = [];

  for (const group of groups) {
    const matchedTasks = tasks.filter(group.predicate);
    if (matchedTasks.length === 0) continue;

    elements.push(
      h(
        "div",
        { class: "timeline-time-band" },
        h("h4", { class: "time-band-header" }, group.title),
        h(
          "div",
          { class: "time-band-tasks" },
          ...matchedTasks.map(renderTaskRow)
        )
      )
    );
  }

  return elements;
}

/**
 * Render an individual task row with asymmetric margin date and content.
 * @param {Object} task
 * @returns {HTMLElement}
 */
function renderTaskRow(task) {
  const isOverdue = task.status === "overdue_compressed";
  const isDueSoon = task.status === "due_soon";
  const isCritical = task.priority === "critical";

  let statusLabel = "On track";
  if (isOverdue) {
    statusLabel = "Overdue / Compressed";
  } else if (isDueSoon) {
    statusLabel = `Due in ${task.days_until_deadline} day${task.days_until_deadline === 1 ? "" : "s"}`;
  } else if (task.days_until_deadline < 0) {
    statusLabel = `${Math.abs(task.days_until_deadline)} days past target`;
  } else {
    statusLabel = `${task.days_until_deadline} days remaining`;
  }

  const priorityGlyph = isCritical ? "■" : "□";

  const rowClasses = [
    "run-of-show-item",
    isOverdue ? "item-overdue" : "",
    isDueSoon ? "item-due-soon" : "",
  ].filter(Boolean).join(" ");

  return h(
    "article",
    {
      id: `task-${task.task_id}`,
      class: rowClasses,
      tabindex: "-1",
    },

    // Left Column: Deadline Date & Countdown
    h(
      "div",
      { class: "ros-date-col" },
      h("time", { class: "ros-date", datetime: task.deadline_date }, formatDate(task.deadline_date)),
      h("span", { class: `ros-countdown ${isOverdue ? "text-vermilion" : ""}` }, statusLabel)
    ),

    // Right Column: Task Details
    h(
      "div",
      { class: "ros-content-col" },
      h(
        "div",
        { class: "ros-heading-line" },
        h("span", { class: `ros-glyph ${isCritical ? "text-vermilion" : ""}`, "aria-hidden": "true" }, priorityGlyph),
        h("h5", { class: "ros-title" }, task.title),
        h("span", { class: "ros-category" }, `[${task.category}]`)
      ),

      // Dependencies
      task.dependencies && task.dependencies.length > 0
        ? h(
            "p",
            { class: "ros-dependencies" },
            h("strong", {}, "Pre-requisite: "),
            `after ${task.dependencies.join(", ")}`
          )
        : null,

      // Alternative Advice (Crunch / Overdue)
      task.alternative_advice
        ? h(
            "div",
            { class: "ros-alternative-advice" },
            h("strong", { class: "advice-lead" }, "Do this instead: "),
            h("span", { class: "advice-body" }, task.alternative_advice)
          )
        : null
    )
  );
}
