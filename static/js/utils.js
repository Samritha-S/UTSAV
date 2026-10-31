/**
 * Utsav Planner - Utility Functions
 *
 * Provides safe DOM construction (h helper), currency formatting via Intl (en-IN),
 * date formatting, and sample presets.
 *
 * STRICT SECURITY: Never uses innerHTML, outerHTML, insertAdjacentHTML, or eval.
 */

/**
 * Map raw enum values and technical keys to natural human labels.
 */
export const HUMAN_LABELS = {
  // Event Types
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community Celebration",

  // City Tiers
  metro: "Metro (Tier 1)",
  tier2: "Tier 2",
  tier3: "Tier 3",
  tier_1: "Metro (Tier 1)",
  tier_2: "Tier 2",
  tier_3: "Tier 3",

  // Venue Settings
  indoor: "Indoor",
  outdoor: "Outdoor",
  mixed: "Indoor & Outdoor",
  both: "Indoor & Outdoor",
  indoor_banquet: "Indoor Banquet",
  outdoor_lawn: "Outdoor Lawn",

  // Dietary Preferences
  vegetarian: "Vegetarian",
  veg: "Vegetarian",
  veg_only: "Vegetarian",
  non_veg: "Non-Vegetarian",
  "non-veg": "Non-Vegetarian",
  jain: "Jain",
  pure_jain: "Jain",
  vegan: "Vegan",
  halal: "Halal",
  sattvic: "Sattvic",

  // Task Priorities
  critical: "Critical",
  important: "Important",
  optional: "Optional",

  // Task Statuses
  on_track: "On Track",
  due_soon: "Due Soon",
  overdue_compressed: "Overdue",

  // Age Groups
  kids: "Kids (0–12 yrs)",
  teens: "Teens (13–19 yrs)",
  adults: "Adults (20–59 yrs)",
  seniors: "Seniors (60+ yrs)",
};

/**
 * Return a user-friendly label for any internal identifier or enum.
 * @param {string} key
 * @returns {string}
 */
export function humanLabel(key) {
  if (!key) return "";
  const normalized = String(key).toLowerCase().trim();
  if (HUMAN_LABELS[normalized]) {
    return HUMAN_LABELS[normalized];
  }
  // Fallback: title case with underscores replaced by spaces
  const unslugged = String(key).replace(/_/g, " ");
  return unslugged.charAt(0).toUpperCase() + unslugged.slice(1);
}

/**
 * Pluralize a noun with correct English singular/plural form.
 * e.g. pluralize(1, "guest") -> "1 guest"
 * e.g. pluralize(25, "guest") -> "25 guests"
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string}
 */
export function pluralize(count, singular, plural = null) {
  const n = Math.abs(Number(count) || 0);
  const p = plural || `${singular}s`;
  return `${count} ${n === 1 ? singular : p}`;
}

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
 * Format a numeric amount in compact Indian notation for space-constrained UI elements.
 * e.g. 1500000 -> "₹15 lakh", 25000000 -> "₹2.5 crore"
 * @param {number} amount
 * @returns {string}
 */
export function formatCompactINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return "₹0";
  }
  const num = Math.round(amount);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);

  if (abs >= 10000000) {
    const cr = (abs / 10000000).toFixed(2).replace(/\.00$/, "");
    return `${sign}₹${cr} crore`;
  }
  if (abs >= 100000) {
    const lk = (abs / 100000).toFixed(2).replace(/\.00$/, "");
    return `${sign}₹${lk} lakh`;
  }
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(1).replace(/\.0$/, "");
    return `${sign}₹${k}k`;
  }
  return formatINR(amount);
}

/**
 * Format a numeric amount in words for accessible descriptions (e.g. "(15 Lakh)", "(1.2 Crore)").
 * @param {number} amount
 * @returns {string}
 */
export function formatINRWords(amount) {
  if (!amount || isNaN(amount) || amount <= 0) return "";
  const num = Math.round(amount);
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, "");
    return `(${cr} Crore)`;
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
 * Format a financial difference with an explicit sign and direction wording.
 * e.g. 42000 -> "₹42,000 more", -10000 -> "₹10,000 less"
 * @param {number} diff
 * @returns {string}
 */
export function formatDiffINR(diff) {
  const d = Math.round(diff);
  if (d === 0) return "No difference";
  const absFormatted = formatINR(Math.abs(d));
  return d > 0 ? `${absFormatted} more` : `${absFormatted} less`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) into readable Indian date with Asia/Kolkata timezone context.
 * e.g. "2027-02-15" -> "15 Feb 2027" (or "Mon, 15 Feb 2027" if includeWeekday=true)
 * @param {string} dateStr
 * @param {boolean} [includeWeekday=false]
 * @returns {string}
 */
