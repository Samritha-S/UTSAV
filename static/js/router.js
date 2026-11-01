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
  let raw = (hash || "").replace(/^#/, "").trim();
  if (!raw || raw === "/") {
    return { route: "/", params: {}, rawPath: "/" };
  }
  if (!raw.startsWith("/")) {
    raw = "/" + raw;
  }

  // Parse path and query string
  const [pathPart, queryPart] = raw.split("?");
  let clean = pathPart;
  if (clean.length > 1 && clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }

  // Parse query parameters
  const queryParams = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [k, v] = pair.split("=");
      if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }

  // Route: /event/:id
  const eventMatch = clean.match(/^\/event\/([a-zA-Z0-9_-]+)$/);
  if (eventMatch) {
    return { route: "/event/:id", params: { id: eventMatch[1], ...queryParams }, rawPath: raw };
  }

  // Route: /plan/:type (path-style route for door links)
  const planMatch = clean.match(/^\/plan\/(wedding|birthday|community)$/);
  if (planMatch) {
    return { route: "/plan", params: { type: planMatch[1], ...queryParams }, rawPath: raw };
  }

  // Route: /plan
  if (clean === "/plan") {
    return { route: "/plan", params: queryParams, rawPath: raw };
  }

  // Route: /events
  if (clean === "/events") {
    return { route: "/events", params: queryParams, rawPath: raw };
  }

  return { route: "404", params: queryParams, rawPath: raw };
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
    this._mountId = 0;

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
    this._mountId++;
    if (this.currentView && typeof this.currentView.unmount === "function") {
      try {
        this.currentView.unmount();
      } catch (err) {
        console.warn("Error unmounting view on destroy:", err);
      }
    }
    if (this.container && typeof this.container.replaceChildren === "function") {
      this.container.replaceChildren();
    }
    this.currentView = null;
    this.currentRoute = null;
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
    const mountId = ++this._mountId;
    const { route, params, rawPath } = parseHash(window.location.hash);

    // Clean up previous view
    if (this.currentView && typeof this.currentView.unmount === "function") {
      try {
        this.currentView.unmount();
      } catch (err) {
        console.warn("Error unmounting view:", err);
      }
    }

    // EMPTY the root container with replaceChildren(), so only one view can ever exist
    if (this.container && typeof this.container.replaceChildren === "function") {
      this.container.replaceChildren();
    } else if (this.container) {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
    }

    if (mountId !== this._mountId) {
      // Stale async mount resolved after navigation; prune any elements it added
      if (this.currentView && this.currentView.rootEl && typeof this.container.replaceChildren === "function") {
        this.container.replaceChildren(this.currentView.rootEl);
      }
      return;
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

    if (mountId !== this._mountId) {
      // Stale async mount resolved after navigation; prune any elements it added
      if (this.currentView && this.currentView.rootEl && typeof this.container.replaceChildren === "function") {
        this.container.replaceChildren(this.currentView.rootEl);
      }
      return;
    }

    // Accessibility: Move focus to the primary <h1> in the mounted view
    requestAnimationFrame(() => {
      if (mountId !== this._mountId) return;
      const heading = this.container.querySelector("h1");
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
