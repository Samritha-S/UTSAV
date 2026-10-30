/**
 * Utsav Planner - Utility Functions
 *
 * Provides safe DOM construction (h helper), currency formatting via Intl (en-IN),
 * date formatting, and sample presets.
 *
 * STRICT SECURITY: Never uses innerHTML, outerHTML, insertAdjacentHTML, or eval.
 */

/**
 * Format a numeric amount into Indian Rupee representation with lakh/crore grouping.
 * e.g. 1500000 -> "₹15,00,000"
 * @param {number} amount
 * @returns {string}
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format a numeric amount in words / concise label (e.g. "15 Lakh", "1.2 Crore").
 * @param {number} amount
 * @returns {string}
 */
export function formatINRWords(amount) {
  if (!amount || isNaN(amount) || amount <= 0) return "";
  const num = Math.round(amount);
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, "");
    return `(${cr} Cr)`;
  }
  if (num >= 100000) {
    const lk = (num / 100000).toFixed(2).replace(/\.00$/, "");
    return `(${lk} Lakh)`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, "");
    return `(${k}k)`;
  }
  return "";
}

/**
 * Format an ISO date string (YYYY-MM-DD) into readable Indian date.
 * e.g. "2027-02-15" -> "15 Feb 2027"
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    }
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Safe DOM element factory function.
 * Creates elements via document.createElement and sets properties/attributes safely.
 *
 * @param {string} tag - HTML tag name (e.g. 'div', 'button', 'span')
 * @param {Object} [props] - Attributes, event listeners, and properties
 * @param {...(Node|string|number|null|undefined|Array)} children - Child nodes or text
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val === null || val === undefined) continue;

      if (key.startsWith("on") && typeof val === "function") {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, val);
      } else if (key === "className" || key === "class") {
        el.className = String(val);
      } else if (key === "dataset" && typeof val === "object") {
        for (const [dataKey, dataVal] of Object.entries(val)) {
          el.dataset[dataKey] = String(dataVal);
        }
      } else if (key === "style" && typeof val === "object") {
        // Safe style properties setter (no raw string injection)
        for (const [styleProp, styleVal] of Object.entries(val)) {
          if (styleVal !== null && styleVal !== undefined) {
            el.style.setProperty(styleProp, String(styleVal));
          }
        }
      } else if (key in el && typeof el[key] === "boolean") {
        el[key] = Boolean(val);
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }

  function appendChildSafe(child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(appendChildSafe);
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  children.forEach(appendChildSafe);
  return el;
}

/**
 * Pre-configured realistic sample presets for instant demoing.
 */
export const SAMPLE_PRESETS = {
  wedding: {
    event_type: "wedding",
    event_date: getOffsetDateString(90),
    guest_count: 250,
    budget_inr: 1800000,
    city: "Jaipur",
    city_tier: "tier2",
    venue_setting: "both",
    dietary_preferences: ["vegetarian", "jain"],
    age_group: "",
    theme_notes: "Royal Marwar aesthetic with marigold floral decor, sunset varmala, and live Shehnai music.",
  },
  birthday: {
    event_type: "birthday",
    event_date: getOffsetDateString(25),
    guest_count: 45,
    budget_inr: 65000,
    city: "Bengaluru",
    city_tier: "metro",
    venue_setting: "indoor",
    dietary_preferences: ["vegetarian"],
    age_group: "kids",
    theme_notes: "Jungle safari wildlife explorer party with DIY animal masks and chocolate truffle cake.",
  },
  community: {
    event_type: "community",
    event_date: getOffsetDateString(45),
    guest_count: 500,
    budget_inr: 250000,
    city: "Pune",
    city_tier: "tier2",
    venue_setting: "outdoor",
    dietary_preferences: ["vegetarian"],
    age_group: "",
    theme_notes: "Diwali Anand Mela with lantern canopies, traditional rangoli competition, and live Dandiya circle.",
  },
};

/**
 * Helper to compute an ISO date string offset from today.
 * @param {number} daysOffset
 * @returns {string}
 */
export function getOffsetDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
