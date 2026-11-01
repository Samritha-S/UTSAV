/**
 * Utsav Planner - Saved Events Index View (#/events)
 *
 * Ruled typographic index of all saved celebratory programmes.
 * Features:
 * - Strict view lifecycle: owns a single root element with data-view="events".
 * - All actions update the view in place without full page duplication.
 * - In-place delete confirmation: "Delete this event?" with "Yes, delete" and "Cancel",
 *   Escape cancels, focus management, and aria-live announcements.
 * - In-place rename and duplicate with button disabling during async/state updates.
 * - Ruled ledger entries displaying title, category, date, countdown, and checklist progress.
 * - Storage cap warning when 20 events are stored.
 * - Storage unavailable warning when localStorage is disabled or inaccessible.
 * - Warm, thoughtful empty state when zero events are saved.
 * - Zero emoji icons (clean typography and inline SVG marks only).
 * - Complete ban on innerHTML/outerHTML/eval. Uses safe h().
 */

import {
  deleteEvent,
  duplicateEvent,
  getAllEvents,
  isStorageAvailable,
  MAX_SAVED_EVENTS,
  renameEvent,
} from "../storage.js";
import { formatDate, h, createKolamMotif, humanLabel } from "../utils.js";

/**
 * Calculate human-readable countdown in Asia/Kolkata context.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} e.g. "84 days to go"
 */
function getCountdownText(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today is the day!";
    if (diffDays === 1) return "Tomorrow is the celebration!";
    if (diffDays > 1) return `${diffDays} days to go`;
    const past = Math.abs(diffDays);
    return `Celebrated ${past} ${past === 1 ? "day" : "days"} ago`;
  } catch {
    return "";
  }
}

