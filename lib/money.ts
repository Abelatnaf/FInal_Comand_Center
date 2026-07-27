// Money helpers. Nothing outside this file does arithmetic on money.
// Amounts are always minor units (bigint) — never floats, never decimal
// strings used as a source of truth. See CLAUDE.md v3 plan section 5.

export type Currency = "ETB" | "USD";

const MINOR_PER_MAJOR = 100n;

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  ETB: "ETB ",
};

/**
 * Parses a decimal amount typed by a human (e.g. "45.5", "1200") into minor
 * units. String-based, so it never routes through a float.
 */
export function toMinor(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`toMinor: not a valid non-negative decimal amount: "${input}"`);
  }
  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const padded = (fractionPart + "000").slice(0, 3);
  const twoDigits = padded.slice(0, 2);
  const roundDigit = padded.charCodeAt(2) - 48;
  let minor = BigInt(wholePart || "0") * MINOR_PER_MAJOR + BigInt(twoDigits || "0");
  if (roundDigit >= 5) minor += 1n;
  return minor;
}

/** Minor units back to a plain decimal string, e.g. 4550n -> "45.50". */
export function fromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / MINOR_PER_MAJOR;
  const frac = abs % MINOR_PER_MAJOR;
  return `${negative ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Formats minor units for display, e.g. formatMoney(4550n, "USD") -> "$45.50". */
export function formatMoney(minor: bigint, currency: Currency): string {
  return `${CURRENCY_SYMBOL[currency]}${fromMinor(minor)}`;
}

/**
 * Converts a minor-unit amount into its USD-minor-unit equivalent at the
 * given ETB-per-USD rate, rounding half-up once. Pure and stateless — it
 * only ever uses the rate it's given, never a live-looked-up one. That's
 * what makes a frozen historical rate stay frozen: nothing here can reach
 * for "today's" rate on its own. Only for forward-looking estimates
 * (coverage) — a transaction's own frozen fields come from the database
 * trigger, not this function.
 */
export function convertToUsdMinor(minor: bigint, currency: Currency, etbPerUsd: number): bigint {
  if (currency === "USD") return minor;
  if (!(etbPerUsd > 0)) {
    throw new Error("convertToUsdMinor: rate must be a positive number");
  }
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const rateScaled = BigInt(Math.round(etbPerUsd * 10000));
  const numerator = abs * 10000n;
  const half = rateScaled / 2n;
  const result = (numerator + half) / rateScaled;
  return negative ? -result : result;
}
