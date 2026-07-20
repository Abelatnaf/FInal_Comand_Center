// Live exchange rates. Uses exchangerate-api.com's keyed v6 endpoint when
// EXCHANGERATE_API_KEY is set (more generous/reliable free tier, 1,500
// requests/month), otherwise falls back to open.er-api.com's free, keyless
// endpoint — so this keeps working with zero setup either way. Cached
// through Next's fetch data cache since a currency pair drifting by an
// hour is irrelevant for a "roughly how much is this in ETB" display.
const KEYLESS_FX_URL = "https://open.er-api.com/v6/latest";
const KEYED_FX_URL = "https://v6.exchangerate-api.com/v6";

export async function getExchangeRate(base: string, target: string): Promise<number | null> {
  if (base === target) return 1;

  const apiKey = process.env.EXCHANGERATE_API_KEY;
  const url = apiKey
    ? `${KEYED_FX_URL}/${apiKey}/latest/${encodeURIComponent(base)}`
    : `${KEYLESS_FX_URL}/${encodeURIComponent(base)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const rates = apiKey ? data?.conversion_rates : data?.rates;
    const rate = rates?.[target];
    return typeof rate === "number" ? rate : null;
  } catch {
    return null;
  }
}
