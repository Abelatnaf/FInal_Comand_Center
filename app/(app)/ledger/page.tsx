import { createClient } from "@/lib/supabase/server";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { CsvExportButton } from "@/components/ledger/CsvExportButton";
import { formatMoney, type Currency } from "@/lib/money";

type Filters = {
  payer_id?: string;
  currency?: string;
  category?: string;
  from?: string;
  to?: string;
  week?: string;
};

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [payersRes, accountsRes] = await Promise.all([
    supabase.from("payers").select("id, label"),
    supabase.from("accounts").select("id, name, currency"),
  ]);
  const payers = payersRes.data ?? [];

  let query = supabase
    .from("transactions_with_week")
    .select(
      "id, occurred_on, direction, amount_minor, currency, amount_usd_minor, category, note, account_id, payer_id, obligation_id, week_number, accounts(name), payers(label)"
    )
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.payer_id) query = query.eq("payer_id", filters.payer_id);
  if (filters.currency) query = query.eq("currency", filters.currency);
  if (filters.category) query = query.ilike("category", `%${filters.category}%`);
  if (filters.from) query = query.gte("occurred_on", filters.from);
  if (filters.to) query = query.lte("occurred_on", filters.to);
  if (filters.week) query = query.eq("week_number", Number(filters.week));

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
      week_number: t.week_number,
    }));

  const totals = { ETB: 0n, USD: 0n };
  for (const r of rows) {
    const signed = BigInt(r.amount_minor) * (r.direction === "in" ? 1n : -1n);
    totals[r.currency] += signed;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-text">Ledger</h1>
        <CsvExportButton rows={rows} />
      </div>

      <form method="get" className="card row flex flex-col gap-2">
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

      <div className="card">
        {rows.length === 0 && <p className="row text-[14px] text-muted">Nothing matches these filters.</p>}
        {rows.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            payers={payers}
            accounts={(accountsRes.data ?? []) as { id: string; name: string; currency: Currency }[]}
          />
        ))}
      </div>
    </div>
  );
}
