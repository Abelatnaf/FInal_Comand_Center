import { test } from "node:test";
import assert from "node:assert/strict";
import { toMinor, fromMinor, formatMoney, convertToUsdMinor } from "./money.ts";

test("toMinor parses whole and fractional amounts", () => {
  assert.equal(toMinor("45.50"), 4550n);
  assert.equal(toMinor("1200"), 120000n);
  assert.equal(toMinor("0.05"), 5n);
  assert.equal(toMinor("3.999"), 400n); // rounds half-up to the cent
});

test("toMinor rejects garbage input rather than guessing", () => {
  assert.throws(() => toMinor(""));
  assert.throws(() => toMinor("-5"));
  assert.throws(() => toMinor("abc"));
});

test("fromMinor / toMinor round-trip", () => {
  assert.equal(fromMinor(toMinor("45.50")), "45.50");
  assert.equal(fromMinor(toMinor("0.01")), "0.01");
  assert.equal(fromMinor(-450n), "-4.50");
});

test("formatMoney adds the right symbol", () => {
  assert.equal(formatMoney(4550n, "USD"), "$45.50");
  assert.equal(formatMoney(4550n, "ETB"), "ETB 45.50");
});

test("convertToUsdMinor: USD passes through unchanged", () => {
  assert.equal(convertToUsdMinor(20000n, "USD", 130), 20000n);
});

test("convertToUsdMinor: ETB converts and rounds half-up, matching the DB trigger", () => {
  // Same numbers exercised in the rollback-only SQL test against the live trigger.
  assert.equal(convertToUsdMinor(10000n, "ETB", 130), 77n); // 10000/130 = 76.92.. -> 77
  assert.equal(convertToUsdMinor(20000n, "ETB", 130), 154n); // 20000/130 = 153.84.. -> 154
});

test("convertToUsdMinor: negative balances round the same way (ties away from zero)", () => {
  assert.equal(convertToUsdMinor(-10000n, "ETB", 130), -77n);
});

test("convertToUsdMinor: rejects a non-positive rate instead of dividing by zero", () => {
  assert.throws(() => convertToUsdMinor(1000n, "ETB", 0));
  assert.throws(() => convertToUsdMinor(1000n, "ETB", -5));
});

test("convertToUsdMinor is pure — a historical rate never drifts just because a newer rate exists", () => {
  const loggedInMarch = convertToUsdMinor(10000n, "ETB", 180); // March's rate, frozen on the row
  const currentRate = 90; // rate has since moved a lot
  // Calling the function again with March's own frozen rate must give the
  // identical answer regardless of what "currentRate" is elsewhere in scope —
  // there is no live lookup inside this function for it to drift through.
  const recomputedFromFrozenRate = convertToUsdMinor(10000n, "ETB", 180);
  assert.equal(loggedInMarch, recomputedFromFrozenRate);
  assert.notEqual(loggedInMarch, convertToUsdMinor(10000n, "ETB", currentRate));
});
