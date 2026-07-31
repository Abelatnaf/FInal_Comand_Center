import { createClient } from "@/lib/supabase/server";
import type { TransactionRowData } from "@/components/ledger/TransactionRow";
import { LedgerList } from "@/components/ledger/LedgerList";
import type { TransferRowData } from "@/components/ledger/TransferRow";
import { LedgerSummary } from "@/components/ledger/LedgerSummary";
import { CsvExportButton } from "@/components/ledger/CsvExportButton";
import { formatMoney, type Currency } from "@/lib/money";

type Filters = {
  payer_id?: string;
  account_id?: string;
  currency?: string;
  category?: string;
  q?: string;
  from?: string;
  to?: string;
  week?: string;
};

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [payersRes, accountsRes, transfersRes] = await Promise.all([
    supabase.from("payers").select("id, label"),
    supabase.from("accounts").select("id, name, currency"),
    supabase
      .from("transfers")
      .select("id, occurred_on, from_amount_minor, to_amount_minor, note, from_account_id, to_account_id")
      .order("occurred_on", { ascending: false }),
  ]);
  const payers = payersRes.data ?? [];
  const accounts = (accountsRes.data ?? []) as { id: string; name: string; currency: Currency }[];

  let query = supabase
    .from("transactions_with_week")
    .select(
      "id, occurred_on, direction, amount_minor, currency, amount_usd_minor, category, note, account_id, payer_id, obligation_id, receipt_path, week_number, accounts(name), payers(label)"
    )
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.payer_id) query = query.eq("payer_id", filters.payer_id);
  if (filters.account_id) query = query.eq("account_id", filters.account_id);
  if (filters.currency) query = query.eq("currency", filters.currency);
  if (filters.category) query = query.ilike("category", `%${filters.category}%`);
  if (filters.from) query = query.gte("occurred_on", filters.from);
  if (filters.to) query = query.lte("occurred_on", filters.to);
  if (filters.week) query = query.eq("week_number", Number(filters.week));

  // Free-text search spans note and category. `or()` takes a raw filter string,
  // so commas and parens in the term would otherwise be read as filter syntax
  // rather than as text to match -- strip them instead of building a broken
  // query out of the user's own words.
  const searchTerm = filters.q?.trim().replace(/[,()]/g, "");
  if (searchTerm) {
    query = query.or(`note.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
  }

  const { data } = await query;

  const rows: TransactionRowData[] = (data ?? [])
    .filter((t): t is typeof t & { id: string; occurred_on: string; direction: string; amount_minor: number; currency: string; amount_usd_minor: number; account_id: string; payer_id: string } =>
      t.id !== null &&
      t.occurred_on !== null &&
      t.direction !== null &&
      t.amount_minor !== null &&
      t.currency !== null &&
      t.amount_usd_minor !== null &&
      t.account_id !== null &&
      t.payer_id !== null
    )
    .map((t) => ({
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
      receipt_path: t.receipt_path,
      week_number: t.week_number,
    }));

  // Transfers only make sense against the date/account filters -- they have no
  // payer, category or direction, so those filters exclude them entirely
  // rather than pretending to match. A currency filter matches either side.
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const showTransfers = !filters.payer_id && !filters.category && !filters.q && !filters.week;
  const transfers: TransferRowData[] = !showTransfers
    ? []
    : (transfersRes.data ?? [])
        .filter((t) => {
          if (filters.from && t.occurred_on < filters.from) return false;
          if (filters.to && t.occurred_on > filters.to) return false;
          if (filters.account_id && t.from_account_id !== filters.account_id && t.to_account_id !== filters.account_id)
            return false;
          if (filters.currency) {
            const from = accountById.get(t.from_account_id);
            const to = accountById.get(t.to_account_id);
            if (from?.currency !== filters.currency && to?.currency !== filters.currency) return false;
          }
          return true;
        })
        .map((t) => ({
          id: t.id,
          occurred_on: t.occurred_on,
          from_amount_minor: t.from_amount_minor,
          to_amount_minor: t.to_amount_minor,
          from_name: accountById.get(t.from_account_id)?.name ?? "—",
          to_name: accountById.get(t.to_account_id)?.name ?? "—",
          from_currency: accountById.get(t.from_account_id)?.currency ?? "USD",
          to_currency: accountById.get(t.to_account_id)?.currency ?? "USD",
          note: t.note,
        }));

  const totals = { ETB: 0n, USD: 0n };
  for (const r of rows) {
    const signed = BigInt(r.amount_minor) * (r.direction === "in" ? 1n : -1n);
    totals[r.currency] += signed;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Ledger</h1>
        <CsvExportButton rows={rows} />
      </div>

      <form method="get" className="card row flex flex-col gap-2">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search notes and categories…"
          className="input"
          aria-label="Search"
        />
        <div className="flex gap-2">
          <select name="payer_id" defaultValue={filters.payer_id ?? ""} className="input">
            <option value="">All payers</option>
            {payers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select name="currency" defaultValue={filters.currency ?? ""} className="input">
            <option value="">Both currencies</option>
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <select name="account_id" defaultValue={filters.account_id ?? ""} className="input" aria-label="Account">
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
        <input name="category" defaultValue={filters.category ?? ""} placeholder="Category contains…" className="input" />
        <input name="week" type="number" defaultValue={filters.week ?? ""} placeholder="Week #" className="input" aria-label="Week number" />
        <div className="flex gap-2">
          <input name="from" type="date" defaultValue={filters.from ?? ""} className="input" aria-label="From" />
          <input name="to" type="date" defaultValue={filters.to ?? ""} className="input" aria-label="To" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            Filter
          </button>
          <a href="/ledger" className="btn flex-1 text-center">
            Clear
          </a>
        </div>
      </form>

      <div className="card row flex items-center justify-between">
        <p className="section-label">Net, filtered</p>
        <div className="text-right num text-[15px]">
          <p className={totals.ETB >= 0n ? "text-positive" : "text-text"}>{formatMoney(totals.ETB, "ETB")}</p>
          <p className={totals.USD >= 0n ? "text-positive" : "text-text"}>{formatMoney(totals.USD, "USD")}</p>
        </div>
      </div>

      <LedgerSummary rows={rows} />

      <LedgerList rows={rows} transfers={transfers} payers={payers} accounts={accounts} />
    </div>
  );
}
