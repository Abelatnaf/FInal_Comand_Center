export function fmtMoney(n: number, currencyCode: string = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(n);
  } catch {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }
}

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
