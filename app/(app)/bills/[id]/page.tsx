import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObligationDetail } from "@/components/bills/ObligationDetail";
import { InstallmentPlan, type InstallmentRow } from "@/components/bills/InstallmentPlan";
import { RecurrenceControl } from "@/components/bills/RecurrenceControl";
import { ReceiptLink } from "@/components/money/ReceiptLink";
import { Amount } from "@/components/money/Amount";
import { formatRelativeDay } from "@/lib/date";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [obligationRes, payersRes, paymentsRes, installmentsRes, recurRes] = await Promise.all([
    supabase.from("obligation_progress").select("*").eq("obligation_id", id).maybeSingle(),
    supabase.from("payers").select("id, label"),
    supabase
      .from("transactions")
      .select("id, occurred_on, amount_minor, currency, amount_usd_minor, note, account_id, receipt_path, accounts(name)")
      .eq("obligation_id", id)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("installment_progress")
      .select("installment_id, seq, due_on, amount_usd_minor, amount_covered_minor, is_settled, is_past_due")
      .eq("obligation_id", id)
      .order("seq", { ascending: true }),
    supabase.from("obligations").select("recur_interval_months").eq("id", id).maybeSingle(),
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

  // The view's columns are all nullable in the generated types (it's a view),
  // so narrow to the shape the plan component actually needs.
  const installments: InstallmentRow[] = (installmentsRes.data ?? [])
    .filter((i) => i.installment_id !== null && i.seq !== null && i.amount_usd_minor !== null)
    .map((i) => ({
      installment_id: i.installment_id as string,
      seq: i.seq as number,
      due_on: i.due_on,
      amount_usd_minor: i.amount_usd_minor as number,
      amount_covered_minor: i.amount_covered_minor ?? 0,
      is_settled: i.is_settled ?? false,
      is_past_due: i.is_past_due ?? false,
    }));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/bills" className="text-muted text-[14px]">
        ← Bills
      </Link>

      <ObligationDetail obligation={obligation} payers={payers} payerLabel={payerLabel} />

      <InstallmentPlan
        obligationId={obligation.obligation_id}
        installments={installments}
        obligationTotalMinor={obligation.amount_usd_minor}
      />

      <RecurrenceControl
        obligationId={obligation.obligation_id}
        intervalMonths={recurRes.data?.recur_interval_months ?? null}
        hasDueDate={obligation.due_on !== null}
      />

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
              {p.receipt_path && <ReceiptLink path={p.receipt_path} />}
            </div>
            <Amount minor={BigInt(p.amount_usd_minor)} currency="USD" className="text-text" />
          </div>
        ))}
      </div>
    </div>
  );
}