export const eventsView = {
  rootEl: null,
  ctx: null,
  isDuplicating: false,

  mount(container, ctx) {
    this.ctx = ctx;
    ctx.setTitle("My Saved Events");
    ctx.announce("My saved events index. Review, open, duplicate or delete your event programmes.");

    if (!this.rootEl) {
      this.rootEl = h("div", { class: "events-view-container", "data-view": "events" });
    }
    this.render();

    if (container.firstChild !== this.rootEl) {
      container.replaceChildren(this.rootEl);
    }
  },

  unmount() {
    this.rootEl = null;
    this.ctx = null;
    this.isDuplicating = false;
  },

  render() {
    if (!this.rootEl) return;
    this.rootEl.replaceChildren();

    // Masthead
    const masthead = h(
      "div",
      { class: "events-masthead" },
      createKolamMotif("mark", 28, 28),
      h("h1", { class: "events-headline", tabindex: "-1" }, "My Saved Celebrations"),
      h(
        "p",
        { class: "events-deck" },
        "Your library of handcrafted event programmes, budgets, backwards-scheduled timelines, and creative shortlists."
      )
    );
    this.rootEl.appendChild(masthead);

    // Storage Availability Notice
    if (!isStorageAvailable()) {
      const storageNotice = h(
        "div",
        { class: "info-notice-banner", role: "status" },
        h("strong", {}, "Storage Unavailable: "),
        "Your browser storage is currently restricted. Any plans created during this session will not be remembered once this window closes."
      );
      this.rootEl.appendChild(storageNotice);
    }

    const events = getAllEvents();

    // Storage Cap Notice
    if (events.length >= MAX_SAVED_EVENTS) {
      const capNotice = h(
        "div",
        { id: "events-cap-banner", class: "info-notice-banner", role: "status" },
        h("strong", {}, "Storage Cap Reached: "),
        `You have saved ${events.length} of ${MAX_SAVED_EVENTS} maximum allowed programmes. Please delete an older celebration to create space for new plans.`
      );
      this.rootEl.appendChild(capNotice);
    }

    // Empty State
    if (events.length === 0) {
      this.rootEl.appendChild(this.buildEmptyState());
      return;
    }

    // Ruled Events Ledger Index
    const listCard = h("div", { class: "events-ledger-card" });

    // Table Header Row
    const headerRow = h(
      "div",
      { class: "events-index-header" },
      h("span", { class: "events-col-head col-title" }, "Celebration & Scope"),
      h("span", { class: "events-col-head col-date" }, "Target Date"),
      h("span", { class: "events-col-head col-progress" }, "Checklist"),
      h("span", { class: "events-col-head col-actions text-right" }, "Actions")
    );
    listCard.appendChild(headerRow);

    const rowsContainer = h("div", { class: "events-index-rows", role: "list" });
    events.forEach((evt) => {
      rowsContainer.appendChild(this.buildEventRow(evt));
    });

    listCard.appendChild(rowsContainer);
    this.rootEl.appendChild(listCard);

    // New Event Footer Link
    this.rootEl.appendChild(
      h(
        "div",
        { class: "events-footer-action" },
        h(
          "a",
          {
            href: "#/plan",
            class: "btn btn-primary",
            onclick: (e) => {
              e.preventDefault();
              if (this.ctx) this.ctx.navigate("#/plan");
            },
          },
          "+ Plan Another Event"
        )
      )
    );
  },

  buildEmptyState() {
    return h(
      "div",
      { class: "events-empty-state" },
      createKolamMotif("divider", 64, 16),
      h("h2", { class: "empty-title", tabindex: "-1" }, "No Saved Programmes Yet"),
      h(
        "p",
        { class: "empty-desc" },
        "When you design an event plan, it will be preserved here in your ledger with full budgets, timelines, and creative shortlists."
      ),
      h(
        "a",
        {
          href: "#/plan",
          class: "btn btn-primary",
          onclick: (e) => {
            e.preventDefault();
            if (this.ctx) this.ctx.navigate("#/plan");
          },
        },
        "Plan Your First Event →"
      )
    );
  },

  buildEventRow(evt) {
    const totalTasks =
      evt.plan?.checklist?.total_items ||
      evt.plan?.checklist?.categories?.flatMap((c) => c.items || []).length ||
      0;
    const doneTasks = Array.isArray(evt.checkedItems) ? evt.checkedItems.length : 0;
    const progressText = totalTasks > 0 ? `${doneTasks} of ${totalTasks} completed` : "—";
    const countdown = getCountdownText(evt.formInputs?.event_date);
    const eventType = humanLabel(evt.formInputs?.event_type || "");

    const row = h("article", { class: "event-index-row", role: "listitem", id: `event-row-${evt.id}` });

    // Col 1: Title & Type
    const titleLink = h(
      "a",
      {
        href: `#/event/${evt.id}`,
        class: "event-row-title-link",
        onclick: (e) => {
          e.preventDefault();
          if (this.ctx) this.ctx.navigate(`#/event/${evt.id}`);
        },
      },
      evt.title || "Untitled Celebration"
    );

    const colTitle = h(
      "div",
      { class: "col-title" },
      titleLink,
      h(
        "div",
        { class: "event-row-meta" },
        h("span", { class: "event-type-mark" }, eventType),
        h("span", { class: "meta-sep" }, "·"),
        h("span", { class: "event-countdown-deck" }, countdown)
      )
    );

    // Col 2: Date
    const colDate = h(
      "div",
      { class: "col-date" },
      h("span", { class: "event-formatted-date" }, formatDate(evt.formInputs?.event_date)),
      h("span", { class: "event-city-tag" }, evt.formInputs?.city || "")
    );

    // Col 3: Checklist Progress
    const colProgress = h(
      "div",
      { class: "col-progress" },
      h("span", { class: "progress-counter-text" }, progressText)
    );

    // Col 4: Action Buttons
    const colActions = h("div", { class: "col-actions" });
    this.renderRowDefaultActions(colActions, evt, row, titleLink);

    row.appendChild(colTitle);
    row.appendChild(colDate);
    row.appendChild(colProgress);
    row.appendChild(colActions);

    return row;
  },

  renderRowDefaultActions(actionsCell, evt, row, titleLink) {
    actionsCell.replaceChildren();

    const renameBtn = h(
      "button",
      {
        type: "button",
        class: "action-link-btn",
        onclick: () => {
          const currentTitle = evt.title || "Untitled Celebration";
          const newTitle = window.prompt("Rename celebration to:", currentTitle);
          if (newTitle && newTitle.trim() && newTitle.trim() !== currentTitle) {
            const cleanTitle = newTitle.trim();
            renameEvent(evt.id, cleanTitle);
            evt.title = cleanTitle;
            titleLink.textContent = cleanTitle;
            if (this.ctx) this.ctx.announce(`Celebration renamed to: ${cleanTitle}`);
          }
        },
      },
      "Rename"
    );

    const dupBtn = h(
      "button",
      {
        type: "button",
        class: "action-link-btn",
        onclick: () => {
          if (this.isDuplicating) return;
          this.isDuplicating = true;
          dupBtn.disabled = true;

          const dup = duplicateEvent(evt.id);
          this.isDuplicating = false;
          dupBtn.disabled = false;

          if (dup.ok && dup.event) {
            if (this.ctx) this.ctx.announce(`Duplicated ${evt.title}`);
            this.render();
          } else if (dup.error === "cap_reached") {
            window.alert(`Maximum ${MAX_SAVED_EVENTS} events reached. Please delete an older celebration first.`);
          }
        },
      },
      "Duplicate"
    );

    const deleteBtn = h(
      "button",
      {
        type: "button",
        class: "action-link-btn text-danger",
        onclick: () => {
          this.renderRowConfirmDelete(actionsCell, evt, row, titleLink);
        },
      },
      "Delete"
    );

    const actionsGroup = h("div", { class: "action-buttons-group" }, renameBtn, dupBtn, deleteBtn);
    actionsCell.appendChild(actionsGroup);
  },

  renderRowConfirmDelete(actionsCell, evt, row, titleLink) {
    actionsCell.replaceChildren();

    const promptText = h("span", { class: "confirm-prompt-text" }, "Delete this event?");

    const yesBtn = h(
      "button",
      {
        type: "button",
        class: "btn btn-sm btn-danger inline-confirm-btn",
        onclick: () => {
          yesBtn.disabled = true;
          deleteEvent(evt.id);

          if (this.ctx) {
            this.ctx.announce("Event deleted");
          }

          // In-place row removal and focus management
          const nextRow = row.nextElementSibling;
          const prevRow = row.previousElementSibling;
          row.remove();

          const remainingRows = this.rootEl ? this.rootEl.querySelectorAll(".event-index-row") : [];
          if (remainingRows.length === 0) {
            this.render();
            const emptyHeading = this.rootEl ? this.rootEl.querySelector(".empty-title") : null;
            if (emptyHeading) emptyHeading.focus();
          } else {
            const capBanner = document.getElementById("events-cap-banner");
            if (capBanner && remainingRows.length < MAX_SAVED_EVENTS) {
              capBanner.remove();
            }
            const targetRow = nextRow || prevRow;
            const targetBtn = targetRow ? targetRow.querySelector(".action-link-btn, .event-row-title-link") : null;
            if (targetBtn) {
              targetBtn.focus();
            }
          }
        },
      },
      "Yes, delete"
    );

    const cancelBtn = h(
      "button",
      {
        type: "button",
        class: "btn btn-sm btn-outline inline-confirm-btn",
        onclick: () => {
          this.renderRowDefaultActions(actionsCell, evt, row, titleLink);
          const delBtn = actionsCell.querySelector(".action-link-btn.text-danger");
          if (delBtn) delBtn.focus();
        },
      },
      "Cancel"
    );

    const confirmGroup = h(
      "div",
      {
        class: "inline-confirm-group",
        role: "group",
        "aria-label": "Confirm event deletion",
        onkeydown: (e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            cancelBtn.click();
          }
        },
      },
      promptText,
      yesBtn,
      cancelBtn
    );

    actionsCell.appendChild(confirmGroup);
    // Focus Cancel button when confirmation opens
    requestAnimationFrame(() => {
      cancelBtn.focus();
    });
  },
};
