import { test } from "node:test";
import assert from "node:assert/strict";
import { daysBetween, isOlderThanDays, formatShortDate, todayIso } from "./date.ts";

test("daysBetween counts calendar days, direction-aware", () => {
  assert.equal(daysBetween("2026-08-01", "2026-08-15"), 14);
  assert.equal(daysBetween("2026-08-15", "2026-08-01"), -14);
  assert.equal(daysBetween("2026-08-01", "2026-08-01"), 0);
});

test("isOlderThanDays matches the FX staleness rule (>7 days)", () => {
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  assert.equal(isOlderThanDays(iso(eightDaysAgo), 7), true);
  assert.equal(isOlderThanDays(iso(sixDaysAgo), 7), false);
  assert.equal(isOlderThanDays(todayIso(), 7), false);
});

test("formatShortDate renders a plain human date", () => {
  assert.equal(formatShortDate("2026-08-15"), "Aug 15");
});
