import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { AccountSwatch } from "@/components/money/AccountSwatch";
import { TransferRow, type TransferRowData } from "@/components/ledger/TransferRow";
import { formatRelativeDay } from "@/lib/date";
import type { Currency } from "@/lib/money";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [balanceRes, accountsRes, transactionsRes, transfersRes] = await Promise.all([
    supabase.from("balance_by_account").select("*").eq("account_id", id).maybeSingle(),
    supabase.from("accounts").select("id, name, currency"),
    supabase
      .from("transactions")
      .select("id, occurred_on, direction, amount_minor, currency, category, note")
      .eq("account_id", id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("transfers")
      .select("id, occurred_on, from_amount_minor, to_amount_minor, note, from_account_id, to_account_id")
      .or(`from_account_id.eq.${id},to_account_id.eq.${id}`)
      .order("occurred_on", { ascending: false })
      .limit(50),
  ]);

  const account = balanceRes.data;
  if (!account) notFound();

  const accountById = new Map((accountsRes.data ?? []).map((a) => [a.id, a]));
  const currency = (account.currency ?? "USD") as Currency;

  const transfers: TransferRowData[] = (transfersRes.data ?? []).map((t) => ({
    id: t.id,
    occurred_on: t.occurred_on,
    from_amount_minor: t.from_amount_minor,
    to_amount_minor: t.to_amount_minor,
    from_name: accountById.get(t.from_account_id)?.name ?? "—",
    to_name: accountById.get(t.to_account_id)?.name ?? "—",
    from_currency: (accountById.get(t.from_account_id)?.currency ?? "USD") as Currency,
    to_currency: (accountById.get(t.to_account_id)?.currency ?? "USD") as Currency,
    note: t.note,
  }));

  // One chronological history for this account: what was spent or received on
  // it, and what moved in or out of it.
  const timeline = [
    ...(transactionsRes.data ?? []).map((t) => ({ kind: "transaction" as const, row: t, date: t.occurred_on })),
    ...transfers.map((row) => ({ kind: "transfer" as const, row, date: row.occurred_on })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-muted text-[14px]">
        ← Now
      </Link>

      <div className="card row flex items-center gap-3">
        <AccountSwatch name={account.name ?? "?"} index={0} />
        <div className="flex-1 min-w-0">
          <p className="text-[17px] text-text truncate">{account.name}</p>
          <p className="text-[13px] text-muted">
            {currency}
            {account.is_archived && " · archived"}
          </p>
        </div>
        <Amount minor={BigInt(account.balance_minor ?? 0)} currency={currency} className="text-[19px] text-text" />
      </div>

      <div className="card">
        <p className="section-label row pb-0">History</p>
        {timeline.length === 0 && <p className="row text-[14px] text-muted">Nothing on this account yet.</p>}
        {timeline.map((item) =>
          item.kind === "transfer" ? (
            <TransferRow key={`x-${item.row.id}`} transfer={item.row} />
          ) : (
            <div key={`t-${item.row.id}`} className="row flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-text truncate">{item.row.category ?? "Uncategorized"}</p>
                <p className="text-[13px] text-muted">
                  {formatRelativeDay(item.row.occurred_on)}
                  {item.row.note && ` · ${item.row.note}`}
                </p>
              </div>
              <Amount
                minor={BigInt(item.row.direction === "out" ? -item.row.amount_minor : item.row.amount_minor)}
                currency={item.row.currency as Currency}
                className={item.row.direction === "out" ? "text-text shrink-0" : "text-positive shrink-0"}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
