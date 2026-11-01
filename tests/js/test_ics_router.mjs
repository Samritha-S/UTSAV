/**
 * Node.js Unit Tests for static/js/lib/ics.js and static/js/router.js
 *
 * Verifies:
 * - RFC 5545 string escaping (backslash, semicolon, comma, newlines).
 * - All-day date arithmetic across month ends, leap years, and year boundaries.
 * - 75-octet line folding and CRLF endings.
 * - Stable, collision-resistant UIDs.
 * - Pure route matching in parseHash.
 */

import assert from "node:assert/strict";
import {
  escapeIcsText,
  computeNextDayIcsDate,
  toIcsDate,
  foldLine,
  generateICS,
} from "../../static/js/lib/ics.js";
import { parseHash } from "../../static/js/router.js";

function runTests() {
  console.log("Starting Node.js test suite for ICS generator and Router helpers...");

  // 1. RFC 5545 Escaping
  assert.equal(
    escapeIcsText("Hello, World; Welcome \\ Home\nSecond line"),
    "Hello\\, World\\; Welcome \\\\ Home\\nSecond line",
    "Should escape backslash, semicolon, comma, and newline"
  );
  assert.equal(escapeIcsText(""), "", "Empty string should return empty string");

  // 2. All-day Date Arithmetic & Rollovers
  assert.equal(toIcsDate("2026-11-05"), "20261105");
  assert.equal(computeNextDayIcsDate("2026-11-05"), "20261106", "Standard day increment");
  assert.equal(computeNextDayIcsDate("2026-01-31"), "20260201", "Month boundary rollover (Jan to Feb)");
  assert.equal(computeNextDayIcsDate("2024-02-28"), "20240229", "Leap year Feb 28 to Feb 29");
  assert.equal(computeNextDayIcsDate("2024-02-29"), "20240301", "Leap year Feb 29 to March 1");
  assert.equal(computeNextDayIcsDate("2025-02-28"), "20250301", "Non-leap year Feb 28 to March 1");
  assert.equal(computeNextDayIcsDate("2026-12-31"), "20270101", "Year boundary rollover (Dec 31 to Jan 1)");

  // 3. Line Folding at 75 Octets
  const shortLine = "SUMMARY:Short line within limits";
  assert.equal(foldLine(shortLine), shortLine, "Lines under 75 bytes should remain unfolded");

  const longLine = "DESCRIPTION:" + "A".repeat(120);
  const folded = foldLine(longLine);
  assert.ok(folded.includes("\r\n "), "Folded line must contain CRLF followed by space");
  const segments = folded.split("\r\n ");
  for (let i = 0; i < segments.length; i++) {
    const bytes = Buffer.byteLength(segments[i], "utf-8");
    assert.ok(bytes <= 75, `Segment ${i} exceeds 75 octets: ${bytes} bytes`);
  }

  // 4. Complete VCALENDAR Structure & Stable UIDs
  const sampleTasks = [
    {
      task_id: "task-venue-book",
      title: "Confirm Venue Booking & Advance Deposit",
      due_date: "2026-12-15",
      description: "Pay 25% deposit, sign contract with sound permit clause.",
      priority: "critical",
      category: "venue",
    },
    {
      task_id: "task-caterer-tasting",
      title: "Menu Food Tasting with Head Maharaj",
      due_date: "2026-12-28",
      description: "Sample regional sweets and finalize live chaat counters.",
      priority: "important",
      category: "catering",
    },
  ];

  const fixedDate = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
  const icsOutput = generateICS("evt-royal-wedding", "Royal Marwar Wedding", sampleTasks, fixedDate);

  // Line endings check: Every line break must be CRLF
  assert.ok(icsOutput.includes("\r\n"), "Must contain CRLF line breaks");
  const nonCrlf = icsOutput.replace(/\r\n/g, "").includes("\n");
  assert.equal(nonCrlf, false, "Must not contain orphaned LF characters without CR");

  // Headers check
  assert.ok(icsOutput.includes("BEGIN:VCALENDAR\r\n"));
  assert.ok(icsOutput.includes("PRODID:-//Utsav Planner//Event Programme//EN\r\n"));
  assert.ok(icsOutput.includes("VERSION:2.0\r\n"));
  assert.ok(icsOutput.includes("CALSCALE:GREGORIAN\r\n"));
  assert.ok(icsOutput.includes("END:VCALENDAR\r\n"));

  // Stable UIDs check
  assert.ok(
    icsOutput.includes("UID:utsav-evt-royal-wedding-task-venue-book@utsavplanner\r\n"),
    "Must generate stable UID for venue task"
  );
  assert.ok(
    icsOutput.includes("UID:utsav-evt-royal-wedding-task-caterer-tasting@utsavplanner\r\n"),
    "Must generate stable UID for catering task"
  );

  // All-day date values check
  assert.ok(icsOutput.includes("DTSTART;VALUE=DATE:20261215\r\n"));
  assert.ok(icsOutput.includes("DTEND;VALUE=DATE:20261216\r\n"));

  // 5. Router Hash Parser (Pure Helpers)
  assert.deepEqual(parseHash(""), { route: "/", params: {}, rawPath: "/" });
  assert.deepEqual(parseHash("#/"), { route: "/", params: {}, rawPath: "/" });
  assert.deepEqual(parseHash("#/plan"), { route: "/plan", params: {}, rawPath: "/plan" });
  assert.deepEqual(parseHash("#/events"), { route: "/events", params: {}, rawPath: "/events" });
  assert.deepEqual(parseHash("#/event/evt-1234"), {
    route: "/event/:id",
    params: { id: "evt-1234" },
    rawPath: "/event/evt-1234",
  });
  assert.deepEqual(parseHash("#/unknown/route"), {
    route: "404",
    params: {},
    rawPath: "/unknown/route",
  });

  // 6. Path-style door routes & query fallback
  assert.deepEqual(parseHash("#/plan/wedding"), {
    route: "/plan",
    params: { type: "wedding" },
    rawPath: "/plan/wedding",
  });
  assert.deepEqual(parseHash("#/plan/birthday"), {
    route: "/plan",
    params: { type: "birthday" },
    rawPath: "/plan/birthday",
  });
  assert.deepEqual(parseHash("#/plan/community"), {
    route: "/plan",
    params: { type: "community" },
    rawPath: "/plan/community",
  });
  assert.deepEqual(parseHash("#/plan?type=wedding"), {
    route: "/plan",
    params: { type: "wedding" },
    rawPath: "/plan?type=wedding",
  });

  console.log("All Node.js ICS & Router helper tests passed successfully!");
}

runTests();
