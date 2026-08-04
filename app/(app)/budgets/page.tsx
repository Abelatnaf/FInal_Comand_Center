import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BudgetRow, type BudgetRowData } from "@/components/budgets/BudgetRow";
import { Amount } from "@/components/money/Amount";
import { formatMoney } from "@/lib/money";
import { formatMonthLong, monthStartIso } from "@/lib/date";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("budget_status").select("*").order("sort_order");

  const rows: BudgetRowData[] = (data ?? []).map((b) => ({
    category_id: b.category_id ?? "",
    name: b.name ?? "—",
    icon: b.icon,
    color: b.color,
    budget_usd_minor: b.budget_usd_minor,
    spent_usd_minor: b.spent_usd_minor ?? 0,
  }));

  // Budgeted categories lead; unbudgeted ones follow, sorted by what they
  // actually cost this month — the most useful order for deciding what to
  // budget next.
  const budgeted = rows.filter((r) => r.budget_usd_minor != null);
  const unbudgeted = rows
    .filter((r) => r.budget_usd_minor == null)
    .sort((a, b) => b.spent_usd_minor - a.spent_usd_minor);

  const total = budgeted.reduce((s, r) => s + BigInt(r.budget_usd_minor ?? 0), 0n);
  const spent = budgeted.reduce((s, r) => s + BigInt(r.spent_usd_minor), 0n);
  const percent = total > 0n ? Number((spent * 100n) / total) : 0;
  const overCount = budgeted.filter((r) => BigInt(r.spent_usd_minor) > BigInt(r.budget_usd_minor ?? 0)).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Budgets</h1>
        <p className="text-[14px] text-muted mt-0.5">{formatMonthLong(monthStartIso(0))}</p>
      </div>

      {budgeted.length === 0 ? (
        <div className="card row flex flex-col gap-2">
          <p className="text-[15px]">No budgets set yet.</p>
          <p className="text-[14px] text-muted">
            Set a monthly limit on any category below and you&rsquo;ll see spent-vs-limit here every month.
          </p>
        </div>
      ) : (
        <div className="card card-hero row">
          <p className="section-label mb-2">Total budget</p>
          <Amount minor={spent} className="hero-figure block" />
          <p className="text-[14px] text-muted mt-1 num">of {formatMoney(total)} budgeted</p>
          <div className="progress-track mt-3">
            <div
              className="progress-fill"
              data-tone={percent > 100 ? "alarm" : percent > 85 ? "urgent" : "positive"}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          {overCount > 0 && (
            <p className="text-[13px] text-alarm mt-2">
              {overCount} {overCount === 1 ? "category is" : "categories are"} over budget
            </p>
          )}
        </div>
      )}

      {budgeted.length > 0 && (
        <div className="card">
          <p className="section-label row pb-0">Budgeted</p>
          {budgeted.map((r) => (
            <BudgetRow key={r.category_id} row={r} />
          ))}
        </div>
      )}

      <div className="card">
        <p className="section-label row pb-0">
          {budgeted.length > 0 ? "No budget set" : "Your spending categories"}
        </p>
        {unbudgeted.length === 0 && <p className="row text-[14px] text-muted">Every category has a budget.</p>}
        {unbudgeted.map((r) => (
          <BudgetRow key={r.category_id} row={r} />
        ))}
      </div>

      <p className="text-[13px] text-faint px-1">
        A budget is a monthly ceiling, reset on the first of each month. Leave one blank to track a
        category without capping it.{" "}
        <Link href="/settings" className="text-accent font-semibold">
          Manage categories
        </Link>
      </p>
    </div>
  );
}
