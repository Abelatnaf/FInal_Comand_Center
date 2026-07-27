import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { formatShortDate } from "@/lib/date";

export default async function BillsPage() {
  const supabase = await createClient();

  const [obligationsRes, payersRes] = await Promise.all([
    supabase.from("obligation_progress").select("*"),
    supabase.from("payers").select("id, label"),
  ]);

  const payerLabel = (id: string | null) => payersRes.data?.find((p) => p.id === id)?.label ?? "—";

  const obligations = [...(obligationsRes.data ?? [])].sort((a, b) => {
    if (a.is_past_due !== b.is_past_due) return a.is_past_due ? -1 : 1;
    if (a.due_on == null) return 1;
    if (b.due_on == null) return -1;
    return a.due_on.localeCompare(b.due_on);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-text">Bills</h1>
        <Link href="/bills/new" className="btn btn-primary">
          Add
        </Link>
      </div>

      {obligations.length === 0 ? (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">No obligations yet.</p>
          <Link href="/bills/new" className="btn btn-primary self-start">
            Add the first bill
          </Link>
        </div>
      ) : (
        <div className="card">
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
                  <span className={`status-pill shrink-0`} data-status={o.is_past_due ? "past-due" : o.status ?? "open"}>
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
      )}
    </div>
  );
}
