/**
 * Utsav Planner - Multi-Event Storage & Persistence Module (utsav_v3)
 *
 * Persists up to 20 saved celebratory event plans across browser sessions.
 * Features:
 * - Versioned schema (`utsav_v3`) stored under `utsav_planner_events`.
 * - Safe migration from single-plan legacy schema (`utsav_v2` / `utsav_planner_state`).
 * - Hard cap of 20 saved events to respect browser quotas.
 * - Defensive try/catch wrapping around all storage calls with graceful failure reporting.
 * - Complete ban on innerHTML, outerHTML, document.write, or eval.
 */

export const STORAGE_KEY = "utsav_planner_events";
export const LEGACY_STORAGE_KEY = "utsav_planner_state";
export const SCHEMA_VERSION = "utsav_v3";
export const MAX_SAVED_EVENTS = 20;

/**
 * Check if localStorage is supported and accessible.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    const probe = "__utsav_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a short, collision-resistant random alphanumeric identifier.
 * Uses crypto.randomUUID where available, falling back to secure random values.
 * @returns {string} 8-character ID
 */
export function generateEventId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    }
  } catch {
    // Fallback below
  }
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Migrate legacy single-plan state from utsav_v2 to utsav_v3.
 * Executed defensively on initial module evaluation.
 */
function migrateLegacyStorage() {
  if (!isStorageAvailable()) return;

  try {
    const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawLegacy) return;

    const data = JSON.parse(rawLegacy);
    if (data && data.version === "utsav_v2" && data.currentPlan) {
      const existingRaw = window.localStorage.getItem(STORAGE_KEY);
      let events = [];
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (parsed && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.events)) {
            events = parsed.events;
          }
        } catch {
          events = [];
        }
      }

      // Avoid duplicate migration if already present
      const alreadyMigrated = events.some(
        (e) => e.plan && e.plan.generated_at === data.currentPlan.generated_at
      );

      if (!alreadyMigrated && events.length < MAX_SAVED_EVENTS) {
        const themeTitle = data.currentPlan.ideas?.themes?.[0]?.name || "Celebration";
        const eventType = data.currentPlan.event_summary?.event_type || "Event";
        const prettyType = eventType.charAt(0).toUpperCase() + eventType.slice(1);
        const title = `${themeTitle} ${prettyType}`;

        const migratedEvent = {
          id: generateEventId(),
          title: title.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          formInputs: data.formInputs || {},
          plan: data.currentPlan,
          checkedItems: Array.from(data.checkedItems || []),
          shortlist: [],
          scenarioBudget: null,
        };

        events.unshift(migratedEvent);
        const payload = {
          version: SCHEMA_VERSION,
          updatedAt: Date.now(),
          events,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    }
    // Safely remove legacy key to keep storage tidy
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn("Utsav Planner: Legacy migration skipped", err);
  }
}

// Run migration immediately
migrateLegacyStorage();

/**
 * Retrieve all saved events from localStorage.
 * @returns {Array<Object>} List of event objects
 */
export function getAllEvents() {
  if (!isStorageAvailable()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || data.version !== SCHEMA_VERSION || !Array.isArray(data.events)) {
      return [];
    }
    return data.events;
  } catch (err) {
    console.warn("Utsav Planner: Could not read events from localStorage", err);
    return [];
  }
}

/**
 * Get a single saved event by its unique short ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getEventById(id) {
  if (!id) return null;
  const events = getAllEvents();
  return events.find((e) => e.id === id) || null;
}

/**
 * Save a newly generated event to localStorage.
 * Enforces the 20-event maximum cap.
 *
 * @param {Object} eventData
 * @param {string} eventData.title
 * @param {Object} eventData.formInputs
 * @param {Object} eventData.plan
 * @returns {{ ok: boolean, event?: Object, error?: string }}
 */
export function saveNewEvent(eventData) {
  if (!isStorageAvailable()) {
    return { ok: false, error: "storage_unavailable" };
  }

  try {
    const events = getAllEvents();
    if (events.length >= MAX_SAVED_EVENTS) {
      return { ok: false, error: "cap_reached" };
    }

    const newEvent = {
      id: generateEventId(),
      title: eventData.title || "Celebration Plan",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formInputs: eventData.formInputs || {},
      plan: eventData.plan,
      checkedItems: Array.isArray(eventData.checkedItems) ? eventData.checkedItems : [],
      shortlist: Array.isArray(eventData.shortlist) ? eventData.shortlist : [],
      scenarioBudget: eventData.scenarioBudget || null,
    };

    events.unshift(newEvent);
    const payload = {
      version: SCHEMA_VERSION,
      updatedAt: Date.now(),
      events,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true, event: newEvent };
  } catch (err) {
    console.warn("Utsav Planner: Could not save new event", err);
    return { ok: false, error: "save_failed" };
  }
}

/**
 * Update an existing event in localStorage.
 * @param {string} id
 * @param {Object} patch - Partial fields to update
 * @returns {Object|null} Updated event or null
 */
export function updateEvent(id, patch) {
  if (!isStorageAvailable() || !id) return null;

  try {
    const events = getAllEvents();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    events[idx] = {
      ...events[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const payload = {
      version: SCHEMA_VERSION,
      updatedAt: Date.now(),
      events,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return events[idx];
  } catch (err) {
    console.warn("Utsav Planner: Could not update event", err);
    return null;
  }
}

/**
 * Delete a saved event by ID.
 * @param {string} id
 * @returns {boolean}
 */
export function deleteEvent(id) {
  if (!isStorageAvailable() || !id) return false;

  try {
    const events = getAllEvents();
    const filtered = events.filter((e) => e.id !== id);
    if (filtered.length === events.length) return false;

    const payload = {
      version: SCHEMA_VERSION,
      updatedAt: Date.now(),
      events: filtered,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn("Utsav Planner: Could not delete event", err);
    return false;
  }
}

/**
 * Duplicate an existing event.
 * @param {string} id
 * @returns {{ ok: boolean, event?: Object, error?: string }}
 */
export function duplicateEvent(id) {
  if (!isStorageAvailable() || !id) {
    return { ok: false, error: "storage_unavailable" };
  }

  const existing = getEventById(id);
  if (!existing) {
    return { ok: false, error: "not_found" };
  }

  const events = getAllEvents();
  if (events.length >= MAX_SAVED_EVENTS) {
    return { ok: false, error: "cap_reached" };
  }

  return saveNewEvent({
    title: `${existing.title} (Copy)`,
    formInputs: JSON.parse(JSON.stringify(existing.formInputs || {})),
    plan: JSON.parse(JSON.stringify(existing.plan)),
    checkedItems: [...(existing.checkedItems || [])],
    shortlist: [...(existing.shortlist || [])],
    scenarioBudget: existing.scenarioBudget ? JSON.parse(JSON.stringify(existing.scenarioBudget)) : null,
  });
}

/**
 * Rename an existing event.
 * @param {string} id
 * @param {string} newTitle
 * @returns {boolean}
 */
export function renameEvent(id, newTitle) {
  if (!newTitle || !newTitle.trim()) return false;
  const updated = updateEvent(id, { title: newTitle.trim() });
  return Boolean(updated);
}

/**
 * Wipe all saved events.
 * @returns {boolean}
 */
export function clearAllEvents() {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
