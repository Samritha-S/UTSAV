/**
 * Utsav Planner - 404 Not Found View
 *
 * Rendered when a user navigates to an unmapped hash route or deleted event.
 * Features:
 * - Clear, warm microcopy.
 * - Call to action returning to the landing page (#/).
 * - Strict DOM construction with safe h().
 */

import { h, createKolamMotif } from "../utils.js";

export const notFoundView = {
  mount(container, ctx) {
    ctx.setTitle("Page Not Found");
    ctx.announce("Page not found. Showing navigation options to return home.");

    const view = h(
      "section",
      { class: "not-found-section", "aria-labelledby": "not-found-heading" },
      h(
        "div",
        { class: "not-found-card" },
        createKolamMotif("mark", 32, 32),
        h("h1", { id: "not-found-heading", class: "not-found-title" }, "Page Not Found"),
        h(
          "p",
          { class: "not-found-desc" },
          "The event programme or address you requested does not exist or may have been removed."
        ),
        h(
          "div",
          { class: "not-found-actions" },
          h(
            "a",
            {
              href: "#/",
              class: "btn btn-primary",
              onclick: (e) => {
                e.preventDefault();
                ctx.navigate("#/");
              },
            },
            "Return to Home"
          ),
          h(
            "a",
            {
              href: "#/events",
              class: "btn btn-outline",
              onclick: (e) => {
                e.preventDefault();
                ctx.navigate("#/events");
              },
            },
            "View My Saved Events"
          )
        )
      )
    );

    container.appendChild(view);
  },

  unmount() {
    // No ongoing listeners to unmount
  },
};
