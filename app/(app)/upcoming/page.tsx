import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { formatShortDate, todayIso } from "@/lib/date";

type Entry = {
  key: string;
  obligationId: string;
  title: string;
  subtitle: string;
  dueOn: string;
  amountMinor: bigint;
  isPastDue: boolean;
};

/** "August 2026" — groups the timeline into months without pulling in a date library. */
function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function UpcomingPage() {
  const supabase = await createClient();

  const [obligationsRes, installmentsRes, payersRes, liquidRes] = await Promise.all([
    supabase.from("obligation_progress").select("*").in("status", ["open", "partial"]),
    supabase
      .from("installment_progress")
      .select("installment_id, obligation_id, seq, due_on, amount_usd_minor, amount_covered_minor, is_past_due")
      .eq("is_settled", false),
    supabase.from("payers").select("id, label"),
    supabase.from("liquid_position").select("*").maybeSingle(),
  ]);

  const payers = payersRes.data ?? [];
  const payerLabel = (id: string | null) => payers.find((p) => p.id === id)?.label ?? "—";
  const obligations = obligationsRes.data ?? [];

  // A bill with a payment plan is represented by its unsettled parts, not by
  // itself -- otherwise the same money would appear twice on the timeline.
  const plannedObligationIds = new Set(
    (installmentsRes.data ?? []).map((i) => i.obligation_id).filter((id): id is string => id !== null)
  );

  const entries: Entry[] = [];

  for (const o of obligations) {
    if (!o.obligation_id || !o.due_on) continue;
    if (plannedObligationIds.has(o.obligation_id)) continue;
    entries.push({
      key: `o-${o.obligation_id}`,
      obligationId: o.obligation_id,
      title: o.title ?? "Untitled",
      subtitle: payerLabel(o.payer_id),
      dueOn: o.due_on,
      amountMinor: BigInt(o.amount_remaining_usd_minor ?? 0),
      isPastDue: o.is_past_due ?? false,
    });
  }

  for (const i of installmentsRes.data ?? []) {
    if (!i.installment_id || !i.obligation_id || !i.due_on) continue;
    const parent = obligations.find((o) => o.obligation_id === i.obligation_id);
    if (!parent) continue;
    entries.push({
      key: `i-${i.installment_id}`,
      obligationId: i.obligation_id,
      title: parent.title ?? "Untitled",
      subtitle: `Part ${i.seq} · ${payerLabel(parent.payer_id)}`,
      dueOn: i.due_on,
      amountMinor: BigInt(i.amount_usd_minor ?? 0) - BigInt(i.amount_covered_minor ?? 0),
      isPastDue: i.is_past_due ?? false,
    });
  }

  entries.sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  const total = entries.reduce((sum, e) => sum + e.amountMinor, 0n);
  const liquidMinor =
    liquidRes.data?.total_liquid_usd_minor != null ? BigInt(liquidRes.data.total_liquid_usd_minor) : null;

  // Group into months, preserving the sorted order.
  const months: { label: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const label = monthLabel(e.dueOn);
    const last = months[months.length - 1];
    if (last && last.label === label) last.entries.push(e);
    else months.push({ label, entries: [e] });
  }

  const today = todayIso();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Upcoming</h1>

      {entries.length === 0 ? (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">Nothing scheduled.</p>
          <p className="text-[13px] text-muted">
            Bills with a due date show up here, along with each part of any payment plan.
          </p>
          <Link href="/bills/new" className="btn btn-primary self-start">
            Add a bill
          </Link>
        </div>
      ) : (
        <>
          <div className="card row flex items-center justify-between">
            <div>
              <p className="section-label">Scheduled total</p>
              {liquidMinor !== null && (
                <p className={`text-[13px] ${liquidMinor >= total ? "text-positive" : "text-alarm"}`}>
                  {liquidMinor >= total ? "Covered by what you hold" : "More than you currently hold"}
                </p>
              )}
            </div>
            <Amount minor={total} currency="USD" className="text-[19px] text-text" />
          </div>

          {months.map((month) => (
            <div key={month.label} className="card">
              <p className="section-label row pb-0">{month.label}</p>
              {month.entries.map((e) => {
                const days = Math.round(
                  (Date.parse(`${e.dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000
                );
                return (
                  <Link key={e.key} href={`/bills/${e.obligationId}`} className="row flex items-center justify-between gap-3 block">
                    <div className="min-w-0">
                      <p className="text-[15px] text-text truncate">{e.title}</p>
                      <p className={`text-[13px] ${e.isPastDue ? "text-alarm" : "text-muted"}`}>
                        {formatShortDate(e.dueOn)} · {e.subtitle}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Amount
                        minor={e.amountMinor}
                        currency="USD"
                        className={e.isPastDue ? "text-alarm block" : "text-text block"}
                      />
                      <p className={`text-[12px] ${e.isPastDue ? "text-alarm" : "text-faint"}`}>
                        {e.isPastDue ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