export function formatDate(dateStr, includeWeekday = false) {
  if (!dateStr) return "";
  try {
    const parts = String(dateStr).split("-");
    let d;
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return String(dateStr);

    const options = {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    };
    if (includeWeekday) {
      options.weekday = "short";
    }
    return new Intl.DateTimeFormat("en-IN", options).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Compute the calendar day difference and descriptive phrase for a target celebration date.
 * Accurately handles today, tomorrow, yesterday, and future/past dates without off-by-one errors.
 * @param {string} dateStr
 * @returns {{ days: number, text: string }}
 */
export function getCountdownInfo(dateStr) {
  if (!dateStr) return { days: 0, text: "" };
  try {
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return { days: 0, text: "" };
    const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { days: 0, text: "Today is celebration day" };
    if (diffDays === 1) return { days: 1, text: "1 day to go — tomorrow is the day!" };
    if (diffDays > 1) return { days: diffDays, text: `${diffDays} days to go` };
    if (diffDays === -1) return { days: -1, text: "Celebrated yesterday" };
    const past = Math.abs(diffDays);
    return { days: diffDays, text: `Celebrated ${past} days ago` };
  } catch {
    return { days: 0, text: "" };
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

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Safe SVG element factory function.
 * @param {string} tag
 * @param {Object} [props]
 * @param {...(Node|string|number)} children
 * @returns {SVGElement}
 */
export function svg(tag, props = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val !== null && val !== undefined) {
        el.setAttribute(key, String(val));
      }
    }
  }
  children.forEach((child) => {
    if (child instanceof Node) {
      el.appendChild(child);
    } else if (child !== null && child !== undefined) {
      el.appendChild(document.createTextNode(String(child)));
    }
  });
  return el;
}

/**
 * Generate a small, authentic geometric Kolam / Rangoli-style dot-and-line SVG motif.
 * Uses currentColor so it inherits text color seamlessly.
 *
 * @param {"mark"|"divider"|"spinner"} variant
 * @param {number} [width]
 * @param {number} [height]
 * @returns {SVGSVGElement}
 */
export function createKolamMotif(variant = "mark", width = 24, height = 24) {
  if (variant === "divider") {
    // Elegant horizontal dot-and-line ornamental section divider
    const el = svg(
      "svg",
      {
        width: width || 64,
        height: height || 16,
        viewBox: "0 0 64 16",
        fill: "none",
        class: "kolam-divider",
        "aria-hidden": "true",
      },
      // Center flower/diamond
      svg("path", {
        d: "M32 2 L36 8 L32 14 L28 8 Z",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.25",
      }),
      // Center dot
      svg("circle", { cx: "32", cy: "8", r: "1.2", fill: "currentColor" }),
      // Flanking horizontal lines and accent dots
      svg("line", { x1: "4", y1: "8", x2: "24", y2: "8", stroke: "currentColor", "stroke-width": "1" }),
      svg("circle", { cx: "14", cy: "8", r: "1", fill: "currentColor" }),
      svg("line", { x1: "40", y1: "8", x2: "60", y2: "8", stroke: "currentColor", "stroke-width": "1" }),
      svg("circle", { cx: "50", cy: "8", r: "1", fill: "currentColor" })
    );
    return el;
  }

  if (variant === "spinner") {
    // Symmetrical 8-point geometric Kolam for loading state
    const el = svg(
      "svg",
      {
        width: width || 32,
        height: height || 32,
        viewBox: "0 0 32 32",
        fill: "none",
        class: "kolam-spinner",
        "aria-hidden": "true",
      },
      // Central concentric petals
      svg("rect", {
        x: "10",
        y: "10",
        width: "12",
        height: "12",
        stroke: "currentColor",
        "stroke-width": "1.25",
        fill: "none",
      }),
      svg("rect", {
        x: "10",
        y: "10",
        width: "12",
        height: "12",
        transform: "rotate(45 16 16)",
        stroke: "currentColor",
        "stroke-width": "1.25",
        fill: "none",
      }),
      svg("circle", { cx: "16", cy: "16", r: "2", fill: "currentColor" }),
      // Cardinal dots
      svg("circle", { cx: "16", cy: "4", r: "1.2", fill: "currentColor" }),
      svg("circle", { cx: "28", cy: "16", r: "1.2", fill: "currentColor" }),
      svg("circle", { cx: "16", cy: "28", r: "1.2", fill: "currentColor" }),
      svg("circle", { cx: "4", cy: "16", r: "1.2", fill: "currentColor" })
    );
    return el;
  }

  // Default "mark": Symmetrical 4-petal traditional kolam logomark
  const el = svg(
    "svg",
    {
      width: width || 24,
      height: height || 24,
      viewBox: "0 0 24 24",
      fill: "none",
      class: "kolam-mark",
      "aria-hidden": "true",
    },
    // Square rotated 45 deg
    svg("rect", {
      x: "7",
      y: "7",
      width: "10",
      height: "10",
      transform: "rotate(45 12 12)",
      stroke: "currentColor",
      "stroke-width": "1.5",
      fill: "none",
    }),
    // 4 cardinal loop petals
    svg("circle", { cx: "12", cy: "6", r: "2.5", stroke: "currentColor", "stroke-width": "1.2", fill: "none" }),
    svg("circle", { cx: "18", cy: "12", r: "2.5", stroke: "currentColor", "stroke-width": "1.2", fill: "none" }),
    svg("circle", { cx: "12", cy: "18", r: "2.5", stroke: "currentColor", "stroke-width": "1.2", fill: "none" }),
    svg("circle", { cx: "6", cy: "12", r: "2.5", stroke: "currentColor", "stroke-width": "1.2", fill: "none" }),
    // Central bindu dot
    svg("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" })
  );
  return el;
}

/**
 * Format per-guest live reaction string.
 * @param {number} budget
 * @param {number} guests
 * @returns {string} e.g. "about ₹7,500 per guest"
 */
export function formatPerGuestReaction(budget, guests) {
  if (!budget || !guests || guests <= 0 || budget <= 0) return "";
  const perGuest = Math.round(budget / guests);
  return `about ${formatINR(perGuest)} per guest`;
}

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
