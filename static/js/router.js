/**
 * Utsav Planner - Hash Router Module
 *
 * Client-side hash routing supporting:
 * - `#/` (Landing & Live Demo)
 * - `#/plan` (Guided 3-Step Intake Wizard)
 * - `#/event/<id>` (Plan Programme: Countdown, Ledger, What-If, Timeline, Checklist, Ideas)
 * - `#/events` (Saved Events Index)
 * - Friendly 404 Not Found for unmapped routes
 *
 * Features:
 * - Browser Back/Forward history navigation via standard hashchange listener.
 * - Strict view lifecycle: calls `unmount()` on previous view before `mount(container, ctx)`.
 * - Focus management: shifts programmatic focus to the new view's <h1> heading.
 * - Screen reader announcements via aria-live polite region (#route-announcer).
 * - Document title synchronization.
 * - Active navigation indicator (aria-current="page").
 * - Pure helper `parseHash` for Node/unit testing without browser DOM.
 */

/**
 * Pure route path parser.
 * @param {string} hash - Raw window.location.hash
 * @returns {{ route: string, params: Object, rawPath: string }}
 */
export function parseHash(hash) {
  let clean = (hash || "").replace(/^#/, "").trim();
  if (!clean || clean === "/") {
    return { route: "/", params: {}, rawPath: "/" };
  }
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }
  // Strip trailing slash if present
  if (clean.length > 1 && clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }

  // Route: /event/:id
  const eventMatch = clean.match(/^\/event\/([a-zA-Z0-9_-]+)$/);
  if (eventMatch) {
    return { route: "/event/:id", params: { id: eventMatch[1] }, rawPath: clean };
  }

  // Exact static routes
  if (clean === "/plan") {
    return { route: "/plan", params: {}, rawPath: "/plan" };
  }
  if (clean === "/events") {
    return { route: "/events", params: {}, rawPath: "/events" };
  }

  return { route: "404", params: {}, rawPath: clean };
}

/**
 * HashRouter manages application navigation and view rendering.
 */
export class HashRouter {
  /**
   * @param {HTMLElement} container - Root mounting element
   * @param {Object} routes - Map of route pattern to view module/handler
   * @param {HTMLElement} [announcer] - Optional screen reader live region element
   */
  constructor(container, routes, announcer = null) {
    this.container = container;
    this.routes = routes;
    this.announcer = announcer;
    this.currentView = null;
    this.currentRoute = null;

    this._onHashChange = this.handleHashChange.bind(this);
  }

  /**
   * Start listening for hashchange events and perform initial route dispatch.
   */
  init() {
    window.addEventListener("hashchange", this._onHashChange);
    // Initial mount
    this.handleHashChange();
  }

  /**
   * Stop listening and unmount current view.
   */
  destroy() {
    window.removeEventListener("hashchange", this._onHashChange);
    if (this.currentView && typeof this.currentView.unmount === "function") {
      this.currentView.unmount();
    }
    this.currentView = null;
  }

  /**
   * Navigate to a hash path programmatically.
   * @param {string} path - e.g. '#/plan' or '/plan'
   */
  navigate(path) {
    const target = path.startsWith("#") ? path : `#${path}`;
    if (window.location.hash === target) {
      this.handleHashChange();
    } else {
      window.location.hash = target;
    }
  }

  /**
   * Main dispatch loop on route change.
   */
  async handleHashChange() {
    const { route, params, rawPath } = parseHash(window.location.hash);

    // Clean up previous view
    if (this.currentView && typeof this.currentView.unmount === "function") {
      try {
        this.currentView.unmount();
      } catch (err) {
        console.warn("Error unmounting view:", err);
      }
    }

    // Clear mounting container safely
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const view = this.routes[route] || this.routes["404"];
    this.currentView = view;
    this.currentRoute = route;

    // Toggle landing route class on body and root container for full-bleed hero layout
    if (route === "/") {
      document.body.classList.add("is-landing-route");
      this.container.classList.add("is-landing-route");
    } else {
      document.body.classList.remove("is-landing-route");
      this.container.classList.remove("is-landing-route");
      const header = document.querySelector(".app-header");
      if (header) {
        header.classList.remove("is-scrolled");
      }
    }

    // View context passed to mount
    const ctx = {
      route,
      params,
      rawPath,
      navigate: (p) => this.navigate(p),
      setTitle: (t) => this.updateTitle(t),
      announce: (msg) => this.announce(msg),
    };

    if (view && typeof view.mount === "function") {
      try {
        await view.mount(this.container, ctx);
      } catch (err) {
        console.error("Error mounting view for route", route, err);
      }
    }

    // Accessibility: Move focus to the primary <h1> in the mounted view
    requestAnimationFrame(() => {
      const heading = this.container.querySelector("h1, h2");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ preventScroll: false });
      }
      this.updateNavState(route);
    });
  }

  /**
   * Update active state of top-level navigation items.
   * @param {string} route
   */
  updateNavState(route) {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const { route: linkRoute } = parseHash(href);
      if (linkRoute === route || (route === "/event/:id" && linkRoute === "/events")) {
        link.setAttribute("aria-current", "page");
        link.classList.add("is-active");
      } else {
        link.removeAttribute("aria-current");
        link.classList.remove("is-active");
      }
    });
  }

  /**
   * Update document title.
   * @param {string} title
   */
  updateTitle(title) {
    document.title = title ? `${title} — Utsav Planner` : "Utsav Planner — The Event Programme & Planning Ledger";
  }

  /**
   * Announce message to assistive tech via live region.
   * @param {string} message
   */
  announce(message) {
    if (this.announcer) {
      this.announcer.textContent = message;
    }
  }
}
