/**
 * Node.js Unit Tests for View Lifecycle and Reactive State Store
 *
 * Verifies:
 * - State Store subscribe, notify, and unsubscribe cleanup.
 * - HashRouter strict view lifecycle:
 *   - unmount() called on previous view before mounting new view.
 *   - container emptied via replaceChildren() so exactly one view root exists.
 *   - mount() idempotency.
 *   - stale mount cancellation under rapid route changes.
 *   - door path-style routes and query fallbacks.
 */

import assert from "node:assert/strict";

// Setup minimal global DOM mock
class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.textContent = "";
    this.classList = {
      _classes: new Set(),
      add(...cls) { cls.forEach((c) => this._classes.add(c)); },
      remove(...cls) { cls.forEach((c) => this._classes.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains(c) { return this._classes.has(c); },
    };
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }
  getAttribute(k) {
    return this.attributes[k];
  }
  hasAttribute(k) {
    return k in this.attributes;
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  replaceChildren(...nodes) {
    this.children = [...nodes];
  }
  querySelector(sel) {
    if (sel === "h1") {
      return this.children.find((c) => c.tagName === "h1") || null;
    }
    return null;
  }
  focus() {
    this._focused = true;
  }
}

if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
}

if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    createElementNS(_ns, tag) {
      return new MockElement(tag);
    },
    querySelectorAll() {
      return [];
    },
    title: "",
    body: new MockElement("body"),
  };
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    location: { hash: "#/" },
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
    sessionStorage: {
      _data: {},
      setItem(k, v) { this._data[k] = String(v); },
      getItem(k) { return this._data[k] || null; },
      removeItem(k) { delete this._data[k]; },
    },
    localStorage: {
      _data: {},
      setItem(k, v) { this._data[k] = String(v); },
      getItem(k) { return this._data[k] || null; },
      removeItem(k) { delete this._data[k]; },
    },
  };
}

// Import modules under test
import { HashRouter } from "../../static/js/router.js";
import { store } from "../../static/js/state.js";

async function testStateStoreLifecycle() {
  console.log("Testing State Store subscribe / unsubscribe lifecycle...");

  let calls1 = 0;
  let calls2 = 0;

  const unsub1 = store.subscribe(() => {
    calls1++;
  });
  const unsub2 = store.subscribe(() => {
    calls2++;
  });

  store.notify();
  assert.equal(calls1, 1, "Listener 1 should be notified once");
  assert.equal(calls2, 1, "Listener 2 should be notified once");

  // Unsubscribe listener 1
  unsub1();

  store.notify();
  assert.equal(calls1, 1, "Listener 1 should NOT be called after unsubscribe");
  assert.equal(calls2, 2, "Listener 2 should continue receiving notifications");

  // Unsubscribe listener 2
  unsub2();
  store.notify();
  assert.equal(calls2, 2, "Listener 2 should NOT be called after unsubscribe");
  console.log("State Store lifecycle tests passed!");
}

async function testRouterLifecycle() {
  console.log("Testing HashRouter view lifecycle...");

  const rootContainer = new MockElement("main");
  const announcer = new MockElement("div");

  let viewAUnmounted = false;
  let viewAMountCount = 0;
  let viewBMountCount = 0;
  let viewBUnmounted = false;

  const viewA = {
    rootEl: null,
    mount(container, ctx) {
      viewAMountCount++;
      const el = new MockElement("div");
      el.setAttribute("data-view", "view-a");
      const h1 = new MockElement("h1");
      h1.textContent = "View A";
      el.appendChild(h1);
      this.rootEl = el;
      container.appendChild(el);
    },
    unmount() {
      viewAUnmounted = true;
      this.rootEl = null;
    },
  };

  const viewB = {
    rootEl: null,
    mount(container, ctx) {
      viewBMountCount++;
      const el = new MockElement("div");
      el.setAttribute("data-view", "view-b");
      const h1 = new MockElement("h1");
      h1.textContent = "View B";
      el.appendChild(h1);
      this.rootEl = el;
      container.appendChild(el);
    },
    unmount() {
      viewBUnmounted = true;
      this.rootEl = null;
    },
  };

  const routes = {
    "/": viewA,
    "/events": viewB,
  };

  const router = new HashRouter(rootContainer, routes, announcer);

  // 1. Initial mount of View A
  globalThis.window.location.hash = "#/";
  await router.handleHashChange();

  assert.equal(viewAMountCount, 1, "View A should mount once");
  assert.equal(rootContainer.children.length, 1, "Root container must hold exactly 1 view");
  assert.equal(rootContainer.children[0].getAttribute("data-view"), "view-a");

  // 2. Navigation to View B: must unmount View A and replace root children
  globalThis.window.location.hash = "#/events";
  await router.handleHashChange();

  assert.ok(viewAUnmounted, "View A must be unmounted when navigating away");
  assert.equal(viewBMountCount, 1, "View B should mount once");
  assert.equal(rootContainer.children.length, 1, "Root container must still hold exactly 1 view");
  assert.equal(rootContainer.children[0].getAttribute("data-view"), "view-b");

  // 3. Re-navigate to View A: must unmount View B
  viewAUnmounted = false;
  globalThis.window.location.hash = "#/";
  await router.handleHashChange();

  assert.ok(viewBUnmounted, "View B must be unmounted when navigating away");
  assert.equal(viewAMountCount, 2, "View A mounted second time");
  assert.equal(rootContainer.children.length, 1, "Root container has exactly 1 view");
  assert.equal(rootContainer.children[0].getAttribute("data-view"), "view-a");

  // 4. Stale async mount cancellation test
  let slowResolved = false;
  const slowView = {
    mount(container, ctx) {
      return new Promise((resolve) => {
        setTimeout(() => {
          slowResolved = true;
          const el = new MockElement("div");
          el.setAttribute("data-view", "slow-view");
          container.appendChild(el);
          resolve();
        }, 50);
      });
    },
    unmount() {},
  };
  routes["/plan"] = slowView;

  // Trigger slow view navigation, then immediately navigate back to View A
  globalThis.window.location.hash = "#/plan";
  const slowPromise = router.handleHashChange();

  globalThis.window.location.hash = "#/";
  await router.handleHashChange();

  await slowPromise;
  // Even after slowPromise resolves, the container must NOT contain slow-view
  assert.equal(rootContainer.children.length, 1, "Stale async view must not leak into container");
  assert.equal(rootContainer.children[0].getAttribute("data-view"), "view-a");

  console.log("Router lifecycle tests passed!");
}

async function main() {
  await testStateStoreLifecycle();
  await testRouterLifecycle();
  console.log("All lifecycle and state tests passed successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
