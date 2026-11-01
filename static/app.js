/**
 * Utsav Planner - Application Entry Point
 *
 * Coordinates client-side hash routing, persistent navigation, screen reader
 * announcements, and view lifecycle management across all screens:
 * - `#/` (Landing & Live Demo)
 * - `#/plan` (Guided 3-Step Intake Wizard)
 * - `#/event/<id>` (Interactive Programme: Countdown, Ledger, What-If, Timeline, Checklist, Ideas)
 * - `#/events` (Saved Events Index)
 * - Friendly 404 handler
 *
 * STRICT SECURITY:
 * - Loaded as ES Module (<script type="module" src="/static/app.js">)
 * - Zero inline scripts, zero inline style attributes.
 * - Absolute ban on innerHTML, outerHTML, insertAdjacentHTML, document.write, or eval.
 * - Zero badge or pill class names.
 */

import { HashRouter } from "./js/router.js";
import { landingView } from "./js/views/landing.js";
import { planView } from "./js/views/plan.js";
import { eventView } from "./js/views/event.js";
import { eventsView } from "./js/views/events.js";
import { notFoundView } from "./js/views/not_found.js";
import { isStorageAvailable } from "./js/storage.js";

// Global Router Instance
let router = null;

/**
 * Initialize application when DOM is ready.
 */
document.addEventListener("DOMContentLoaded", () => {
  const rootContainer = document.getElementById("app-root");
  const announcer = document.getElementById("route-announcer");

  if (!rootContainer) {
    console.error("Utsav Planner: #app-root container element not found in DOM.");
    return;
  }

  // Route map connecting hash paths to modular views
  const routes = {
    "/": landingView,
    "/plan": planView,
    "/event/:id": eventView,
    "/events": eventsView,
    "404": notFoundView,
  };

  router = new HashRouter(rootContainer, routes, announcer);
  router.init();

  // Dynamic header transparency and height synchronization
  const header = document.querySelector(".app-header");
  const updateHeaderMetrics = () => {
    if (header) {
      const h = header.offsetHeight;
      if (h > 0) {
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    }
  };

  updateHeaderMetrics();
  window.addEventListener("resize", updateHeaderMetrics, { passive: true });

  let scrollTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          if (header && document.body.classList.contains("is-landing-route")) {
            const isScrolled = window.scrollY > 20;
            header.classList.toggle("is-scrolled", isScrolled);
          }
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  // Storage notice check
  if (!isStorageAvailable()) {
    console.warn("Utsav Planner: localStorage is disabled; plans will not be persisted across browser reloads.");
  }
});
