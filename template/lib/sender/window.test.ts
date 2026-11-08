import { test } from "node:test";
import assert from "node:assert/strict";
import { addBusinessDays, inWindow, startOfRunDay, tzFor } from "./window";

test("time zone from country, with a stored zone winning", () => {
  assert.equal(tzFor("US"), "America/Chicago");
  assert.equal(tzFor("Germany"), "Europe/Berlin");
  assert.equal(tzFor(null), "Europe/London");
  assert.equal(tzFor("US", "America/Los_Angeles"), "America/Los_Angeles");
});

test("send window is Mon–Fri 09–17 local", () => {
  // Monday 2026-11-09 08:30 UTC = 08:30 London (closed), 09:30 Berlin (open)
  const mon0830 = new Date("2026-11-09T08:30:00Z");
  assert.equal(inWindow(mon0830, "Europe/London"), false);
  assert.equal(inWindow(mon0830, "Europe/Berlin"), true);
  assert.equal(inWindow(new Date("2026-11-09T16:59:00Z"), "Europe/London"), true);
  assert.equal(inWindow(new Date("2026-11-09T17:00:00Z"), "Europe/London"), false);
  // Saturday noon
  assert.equal(inWindow(new Date("2026-11-07T12:00:00Z"), "Europe/London"), false);
  // Chicago is 6 h behind UTC in November: 14:00 UTC = 08:00 local
  assert.equal(inWindow(new Date("2026-11-09T14:00:00Z"), "America/Chicago"), false);
  assert.equal(inWindow(new Date("2026-11-09T15:00:00Z"), "America/Chicago"), true);
});

test("business days skip the weekend", () => {
  // Thursday + 3 business days = Tuesday
  assert.equal(addBusinessDays(new Date("2026-11-05T10:00:00Z"), 3).toISOString(), "2026-11-10T10:00:00.000Z");
  // Friday + 5 = next Friday
  assert.equal(addBusinessDays(new Date("2026-11-06T10:00:00Z"), 5).toISOString(), "2026-11-13T10:00:00.000Z");
});

test("run day starts at UTC midnight", () => {
  assert.equal(startOfRunDay(new Date("2026-11-09T23:59:00Z")).toISOString(), "2026-11-09T00:00:00.000Z");
});
