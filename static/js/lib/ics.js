/**
 * Utsav Planner - RFC 5545 iCalendar (.ics) Generator
 *
 * Pure, testable ES module for generating standards-compliant iCalendar files.
 * Features:
 * - RFC 5545 VCALENDAR header with PRODID, VERSION:2.0, CALSCALE:GREGORIAN.
 * - All-day VEVENT per task using DTSTART;VALUE=DATE and DTEND;VALUE=DATE (next day).
 * - Correct date arithmetic across month and leap-year boundaries.
 * - Stable, collision-resistant UIDs: `utsav-<eventId>-<taskId>@utsavplanner`.
 * - RFC 5545 escaping for backslash, semicolon, comma, and newline characters.
 * - 75-octet line folding using CRLF followed by a single space.
 * - CRLF line endings throughout (\r\n).
 * - Zero browser DOM dependencies in generation logic (Node and browser compatible).
 */

/**
 * Escape special characters per RFC 5545 §3.3.11.
 * Special characters in TEXT values: backslash (\), semicolon (;), comma (,), and newlines.
 *
 * @param {string} str
 * @returns {string} Escaped string
 */
export function escapeIcsText(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Format a Date object into UTC iCalendar timestamp (YYYYMMDDTHHMMSSZ).
 * @param {Date} [date]
 * @returns {string}
 */
export function formatDtStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) into iCalendar DATE format (YYYYMMDD).
 * @param {string} isoDateStr
 * @returns {string} YYYYMMDD
 */
export function toIcsDate(isoDateStr) {
  if (!isoDateStr) return "";
  const parts = isoDateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0]}${parts[1].padStart(2, "0")}${parts[2].padStart(2, "0")}`;
  }
  return isoDateStr.replace(/-/g, "");
}

/**
 * Compute the next calendar day in YYYYMMDD format for all-day iCalendar DTEND.
 * Properly calculates across month ends, leap years, and year ends.
 *
 * @param {string} isoDateStr - Format YYYY-MM-DD
 * @returns {string} YYYYMMDD
 */
export function computeNextDayIcsDate(isoDateStr) {
  if (!isoDateStr) return "";
  const parts = isoDateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed in JS Date
  const day = parseInt(parts[2], 10);

  // UTC date arithmetic prevents time-zone drift
  const nextDate = new Date(Date.UTC(year, month, day + 1));
  const pad = (n) => String(n).padStart(2, "0");
  const nextY = nextDate.getUTCFullYear();
  const nextM = pad(nextDate.getUTCMonth() + 1);
  const nextD = pad(nextDate.getUTCDate());
  return `${nextY}${nextM}${nextD}`;
}

/**
 * Fold an iCalendar line so no line exceeds 75 octets (UTF-8 bytes).
 * RFC 5545 §3.1: Lines are folded by inserting CRLF followed by a single space (0x20).
 *
 * @param {string} line
 * @returns {string}
 */
export function foldLine(line) {
  // Use TextEncoder if available (browser/Node 11+), otherwise fallback to character length
  const maxBytes = 75;

  if (typeof TextEncoder === "undefined") {
    if (line.length <= maxBytes) return line;
    let result = "";
    let remaining = line;
    let first = true;
    while (remaining.length > 0) {
      const sliceLen = first ? maxBytes : maxBytes - 1;
      const chunk = remaining.slice(0, sliceLen);
      remaining = remaining.slice(sliceLen);
      if (first) {
        result += chunk;
        first = false;
      } else {
        result += "\r\n " + chunk;
      }
    }
    return result;
  }

  const encoder = new TextEncoder();
  const lineBytes = encoder.encode(line);
  if (lineBytes.length <= maxBytes) {
    return line;
  }

  // Segment by UTF-8 byte boundary
  const parts = [];
  let currentBytes = 0;
  let currentPart = "";
  let isFirstLine = true;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    const limit = isFirstLine ? maxBytes : maxBytes - 1; // Accounting for leading space

    if (currentBytes + charBytes > limit) {
      parts.push(currentPart);
      currentPart = char;
      currentBytes = charBytes;
      isFirstLine = false;
    } else {
      currentPart += char;
      currentBytes += charBytes;
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts.join("\r\n ");
}

/**
 * Generate a complete RFC 5545 iCalendar (.ics) string for a list of timeline tasks.
 *
 * @param {string} eventId - Unique identifier of the celebratory event
 * @param {string} eventTitle - Title of the celebration (e.g. "Royal Marwar Wedding")
 * @param {Array<Object>} tasks - Timeline tasks with { task_id, title, due_date, description, priority }
 * @param {Date} [dtstampDate] - Optional fixed date for deterministic testing
 * @returns {string} Valid iCalendar content with CRLF line endings
 */
export function generateICS(eventId, eventTitle, tasks, dtstampDate = new Date()) {
  const dtstamp = formatDtStamp(dtstampDate);
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Utsav Planner//Event Programme//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(eventTitle)} — Utsav Planner`,
  ];

  if (Array.isArray(tasks)) {
    for (const task of tasks) {
      if (!task || !task.due_date) continue;

      const uid = `utsav-${eventId || "plan"}-${task.task_id || Math.random().toString(36).slice(2)}@utsavplanner`;
      const dtstart = toIcsDate(task.due_date);
      const dtend = computeNextDayIcsDate(task.due_date);
      const summary = task.title ? escapeIcsText(task.title) : "Planning Milestone";

      const descParts = [];
      if (task.description) {
        descParts.push(task.description);
      }
      if (task.priority) {
        descParts.push(`Priority: ${task.priority.toUpperCase()}`);
      }
      if (task.category) {
        descParts.push(`Category: ${task.category}`);
      }
      descParts.push("Generated by Utsav Planner");
      const description = escapeIcsText(descParts.join("\n\n"));

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DESCRIPTION:${description}`);
      lines.push("STATUS:CONFIRMED");
      lines.push("TRANSP:TRANSPARENT");
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");

  // Fold every line to <= 75 octets and join with CRLF
  const folded = lines.map(foldLine);
  return folded.join("\r\n") + "\r\n";
}

/**
 * Browser helper to trigger client-side download of the generated .ics file.
 * Safely creates an Object URL from a Blob and revokes it immediately.
 *
 * @param {string} icsContent - Raw .ics text content
 * @param {string} filename - Suggested filename (e.g. "utsav-wedding-timeline.ics")
 */
export function downloadICS(icsContent, filename = "utsav-plan-timeline.ics") {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
