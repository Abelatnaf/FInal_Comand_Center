// Live exchange rates via exchangerate-api.com's free, keyless open endpoint
// (updated roughly every 24h). Cached through Next's fetch data cache so we
// don't hit it on every request — a currency pair drifting by an hour is
// irrelevant for a "roughly how much is this in ETB" display.
const FX_BASE_URL = "https://open.er-api.com/v6/latest";

export async function getExchangeRate(base: string, target: string): Promise<number | null> {
  if (base === target) return 1;

  try {
    const res = await fetch(`${FX_BASE_URL}/${encodeURIComponent(base)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const rate = data?.rates?.[target];
    return typeof rate === "number" ? rate : null;
  } catch {
    return null;
  }
}
