import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsIcon } from "@/components/nav/icons";
import { Amount } from "@/components/money/Amount";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import type { Currency } from "@/lib/money";
import { formatShortDate, daysBetween, todayIso } from "@/lib/date";

export default async function NowPage() {
  const supabase = await createClient();

  const [payersRes, accountsAllRes, balancesRes, liquidRes, obligationCountRes, nextDueRes, recentRes, settingsRes] =
    await Promise.all([
      supabase.from("payers").select("id, key, label"),
      supabase.from("accounts").select("id, name, currency").eq("is_archived", false),
      supabase.from("balance_by_account").select("*").eq("is_archived", false).order("kind").order("name"),
      supabase.from("liquid_position").select("*").maybeSingle(),
      supabase.from("obligations").select("id", { count: "exact", head: true }),
      supabase
        .from("obligation_progress")
        .select("*")
        .in("status", ["open", "partial"])
        .order("due_on", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("id, occurred_on, direction, amount_minor, currency, amount_usd_minor, category, note, account_id, payer_id, obligation_id, accounts(name), payers(label)")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("settings").select("tracking_start_date").maybeSingle(),
    ]);

  const trackingStartDate = settingsRes.data?.tracking_start_date ?? null;
  const currentWeek = trackingStartDate ? Math.floor(daysBetween(trackingStartDate, todayIso()) / 7) + 1 : null;

  const payers = payersRes.data ?? [];
  const payerLabel = (id: string) => payers.find((p) => p.id === id)?.label ?? "—";

  const nextDue = nextDueRes.data;
  const liquid = liquidRes.data;
  const hasAnyObligations = (obligationCountRes.count ?? 0) > 0;

  const isCovered =
    nextDue && liquid?.total_liquid_usd_minor != null
      ? BigInt(liquid.total_liquid_usd_minor) >= BigInt(nextDue.amount_remaining_usd_minor ?? 0)
      : null;

  const recent: TransactionRowData[] = (recentRes.data ?? []).map((t) => ({
    id: t.id,
    occurred_on: t.occurred_on,
    direction: t.direction as "in" | "out",
    amount_minor: t.amount_minor,
    currency: t.currency as Currency,
    amount_usd_minor: t.amount_usd_minor,
    category: t.category,
    note: t.note,
    account_id: t.account_id,
    account_name: (t.accounts as { name: string } | null)?.name ?? "—",
    payer_id: t.payer_id,
    payer_label: (t.payers as { label: string } | null)?.label ?? "—",
    obligation_id: t.obligation_id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[20px] font-semibold text-text">Now</h1>
          {currentWeek !== null && <span className="text-[13px] text-faint">Week {currentWeek}</span>}
        </div>
        <Link href="/settings" aria-label="Settings" className="p-2 -m-2 text-muted">
          <SettingsIcon className="w-6 h-6" />
        </Link>
      </div>

      {!hasAnyObligations ? (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">No obligations yet.</p>
          <Link href="/bills/new" className="btn btn-primary self-start">
            Add the first bill
          </Link>
        </div>
      ) : (
        nextDue && (
          <div className="card row">
            <p className="section-label mb-2">Next due</p>
            <p className="text-[17px] text-text font-medium">{nextDue.title}</p>
            <p className="text-[13px] text-muted mb-2">{payerLabel(nextDue.payer_id ?? "")}</p>
            <Amount
              minor={BigInt(nextDue.amount_remaining_usd_minor ?? 0)}
              currency="USD"
              className={`text-[28px] font-light block ${nextDue.is_past_due ? "text-alarm" : (nextDue.days_until_due ?? 99) <= 14 ? "text-urgent" : "text-text"}`}
            />
            <p className={`text-[14px] mt-1 ${nextDue.is_past_due ? "text-alarm" : "text-muted"}`}>
              {nextDue.is_past_due
                ? `${Math.abs(nextDue.days_until_due ?? 0)} days past due`
                : nextDue.due_on
                  ? `${nextDue.days_until_due} days left · due ${formatShortDate(nextDue.due_on)}`
                  : "No due date set"}
            </p>
          </div>
        )
      )}

      {hasAnyObligations && nextDue && (
        <div className="card row">
          <p className="section-label mb-2">Coverage</p>
          {liquid?.total_liquid_usd_minor != null ? (
            <p className="text-[15px] text-text">
              You have{" "}
              <span className={`num estimate ${isCovered ? "text-positive" : "text-alarm"}`}>
                ~{(Number(liquid.total_liquid_usd_minor) / 100).toFixed(2)}
              </span>{" "}
              liquid against{" "}
              <Amount minor={BigInt(nextDue.amount_remaining_usd_minor ?? 0)} currency="USD" className="text-text" />{" "}
              due.
            </p>
          ) : (
            <p className="text-[14px] text-muted">Set today&rsquo;s rate in Settings to see this.</p>
          )}
        </div>
      )}

      <div className="card">
        <p className="section-label row pb-0">Balances</p>
        {(balancesRes.data ?? []).map((a) => (
          <div key={a.account_id} className="row flex items-center justify-between">
            <span className="text-[15px] text-text">{a.name}</span>
            <Amount
              minor={BigInt(a.balance_minor ?? 0)}
              currency={(a.currency ?? "USD") as Currency}
              className="text-text"
            />
          </div>
        ))}
      </div>

      <div className="card">
        <p className="section-label row pb-0">Last 3</p>
        {recent.length === 0 && <p className="row text-[14px] text-muted">Nothing logged yet.</p>}
        {recent.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            payers={payers.map((p) => ({ id: p.id, label: p.label }))}
            accounts={(accountsAllRes.data ?? []) as { id: string; name: string; currency: Currency }[]}
          />
        ))}
      </div>
    </div>
  );
}
