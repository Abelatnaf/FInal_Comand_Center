import { createClient } from "@/lib/supabase/server";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { SpendTrend } from "@/components/charts/SpendTrend";
import { Amount } from "@/components/money/Amount";
import { colorVar } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { formatMonthLong, monthStartIso, recentMonthStarts } from "@/lib/date";

const TREND_MONTHS = 12;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const supabase = await createClient();

  const months = recentMonthStarts(TREND_MONTHS);
  // Only honour a month we actually offer, so a hand-edited URL can't put the
  // page into a state the selector can't get back out of.
  const month = requested && months.includes(requested) ? requested : monthStartIso(0);
  const monthIndex = months.indexOf(month);
  const priorMonth = monthIndex > 0 ? months[monthIndex - 1] : null;

  const [monthlyRes, spendRes] = await Promise.all([
    supabase.from("monthly_summary").select("*").gte("month", months[0]).order("month"),
    supabase
      .from("category_spend_by_month")
      .select("*")
      .in("month", priorMonth ? [month, priorMonth] : [month]),
  ]);

  const monthly = monthlyRes.data ?? [];
  const byMonth = new Map(monthly.map((m) => [m.month as string, m]));
  const selected = byMonth.get(month);

  const trend = months.map((m) => ({ month: m, minor: BigInt(byMonth.get(m)?.spent_usd_minor ?? 0) }));

  const spendRows = spendRes.data ?? [];
  const slices = spendRows
    .filter((r) => r.month === month)
    .map((r) => ({
      id: r.category_id ?? "",
      name: r.category_name ?? "Uncategorized",
      icon: r.category_icon,
      color: r.category_color,
      minor: BigInt(r.spent_usd_minor ?? 0),
    }));

  // Month-over-month per category. Every category present in either month
  // appears, so a category that dropped to zero still shows as a real fall
  // rather than silently disappearing.
  const priorByCategory = new Map(
    spendRows.filter((r) => r.month === priorMonth).map((r) => [r.category_id ?? "", BigInt(r.spent_usd_minor ?? 0)])
  );
  const currentByCategory = new Map(slices.map((s) => [s.id, s.minor]));
  const nameById = new Map<string, { name: string; icon: string | null; color: string | null }>();
  for (const r of spendRows) {
    nameById.set(r.category_id ?? "", {
      name: r.category_name ?? "Uncategorized",
      icon: r.category_icon,
      color: r.category_color,
    });
  }

  const changes = priorMonth
    ? [...new Set([...currentByCategory.keys(), ...priorByCategory.keys()])]
        .map((id) => {
          const now = currentByCategory.get(id) ?? 0n;
          const before = priorByCategory.get(id) ?? 0n;
          return { id, meta: nameById.get(id), delta: now - before, now, before };
        })
        .filter((c) => c.delta !== 0n)
        .sort((a, b) => {
          const av = a.delta < 0n ? -a.delta : a.delta;
          const bv = b.delta < 0n ? -b.delta : b.delta;
          return bv > av ? 1 : -1;
        })
        .slice(0, 6)
    : [];

  const spent = BigInt(selected?.spent_usd_minor ?? 0);
  const income = BigInt(selected?.income_usd_minor ?? 0);
  const net = BigInt(selected?.net_usd_minor ?? 0);
  const entries = Number(selected?.entry_count ?? 0);

  // Only average over months that actually have activity — dividing by twelve
  // when there are two months of history would understate it badly.
  const activeMonths = monthly.filter((m) => (m.entry_count ?? 0) > 0);
  const averageSpend =
    activeMonths.length > 0
      ? activeMonths.reduce((s, m) => s + BigInt(m.spent_usd_minor ?? 0), 0n) / BigInt(activeMonths.length)
      : 0n;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Insights</h1>

      <form method="get" className="card row flex items-center gap-2">
        <label htmlFor="month" className="section-label shrink-0">
          Month
        </label>
        <select id="month" name="month" defaultValue={month} className="input flex-1">
          {[...months].reverse().map((m) => (
            <option key={m} value={m}>
              {formatMonthLong(m)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Go
        </button>
      </form>

      <div className="card card-hero row">
        <p className="section-label mb-2">Spent in {formatMonthLong(month)}</p>
        <Amount minor={spent} currency="USD" className="hero-figure block" />
        <div className="flex gap-6 mt-4 pt-4 border-t">
          <div>
            <p className="section-label">Income</p>
            <Amount minor={income} currency="USD" className="text-[17px] font-semibold text-positive" />
          </div>
          <div>
            <p className="section-label">Net</p>
            <Amount
              minor={net}
              currency="USD"
              className={`text-[17px] font-semibold ${net < 0n ? "text-alarm" : ""}`}
            />
          </div>
          <div>
            <p className="section-label">Entries</p>
            <p className="text-[17px] font-semibold num">{entries}</p>
          </div>
        </div>
      </div>

      <div className="card row">
        <div className="flex items-baseline justify-between mb-3">
          <p className="section-label">Spending, last {TREND_MONTHS} months</p>
          {averageSpend > 0n && (
            <p className="text-[12px] text-faint num">avg {formatMoney(averageSpend, "USD")}/mo</p>
          )}
        </div>
        <SpendTrend points={trend} />
      </div>

      <div className="card row">
        <p className="section-label mb-3">Where it went</p>
        <CategoryBars slices={slices} limit={10} emptyLabel="Nothing spent in this month." />
      </div>

      {changes.length > 0 && priorMonth && (
        <div className="card">
          <p className="section-label row pb-0">Biggest changes vs {formatMonthLong(priorMonth)}</p>
          {changes.map((c) => (
            <div key={c.id} className="row flex items-center gap-3">
              <span className="cat-dot" style={{ ["--cat-color" as string]: colorVar(c.meta?.color) }} aria-hidden />
              <span className="text-[14px] flex-1 truncate">{c.meta?.name ?? "Uncategorized"}</span>
              <span className={`num text-[14px] ${c.delta > 0n ? "text-alarm" : "text-positive"}`}>
                {c.delta > 0n ? "↑" : "↓"} {formatMoney(c.delta < 0n ? -c.delta : c.delta, "USD")}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <p className="section-label row pb-0">Month by month</p>
        {[...monthly].reverse().map((m) => (
          <div key={m.month} className="row flex items-center gap-3">
            <span className="text-[14px] flex-1">{formatMonthLong(m.month as string)}</span>
            <span className="num text-[13px] text-positive w-[84px] text-right">
              {formatMoney(BigInt(m.income_usd_minor ?? 0), "USD")}
            </span>
            <span className="num text-[13px] w-[84px] text-right">
              {formatMoney(BigInt(m.spent_usd_minor ?? 0), "USD")}
            </span>
          </div>
        ))}
        {monthly.length === 0 && <p className="row text-[14px] text-muted">No activity yet.</p>}
        {monthly.length > 0 && (
          <p className="row text-[12px] text-faint border-t">Income left, spending right — both in USD.</p>
        )}
      </div>
    </div>
  );
}
