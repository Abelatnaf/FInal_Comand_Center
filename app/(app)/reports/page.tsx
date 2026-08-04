import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { formatMoney, formatMoneyShort } from "@/lib/money";

export const metadata = { title: "Year in review" };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const supabase = await createClient();

  const [monthsRes, categoryRes] = await Promise.all([
    supabase.from("monthly_summary").select("*").order("month"),
    supabase.from("category_spend_by_month").select("*"),
  ]);

  const months = monthsRes.data ?? [];

  // Offer only years that actually have data, so the picker can't land on an
  // empty page.
  const years = [...new Set(months.map((m) => (m.month ?? "").slice(0, 4)).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a)
  );

  const { year: yearParam } = await searchParams;
  const year = years.includes(yearParam ?? "") ? yearParam! : (years[0] ?? String(new Date().getUTCFullYear()));

  const yearMonths = months.filter((m) => (m.month ?? "").startsWith(year));
  const spent = yearMonths.reduce((s, m) => s + BigInt(m.spent_usd_minor ?? 0), 0n);
  const income = yearMonths.reduce((s, m) => s + BigInt(m.income_usd_minor ?? 0), 0n);
  const net = income - spent;

  // Averaged over months with real activity only. Dividing by twelve on three
  // months of history would understate the monthly figure badly.
  const activeMonths = yearMonths.filter((m) => (m.entry_count ?? 0) > 0).length;
  const avgSpend = activeMonths > 0 ? spent / BigInt(activeMonths) : 0n;
  const savingsRate = income > 0n ? Number((net * 100n) / income) : null;

  const byCategory = new Map<string, { name: string; icon: string | null; color: string | null; minor: bigint }>();
  for (const row of categoryRes.data ?? []) {
    if (!(row.month ?? "").startsWith(year)) continue;
    const id = row.category_id ?? "none";
    const prev = byCategory.get(id);
    byCategory.set(id, {
      name: row.category_name ?? "Uncategorized",
      icon: row.category_icon,
      color: row.category_color,
      minor: (prev?.minor ?? 0n) + BigInt(row.spent_usd_minor ?? 0),
    });
  }
  const slices = [...byCategory.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => Number(b.minor - a.minor));

  const busiest = yearMonths.reduce<(typeof yearMonths)[number] | null>(
    (best, m) => (!best || (m.spent_usd_minor ?? 0) > (best.spent_usd_minor ?? 0) ? m : best),
    null
  );


  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">{year} in review</h1>
        <p className="text-[14px] text-muted mt-0.5">Your whole year on one page</p>
      </div>

      {years.length > 1 && (
        <form method="get" className="card row flex gap-2">
          <select name="year" defaultValue={year} className="input" aria-label="Year">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            Show
          </button>
        </form>
      )}

      {yearMonths.length === 0 ? (
        <div className="card row">
          <p className="text-[15px] text-muted">Nothing logged in {year} yet.</p>
        </div>
      ) : (
        <>
          <div className="card card-hero row">
            <p className="section-label mb-2">Spent in {year}</p>
            <Amount minor={spent} className="hero-figure block" />
            <div className="flex gap-6 mt-4 pt-4 border-t">
              <div>
                <p className="section-label">Came in</p>
                <Amount minor={income} className="text-[17px] font-semibold text-positive" />
              </div>
              <div>
                <p className="section-label">Kept</p>
                <Amount
                  minor={net}
                  className={`text-[17px] font-semibold ${net < 0n ? "text-alarm" : ""}`}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="row flex items-center justify-between">
              <p className="text-[15px] text-muted">Average month</p>
              <Amount minor={avgSpend} />
            </div>
            {savingsRate !== null && (
              <div className="row flex items-center justify-between">
                <p className="text-[15px] text-muted">You kept</p>
                <p className={`num text-[15px] ${savingsRate < 0 ? "text-alarm" : "text-positive"}`}>
                  {savingsRate}% of what came in
                </p>
              </div>
            )}
            {busiest && (
              <div className="row flex items-center justify-between">
                <p className="text-[15px] text-muted">Biggest month</p>
                <p className="text-[15px]">
                  {MONTH_SHORT[Number((busiest.month ?? "").slice(5, 7)) - 1]}{" "}
                  <span className="num text-muted">
                    {formatMoneyShort(BigInt(busiest.spent_usd_minor ?? 0))}
                  </span>
                </p>
              </div>
            )}
            {slices[0] && (
              <div className="row flex items-center justify-between">
                <p className="text-[15px] text-muted">Biggest category</p>
                <p className="text-[15px]">
                  {slices[0].icon} {slices[0].name}{" "}
                  <span className="num text-muted">{formatMoneyShort(slices[0].minor)}</span>
                </p>
              </div>
            )}
          </div>

          {slices.length > 0 && (
            <div className="card row">
              <p className="section-label mb-3">Where {year} went</p>
              <CategoryBars slices={slices} limit={8} />
            </div>
          )}

          <div className="card">
            <p className="section-label row pb-0">Month by month</p>
            {yearMonths.map((m) => {
              const monthSpent = BigInt(m.spent_usd_minor ?? 0);
              const monthNet = BigInt(m.net_usd_minor ?? 0);
              return (
                <div key={m.month} className="row flex items-center justify-between gap-3">
                  <span className="text-[15px]">
                    {MONTH_SHORT[Number((m.month ?? "").slice(5, 7)) - 1]}
                  </span>
                  <div className="text-right">
                    <Amount minor={monthSpent} className="block" />
                    <span className={`num text-[13px] ${monthNet < 0n ? "text-alarm" : "text-positive"}`}>
                      {monthNet >= 0n ? "+" : ""}
                      {formatMoney(monthNet)} net
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}
