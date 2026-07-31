import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { BillsExportButton, type BillExportRow } from "@/components/bills/BillsExportButton";
import { formatShortDate } from "@/lib/date";

type Filters = {
  q?: string;
  payer_id?: string;
  status?: string;
  sort?: string;
};

export default async function BillsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [obligationsRes, payersRes] = await Promise.all([
    supabase.from("obligation_progress").select("*"),
    supabase.from("payers").select("id, label"),
  ]);

  const payers = payersRes.data ?? [];
  const payerLabel = (id: string | null) => payers.find((p) => p.id === id)?.label ?? "—";

  // Filtering happens here rather than in the query because obligation_progress
  // derives status/is_past_due at read time -- they aren't columns the database
  // can filter on directly, and the set is small enough that it doesn't matter.
  const term = filters.q?.trim().toLowerCase();
  let obligations = (obligationsRes.data ?? []).filter((o) => {
    if (filters.payer_id && o.payer_id !== filters.payer_id) return false;
    if (filters.status) {
      if (filters.status === "past_due") {
        if (!o.is_past_due) return false;
      } else if (filters.status === "unpaid") {
        // "Still owed" -- what you actually chase, regardless of partial progress.
        if (o.status !== "open" && o.status !== "partial") return false;
      } else if (o.status !== filters.status) {
        return false;
      }
    }
    if (term) {
      const haystack = `${o.title ?? ""} ${o.source_note ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const sort = filters.sort ?? "due";
  obligations = [...obligations].sort((a, b) => {
    if (sort === "amount") {
      return Number(BigInt(b.amount_remaining_usd_minor ?? 0) - BigInt(a.amount_remaining_usd_minor ?? 0));
    }
    if (sort === "title") return (a.title ?? "").localeCompare(b.title ?? "");
    // Default: what's most urgent first -- past due, then soonest due.
    if (a.is_past_due !== b.is_past_due) return a.is_past_due ? -1 : 1;
    if (a.due_on == null) return 1;
    if (b.due_on == null) return -1;
    return a.due_on.localeCompare(b.due_on);
  });

  // Totals for the filtered set, so a filter answers "how much is this?"
  let owedMinor = 0n;
  let pastDueMinor = 0n;
  for (const o of obligations) {
    if (o.status === "open" || o.status === "partial") {
      const remaining = BigInt(o.amount_remaining_usd_minor ?? 0);
      owedMinor += remaining;
      if (o.is_past_due) pastDueMinor += remaining;
    }
  }

  const exportRows: BillExportRow[] = obligations.map((o) => ({
    title: o.title ?? "",
    payer_label: payerLabel(o.payer_id),
    status: o.is_past_due ? "past due" : (o.status ?? "open"),
    due_on: o.due_on,
    amount_usd_minor: o.amount_usd_minor ?? 0,
    amount_paid_usd_minor: o.amount_paid_usd_minor ?? 0,
    amount_remaining_usd_minor: o.amount_remaining_usd_minor ?? 0,
  }));

  const hasAny = (obligationsRes.data ?? []).length > 0;
  const isFiltered = Boolean(filters.q || filters.payer_id || filters.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Bills</h1>
        <div className="flex items-center gap-4">
          {hasAny && <BillsExportButton rows={exportRows} />}
          <Link href="/bills/new" className="btn btn-primary">
            Add
          </Link>
        </div>
      </div>

      {!hasAny ? (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">No obligations yet.</p>
          <Link href="/bills/new" className="btn btn-primary self-start">
            Add the first bill
          </Link>
        </div>
      ) : (
        <>
          <form method="get" className="card row flex flex-col gap-2">
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search bills…"
              className="input"
              aria-label="Search bills"
            />
            <div className="flex gap-2">
              <select name="payer_id" defaultValue={filters.payer_id ?? ""} className="input" aria-label="Payer">
                <option value="">All payers</option>
                {payers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={filters.status ?? ""} className="input" aria-label="Status">
                <option value="">Any status</option>
                <option value="unpaid">Still owed</option>
                <option value="past_due">Past due</option>
                <option value="partial">Partly paid</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            <select name="sort" defaultValue={sort} className="input" aria-label="Sort by">
              <option value="due">Most urgent first</option>
              <option value="amount">Largest remaining first</option>
              <option value="title">By name</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                Filter
              </button>
              <Link href="/bills" className="btn flex-1 text-center">
                Clear
              </Link>
            </div>
          </form>

          <div className="card row flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="section-label">Still owed{isFiltered && ", filtered"}</p>
                <Link href="/upcoming" className="text-silver text-[12px]">
                  Timeline
                </Link>
              </div>
              {pastDueMinor > 0n && (
                <p className="text-[13px] text-alarm">
                  <Amount minor={pastDueMinor} currency="USD" className="text-alarm" /> past due
                </p>
              )}
            </div>
            <Amount minor={owedMinor} currency="USD" className="text-[19px] text-text" />
          </div>

          <div className="card">
            {obligations.length === 0 && (
              <p className="row text-[14px] text-muted">Nothing matches these filters.</p>
            )}
            {obligations.map((o) => {
              const remaining = BigInt(o.amount_remaining_usd_minor ?? 0);
              const total = BigInt(o.amount_usd_minor ?? 0);
              const paidPct = total > 0n ? Number((BigInt(o.amount_paid_usd_minor ?? 0) * 100n) / total) : 0;
              return (
                <Link key={o.obligation_id} href={`/bills/${o.obligation_id}`} className="row flex flex-col gap-2 block">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[16px] text-text truncate">{o.title}</p>
                      <p className="text-[13px] text-muted">
                        {payerLabel(o.payer_id)}
                        {o.due_on && ` · due ${formatShortDate(o.due_on)}`}
                      </p>
                    </div>
                    <span className="status-pill shrink-0" data-status={o.is_past_due ? "past-due" : o.status ?? "open"}>
                      {o.is_past_due ? "Past due" : o.status}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" data-alarm={o.is_past_due} style={{ width: `${Math.min(paidPct, 100)}%` }} />
                  </div>
                  <p className="text-[15px]">
                    <Amount minor={remaining} currency="USD" className="text-text" />
                    <span className="text-[13px] text-muted"> remaining</span>
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
