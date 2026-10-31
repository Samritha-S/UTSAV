/**
 * Utsav Planner - Saved Events Index View (#/events)
 *
 * Ruled typographic index of all saved celebratory programmes.
 * Features:
 * - Ruled ledger entries displaying title, category, date, countdown, and checklist progress.
 * - Actions: Open (#/event/<id>), Rename (in-line prompt), Duplicate, and Delete with inline confirmation.
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
import { formatDate, h, createKolamMotif } from "../utils.js";

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
  confirmDeleteId: null,

  mount(container, ctx) {
    ctx.setTitle("My Saved Events");
    ctx.announce("My saved events index. Review, open, duplicate or delete your event programmes.");

    const view = h("div", { class: "events-view-container" });

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
    view.appendChild(masthead);

    // Storage Availability Notice
    if (!isStorageAvailable()) {
      const storageNotice = h(
        "div",
        { class: "info-notice-banner", role: "status" },
        h("strong", {}, "Storage Unavailable: "),
        "Your browser storage is currently restricted. Any plans created during this session will not be remembered once this window closes."
      );
      view.appendChild(storageNotice);
    }

    const events = getAllEvents();

    // Storage Cap Notice
    if (events.length >= MAX_SAVED_EVENTS) {
      const capNotice = h(
        "div",
        { class: "info-notice-banner", role: "status" },
        h("strong", {}, "Storage Cap Reached: "),
        `You have saved ${events.length} of ${MAX_SAVED_EVENTS} maximum allowed programmes. Please delete an older celebration to create space for new plans.`
      );
      view.appendChild(capNotice);
    }

    // -----------------------------------------------------------------
    // Empty State
    // -----------------------------------------------------------------
    if (events.length === 0) {
      const emptyState = h(
        "div",
        { class: "events-empty-state" },
        createKolamMotif("divider", 64, 16),
        h("h2", { class: "empty-title" }, "No Saved Programmes Yet"),
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
              ctx.navigate("#/plan");
            },
          },
          "Plan Your First Event &rarr;"
        )
      );
      view.appendChild(emptyState);
      container.appendChild(view);
      return;
    }

    // -----------------------------------------------------------------
    // Ruled Events Ledger Index
    // -----------------------------------------------------------------
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
      const totalTasks = evt.plan?.checklist?.total_items || 0;
      const doneTasks = Array.isArray(evt.checkedItems) ? evt.checkedItems.length : 0;
      const progressText = totalTasks > 0 ? `${doneTasks} of ${totalTasks} completed` : "—";
      const countdown = getCountdownText(evt.formInputs?.event_date);
      const eventType = (evt.formInputs?.event_type || "").toUpperCase();

      const row = h(
        "article",
        { class: "event-index-row", role: "listitem" },
        // Col 1: Title & Type
        h(
          "div",
          { class: "col-title" },
          h(
            "a",
            {
              href: `#/event/${evt.id}`,
              class: "event-row-title-link",
              onclick: (e) => {
                e.preventDefault();
                ctx.navigate(`#/event/${evt.id}`);
              },
            },
            evt.title || "Untitled Celebration"
          ),
          h(
            "div",
            { class: "event-row-meta" },
            h("span", { class: "event-type-mark" }, eventType),
            h("span", { class: "meta-sep" }, "·"),
            h("span", { class: "event-countdown-deck" }, countdown)
          )
        ),

        // Col 2: Date
        h(
          "div",
          { class: "col-date" },
          h("span", { class: "event-formatted-date" }, formatDate(evt.formInputs?.event_date)),
          h("span", { class: "event-city-tag" }, evt.formInputs?.city || "")
        ),

        // Col 3: Checklist Progress
        h(
          "div",
          { class: "col-progress" },
          h("span", { class: "progress-counter-text" }, progressText)
        ),

        // Col 4: Action Buttons
        h(
          "div",
          { class: "col-actions" },
          // If this row is awaiting delete confirmation
          this.confirmDeleteId === evt.id
            ? h(
                "div",
                { class: "inline-confirm-group" },
                h("span", { class: "confirm-prompt-text" }, "Delete?"),
                h(
                  "button",
                  {
                    type: "button",
                    class: "btn btn-sm btn-danger",
                    onclick: () => {
                      deleteEvent(evt.id);
                      this.confirmDeleteId = null;
                      ctx.announce(`Deleted event: ${evt.title}`);
                      this.mount(container, ctx);
                    },
                  },
                  "Yes, Delete"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    class: "btn btn-sm btn-outline",
                    onclick: () => {
                      this.confirmDeleteId = null;
                      this.mount(container, ctx);
                    },
                  },
                  "Cancel"
                )
              )
            : h(
                "div",
                { class: "action-buttons-group" },
                h(
                  "button",
                  {
                    type: "button",
                    class: "action-link-btn",
                    onclick: () => {
                      const newTitle = window.prompt("Rename celebration to:", evt.title);
                      if (newTitle && newTitle.trim()) {
                        renameEvent(evt.id, newTitle.trim());
                        this.mount(container, ctx);
                      }
                    },
                  },
                  "Rename"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    class: "action-link-btn",
                    onclick: () => {
                      const dup = duplicateEvent(evt.id);
                      if (dup.ok) {
                        ctx.announce(`Duplicated ${evt.title}`);
                        this.mount(container, ctx);
                      } else if (dup.error === "cap_reached") {
                        window.alert(`Maximum ${MAX_SAVED_EVENTS} events reached. Please delete an older celebration first.`);
                      }
                    },
                  },
                  "Duplicate"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    class: "action-link-btn text-danger",
                    onclick: () => {
                      this.confirmDeleteId = evt.id;
                      this.mount(container, ctx);
                    },
                  },
                  "Delete"
                )
              )
        )
      );

      rowsContainer.appendChild(row);
    });

    listCard.appendChild(rowsContainer);
    view.appendChild(listCard);

    // New Event Footer Link
    view.appendChild(
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
              ctx.navigate("#/plan");
            },
          },
          "+ Plan Another Event"
        )
      )
    );

    container.appendChild(view);
  },

  unmount() {
    this.confirmDeleteId = null;
  },
};
