import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsIcon } from "@/components/nav/icons";
import { Amount } from "@/components/money/Amount";
import { AccountSwatch } from "@/components/money/AccountSwatch";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { formatMoney, type Currency } from "@/lib/money";
import { formatShortDate, daysBetween, todayIso } from "@/lib/date";

export default async function NowPage() {
  const supabase = await createClient();

  const [payersRes, accountsAllRes, balancesRes, liquidRes, obligationCountRes, openObligationsRes, recentRes, settingsRes] =
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
        .order("due_on", { ascending: true, nullsFirst: false }),
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

  // Past-due sorts first even among open obligations, since due_on for a
  // past-due bill is earlier than today -- but re-sort explicitly so this
  // doesn't quietly depend on that coincidence.
  const openObligations = [...(openObligationsRes.data ?? [])].sort((a, b) => {
    if (a.is_past_due !== b.is_past_due) return a.is_past_due ? -1 : 1;
    if (a.due_on == null) return 1;
    if (b.due_on == null) return -1;
    return a.due_on.localeCompare(b.due_on);
  });
  const nextDue = openObligations[0] ?? null;
  const upcoming = openObligations.slice(1, 4);

  const liquid = liquidRes.data;
  const hasAnyObligations = (obligationCountRes.count ?? 0) > 0;

  const isCovered =
    nextDue && liquid?.total_liquid_usd_minor != null
      ? BigInt(liquid.total_liquid_usd_minor) >= BigInt(nextDue.amount_remaining_usd_minor ?? 0)
      : null;

  // Informational only -- this sums what each payer's obligations still
  // add up to. It is not a claim that liquid funds are earmarked per payer;
  // there's only ever one shared pool, shown separately above.
  const byPayer = new Map<string, bigint>();
  for (const o of openObligations) {
    if (!o.payer_id) continue;
    byPayer.set(o.payer_id, (byPayer.get(o.payer_id) ?? 0n) + BigInt(o.amount_remaining_usd_minor ?? 0));
  }

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
              className="hero-figure block"
              tone={nextDue.is_past_due ? "alarm" : (nextDue.days_until_due ?? 99) <= 14 ? "urgent" : undefined}
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

      {upcoming.length > 0 && (
        <div className="card">
          <p className="section-label row pb-0">Also open</p>
          {upcoming.map((o) => (
            <Link key={o.obligation_id} href={`/bills/${o.obligation_id}`} className="row flex items-center justify-between gap-3 block">
              <div className="min-w-0">
                <p className="text-[14px] text-text truncate">{o.title}</p>
                <p className="text-[12px] text-muted">{payerLabel(o.payer_id ?? "")}</p>
              </div>
              <Amount
                minor={BigInt(o.amount_remaining_usd_minor ?? 0)}
                currency="USD"
                className={`shrink-0 ${o.is_past_due ? "text-alarm" : "text-text"}`}
              />
            </Link>
          ))}
        </div>
      )}

      {hasAnyObligations && nextDue && (
        <div className="card row flex flex-col gap-3">
          <div>
            <p className="section-label mb-2">Coverage</p>
            {liquid?.total_liquid_usd_minor != null ? (
              <p className="text-[15px] text-text">
                You have{" "}
                <span className={`num estimate ${isCovered ? "text-positive" : "text-alarm"}`}>
                  ~{formatMoney(BigInt(liquid.total_liquid_usd_minor), "USD")}
                </span>{" "}
                liquid against{" "}
                <Amount minor={BigInt(nextDue.amount_remaining_usd_minor ?? 0)} currency="USD" className="text-text" />{" "}
                due.
              </p>
            ) : (
              <p className="text-[14px] text-muted">Set today&rsquo;s rate in Settings to see this.</p>
            )}
          </div>
          {byPayer.size > 1 && (
            <div className="pt-1 border-t border-[var(--border)] flex flex-col gap-1.5">
              {[...byPayer.entries()].map(([payerId, minor]) => (
                <div key={payerId} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{payerLabel(payerId)}</span>
                  <Amount minor={minor} currency="USD" className="text-text" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <p className="section-label row pb-0">Balances</p>
        {(balancesRes.data ?? []).map((a, i) => (
          <div key={a.account_id} className="row flex items-center gap-3">
            <AccountSwatch name={a.name ?? "?"} index={i} />
            <span className="text-[15px] text-text flex-1">{a.name}</span>
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
