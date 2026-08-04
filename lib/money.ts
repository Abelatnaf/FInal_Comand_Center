// Money helpers. Nothing outside this file does arithmetic on money.
// Amounts are always minor units (cents, as bigint) — never floats, never
// decimal strings used as a source of truth.
//
// The app is US dollars only. There is deliberately no currency parameter
// anywhere: a second currency needs a stored exchange rate per transaction to
// stay honest about historical amounts, and that whole system was removed
// rather than left half-built.

const MINOR_PER_MAJOR = 100n;

/**
 * Parses a decimal amount typed by a human (e.g. "45.5", "1200", "1,200.40")
 * into cents. String-based, so it never routes through a float.
 */
export function toMinor(input: string): bigint {
  const trimmed = input.trim().replace(/,/g, "");
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

/** Cents back to a plain decimal string, e.g. 4550n -> "45.50". */
export function fromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / MINOR_PER_MAJOR;
  const frac = abs % MINOR_PER_MAJOR;
  return `${negative ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Groups the whole part with commas, US style: "12345.67" -> "12,345.67". */
function withThousands(decimal: string): string {
  const [whole, frac] = decimal.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${frac}`;
}

/** Formats cents for display, e.g. formatMoney(454550n) -> "$4,545.50". */
export function formatMoney(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  return `${negative ? "-" : ""}$${withThousands(fromMinor(abs))}`;
}

/**
 * Whole dollars only, for headline figures where cents are noise:
 * formatMoneyShort(454550n) -> "$4,546". Rounds rather than truncating, so a
 * total never reads lower than what it actually is.
 */
export function formatMoneyShort(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const dollars = (abs + 50n) / MINOR_PER_MAJOR;
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}`;
}
