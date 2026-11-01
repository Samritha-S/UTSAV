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

import { formatDate, h, createKolamMotif, humanLabel } from "./utils.js";

/**
 * Safely parse date and compute days until target.
 * @param {string} dateStr
 * @returns {number|null}
 */
function getDaysUntilTarget(dateStr) {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split("-");
    const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Render the Timeline Panel as a vertical run-of-show.
 * @param {Object} timeline - TimelineSchedule / TimelinePlan
 * @param {boolean} isActive
 * @returns {HTMLElement}
 */
export function renderTimelinePanel(timeline, isActive) {
  const isCrunch = Boolean(timeline.crunch_mode_active || timeline.is_crunch_plan);
  const totalTasks = timeline.total_tasks || (timeline.tasks || []).length;
  const crunchAdvice =
    timeline.crunch_summary ||
    "Your celebration date is imminent. Non-essential decorative and optional milestones have been deprioritized to preserve focus on essential permits to verify locally, caterer lock-in, and venue access.";

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
      h(
        "p",
        { class: "panel-deck" },
        `Calculated backwards from ${formatDate(timeline.event_date)}. Total of ${totalTasks} sequenced planning milestones.`
      ),
      createKolamMotif("divider", 64, 16)
    ),

    // Crunch Mode Advisory Banner if active
    isCrunch
      ? h(
          "div",
          { class: "crunch-advisory-box" },
          h("p", { class: "crunch-lead" }, "■ 7-DAY CRUNCH MODE ACTIVE"),
          h("p", { class: "crunch-text" }, crunchAdvice)
        )
      : null,

    // Run-of-Show Grouped Entries
    h(
      "div",
      { class: "run-of-show" },
      ...renderGroupedTasks(timeline.tasks || [])
    )
  );

  return panel;
}

/**
 * Group tasks into editorial time bands:
 * - "Immediate Actions & Overdue" (overdue or <= 7 days)
 * - "Upcoming Fortnight" (8 - 21 days)
 * - "Intermediate Milestones" (22 - 60 days)
 * - "Long-Range Foundation Milestones" (> 60 days)
 *
 * @param {Array<Object>} tasks
 * @returns {Array<HTMLElement>}
 */
function renderGroupedTasks(tasks) {
  if (!tasks || tasks.length === 0) {
    return [h("p", { class: "empty-state" }, "No timeline tasks generated.")];
  }

  // Pre-calculate days until deadline for reliable grouping
  const enriched = tasks.map((t) => {
    const dateStr = t.target_date || t.deadline_date;
    const days =
      typeof t.days_until_deadline === "number"
        ? t.days_until_deadline
        : getDaysUntilTarget(dateStr);
    return { ...t, _dateStr: dateStr, _daysUntil: days };
  });

  const groups = [
    {
      title: "Immediate Priority & Overdue Milestones",
      predicate: (t) =>
        t.status === "overdue_compressed" ||
        (t._daysUntil !== null && t._daysUntil <= 7),
    },
    {
      title: "Upcoming Fortnight (8 to 21 Days)",
      predicate: (t) =>
        t.status !== "overdue_compressed" &&
        t._daysUntil !== null &&
        t._daysUntil > 7 &&
        t._daysUntil <= 21,
    },
    {
      title: "Intermediate Milestones (22 to 60 Days)",
      predicate: (t) =>
        t.status !== "overdue_compressed" &&
        t._daysUntil !== null &&
        t._daysUntil > 21 &&
        t._daysUntil <= 60,
    },
    {
      title: "Long-Range Foundation Milestones (>60 Days)",
      predicate: (t) =>
        t.status !== "overdue_compressed" &&
        (t._daysUntil === null || t._daysUntil > 60),
    },
  ];

  const elements = [];

  for (const group of groups) {
    const matchedTasks = enriched.filter(group.predicate);
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
  const dateStr = task._dateStr || task.target_date || task.deadline_date;
  const days =
    typeof task._daysUntil === "number"
      ? task._daysUntil
      : getDaysUntilTarget(dateStr);

  let statusLabel = "On track";
  if (isOverdue) {
    statusLabel = "Overdue / Compressed";
  } else if (typeof days === "number" && !isNaN(days)) {
    if (days === 0) {
      statusLabel = "Due today";
    } else if (days === 1) {
      statusLabel = "Due tomorrow";
    } else if (days > 1 && days <= 7) {
      statusLabel = `Due in ${days} days`;
    } else if (days < 0) {
      const past = Math.abs(days);
      statusLabel = `${past} ${past === 1 ? "day" : "days"} past target`;
    } else {
      statusLabel = `${days} days remaining`;
    }
  } else if (isDueSoon) {
    statusLabel = "Due soon";
  }

  const priorityGlyph = isCritical ? "■" : "□";
  const advice = task.advice || task.alternative_advice;
  const categoryLabel = humanLabel(task.category || "");

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
      dateStr
        ? h("time", { class: "ros-date", datetime: dateStr }, formatDate(dateStr))
        : h("span", { class: "ros-date" }, "Schedule pending"),
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
        categoryLabel ? h("span", { class: "ros-category" }, `[${categoryLabel}]`) : null
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
      advice
        ? h(
            "div",
            { class: "ros-alternative-advice" },
            h("strong", { class: "advice-lead" }, "Practical guidance: "),
            h("span", { class: "advice-body" }, advice)
          )
        : null
    )
  );
}
