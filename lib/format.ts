export function fmtMoney(n: number, currencyCode: string = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(n);
  } catch {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }
}

// Live-converted secondary-currency line (e.g. "≈ ETB 1,234.00"), shown under a
// primary-currency figure wherever settings.secondary_currency_code is set.
// Returns null when there's no secondary currency configured or no live rate
// available yet, so callers can just conditionally render the result.
export function fmtSecondary(amountInBase: number, secondaryCurrency: string | null, fxRate: number | null): string | null {
  if (!secondaryCurrency || !fxRate) return null;
  return `≈ ${fmtMoney(amountInBase * fxRate, secondaryCurrency)}`;
}

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
