import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObligationDetail } from "@/components/bills/ObligationDetail";
import { Amount } from "@/components/money/Amount";
import { formatRelativeDay } from "@/lib/date";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [obligationRes, payersRes, paymentsRes] = await Promise.all([
    supabase.from("obligation_progress").select("*").eq("obligation_id", id).maybeSingle(),
    supabase.from("payers").select("id, label"),
    supabase
      .from("transactions")
      .select("id, occurred_on, amount_minor, currency, amount_usd_minor, note, account_id, accounts(name)")
      .eq("obligation_id", id)
      .order("occurred_on", { ascending: false }),
  ]);

  const row = obligationRes.data;
  if (!row || row.obligation_id === null || row.title === null || row.payer_id === null || row.amount_usd_minor === null) {
    notFound();
  }

  const obligation = {
    obligation_id: row.obligation_id,
    payer_id: row.payer_id,
    title: row.title,
    due_on: row.due_on,
    amount_usd_minor: row.amount_usd_minor,
    amount_paid_usd_minor: row.amount_paid_usd_minor ?? 0,
    amount_remaining_usd_minor: row.amount_remaining_usd_minor ?? row.amount_usd_minor,
    status: row.status ?? "open",
    is_past_due: row.is_past_due ?? false,
    days_until_due: row.days_until_due,
    source_note: row.source_note,
    waived_at: row.waived_at,
  };

  const payers = payersRes.data ?? [];
  const payerLabel = payers.find((p) => p.id === obligation.payer_id)?.label ?? "—";
  const payments = paymentsRes.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/bills" className="text-muted text-[14px]">
        ← Bills
      </Link>

      <ObligationDetail obligation={obligation} payers={payers} payerLabel={payerLabel} />

      <div className="card">
        <p className="section-label row pb-0">Payments</p>
        {payments.length === 0 && <p className="row text-[14px] text-muted">No payments recorded yet.</p>}
        {payments.map((p) => (
          <div key={p.id} className="row flex items-center justify-between">
            <div>
              <p className="text-[15px] text-text">{(p.accounts as { name: string } | null)?.name ?? "—"}</p>
              <p className="text-[13px] text-muted">
                {formatRelativeDay(p.occurred_on)}
                {p.note && ` · ${p.note}`}
              </p>
            </div>
            <Amount minor={BigInt(p.amount_usd_minor)} currency="USD" className="text-text" />
          </div>
        ))}
      </div>
    </div>
  );
}
