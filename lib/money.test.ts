import { test } from "node:test";
import assert from "node:assert/strict";
import { toMinor, fromMinor, formatMoney, formatMoneyShort } from "./money.ts";

test("toMinor parses whole and fractional amounts", () => {
  assert.equal(toMinor("45.50"), 4550n);
  assert.equal(toMinor("1200"), 120000n);
  assert.equal(toMinor("0.05"), 5n);
  assert.equal(toMinor("3.999"), 400n); // rounds half-up to the cent
});

test("toMinor accepts the comma grouping a bank CSV exports", () => {
  assert.equal(toMinor("1,200.40"), 120040n);
  assert.equal(toMinor("12,345,678.90"), 1234567890n);
});

test("toMinor rejects garbage input rather than guessing", () => {
  assert.throws(() => toMinor(""));
  assert.throws(() => toMinor("-5"));
  assert.throws(() => toMinor("abc"));
  assert.throws(() => toMinor("$5.00"));
});

test("fromMinor / toMinor round-trip", () => {
  assert.equal(fromMinor(toMinor("45.50")), "45.50");
  assert.equal(fromMinor(toMinor("0.01")), "0.01");
  assert.equal(fromMinor(-450n), "-4.50");
});

test("formatMoney renders dollars", () => {
  assert.equal(formatMoney(4550n), "$45.50");
  assert.equal(formatMoney(0n), "$0.00");
});

test("formatMoney groups thousands and keeps the minus outside the symbol", () => {
  assert.equal(formatMoney(454550n), "$4,545.50");
  assert.equal(formatMoney(123456789n), "$1,234,567.89");
  // A credit-card balance is negative; "-$45.50" is the readable form, not "$-45.50".
  assert.equal(formatMoney(-4550n), "-$45.50");
});

test("formatMoneyShort rounds to whole dollars rather than truncating", () => {
  assert.equal(formatMoneyShort(454550n), "$4,546");
  assert.equal(formatMoneyShort(45549n), "$455");
  assert.equal(formatMoneyShort(0n), "$0");
  assert.equal(formatMoneyShort(-454550n), "-$4,546");
});
