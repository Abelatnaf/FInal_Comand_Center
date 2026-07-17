import Link from "next/link";
import { PageHeader, Glass } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";
import { TaxReportExport } from "@/components/settings/TaxReportExport";
import { fmtUsd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: rawYear } = await searchParams;
  const supabase = await createClient();

  const [{ data: txDates }, { data: incDates }] = await Promise.all([
    supabase.from("transactions").select("date").order("date"),
    supabase.from("income").select("date").order("date"),
  ]);
  const years = Array.from(
    new Set([...(txDates ?? []), ...(incDates ?? [])].map((r) => r.date.slice(0, 4)))
  ).sort((a, b) => Number(b) - Number(a));

  const currentYear = String(new Date().getFullYear());
  const year = rawYear && years.includes(rawYear) ? rawYear : years[0] ?? currentYear;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${Number(year) + 1}-01-01`;

  const [{ data: breakdown }, { data: deductibleTx }, { data: yearIncome }, { data: categories }] = await Promise.all([
    supabase
      .from("transaction_category_breakdown")
      .select("category_id, amount_usd")
      .gte("date", yearStart)
      .lt("date", yearEnd),
    supabase
      .from("transactions")
      .select("id, date, description, amount_usd, categories(name), transaction_splits(id)")
      .eq("is_tax_deductible", true)
      .gte("date", yearStart)
      .lt("date", yearEnd)
      .order("date"),
    supabase.from("income").select("amount_usd").gte("date", yearStart).lt("date", yearEnd),
    supabase.from("categories").select("id, name, sort_order").order("sort_order"),
  ]);

  const totalsByCategory = new Map<number, number>();
  for (const row of breakdown ?? []) {
    if (row.category_id == null) continue;
    totalsByCategory.set(row.category_id, (totalsByCategory.get(row.category_id) ?? 0) + (row.amount_usd ?? 0));
  }
  const categoryRows = (categories ?? [])
    .map((c) => ({ name: c.name, total: totalsByCategory.get(c.id) ?? 0 }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalSpend = categoryRows.reduce((s, c) => s + c.total, 0);
  const totalIncome = (yearIncome ?? []).reduce((s, i) => s + (i.amount_usd ?? 0), 0);
  const totalDeductible = (deductibleTx ?? []).reduce((s, t) => s + (t.amount_usd ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Tax Report"
        subtitle="Year-end totals by category, plus everything you've flagged as tax deductible."
      />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {years.length === 0 && <span className="stat-label">No dated activity yet.</span>}
        {years.map((y) => (
          <Link
            key={y}
            href={`/tax-report?year=${y}`}
            className={`btn text-sm ${y === year ? "btn-primary" : ""}`}
          >
            {y}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={`${year} Income`} value={fmtUsd(totalIncome)} size="small" />
        <StatCard label={`${year} Spend`} value={fmtUsd(totalSpend)} size="small" />
        <StatCard label={`${year} Net`} value={fmtUsd(totalIncome - totalSpend)} size="small" />
        <StatCard label="Tax Deductible" value={fmtUsd(totalDeductible)} delta={`${(deductibleTx ?? []).length} transactions`} size="small" />
      </div>

      <TaxReportExport
        year={year}
        categoryRows={categoryRows}
        deductibleRows={(deductibleTx ?? []).map((t) => ({
          date: t.date,
          description: t.description ?? "",
          category: t.categories?.name ?? "",
          split: (t.transaction_splits ?? []).length > 1,
          amount: t.amount_usd ?? 0,
        }))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Glass className="p-5">
          <div className="ios-headline mb-3">By Category — {year}</div>
          {categoryRows.length === 0 ? (
            <p className="text-text-dim ios-subhead">No spending logged for {year}.</p>
          ) : (
            <div className="flex flex-col">
              {categoryRows.map((c, i) => (
                <div key={c.name}>
                  {i > 0 && <div className="h-px bg-[var(--separator)]" />}
                  <div className="flex items-center justify-between py-2.5">
                    <span className="ios-subhead text-text">{c.name}</span>
                    <span className="num text-[14px] font-semibold text-text">{fmtUsd(c.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Glass>

        <Glass className="p-5">
          <div className="ios-headline mb-3">Tax Deductible — {year}</div>
          {(deductibleTx ?? []).length === 0 ? (
            <p className="text-text-dim ios-subhead">
              Nothing flagged as deductible in {year}. Mark a transaction &ldquo;Tax deductible&rdquo; in Quick Add or
              the Transactions edit row to have it show up here.
            </p>
          ) : (
            <div className="flex flex-col">
              {(deductibleTx ?? []).map((t, i) => (
                <div key={t.id}>
                  {i > 0 && <div className="h-px bg-[var(--separator)]" />}
                  <div className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <div className="ios-subhead text-text truncate">{t.description || t.categories?.name || "—"}</div>
                      <div className="stat-label mt-0.5">
                        {t.date} · {t.categories?.name ?? "—"}
                        {(t.transaction_splits ?? []).length > 1 ? " (split)" : ""}
                      </div>
                    </div>
                    <span className="num text-[14px] font-semibold text-text shrink-0">{fmtUsd(t.amount_usd ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
}
