import { createClient } from "@/lib/supabase/server";
import type { TransactionRowData } from "@/components/ledger/TransactionRow";
import { LedgerList } from "@/components/ledger/LedgerList";
import type { TransferRowData } from "@/components/ledger/TransferRow";
import { LedgerSummary } from "@/components/ledger/LedgerSummary";
import { CsvExportButton } from "@/components/ledger/CsvExportButton";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/categories";

type Filters = {
  account_id?: string;
  category_id?: string;
  tag?: string;
  q?: string;
  from?: string;
  to?: string;
  direction?: string;
};

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [accountsRes, categoriesRes, transfersRes, tagRowsRes] = await Promise.all([
    supabase.from("accounts").select("id, name").order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived")
      .order("sort_order"),
    supabase
      .from("transfers")
      .select("id, occurred_on, amount_minor, note, from_account_id, to_account_id")
      .order("occurred_on", { ascending: false }),
    supabase.from("transactions").select("tags"),
  ]);
  const accounts = accountsRes.data ?? [];
  const categories = (categoriesRes.data ?? []) as Category[];

  const allTags = [...new Set((tagRowsRes.data ?? []).flatMap((r) => r.tags ?? []))].sort();

  let query = supabase
    .from("transactions_with_week")
    .select(
      "id, occurred_on, direction, amount_minor, category_id, category_name, category_icon, category_color, note, tags, account_id, obligation_id, receipt_path, week_number, accounts(name)"
    )
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.account_id) query = query.eq("account_id", filters.account_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.direction) query = query.eq("direction", filters.direction);
  if (filters.from) query = query.gte("occurred_on", filters.from);
  if (filters.to) query = query.lte("occurred_on", filters.to);

  // Free-text search spans note and category name. `or()` takes a raw filter
  // string, so commas and parens in the term would otherwise be read as filter
  // syntax rather than as text to match -- strip them instead of building a
  // broken query out of the user's own words.
  const searchTerm = filters.q?.trim().replace(/[,()]/g, "");
  if (searchTerm) {
    query = query.or(`note.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%`);
  }

  const { data } = await query;

  let rows: TransactionRowData[] = (data ?? [])
    .filter(
      (
        t
      ): t is typeof t & {
        id: string;
        occurred_on: string;
        direction: string;
        amount_minor: number;
        account_id: string;
      } =>
        t.id !== null &&
        t.occurred_on !== null &&
        t.direction !== null &&
        t.amount_minor !== null &&
        t.account_id !== null
    )
    .map((t) => ({
      id: t.id,
      occurred_on: t.occurred_on,
      direction: t.direction as "in" | "out",
      amount_minor: t.amount_minor,
      category_id: t.category_id,
      category_name: t.category_name,
      category_icon: t.category_icon,
      category_color: t.category_color,
      note: t.note,
      account_id: t.account_id,
      account_name: (t.accounts as { name: string } | null)?.name ?? "—",
      obligation_id: t.obligation_id,
      receipt_path: t.receipt_path,
      week_number: t.week_number,
      tags: t.tags ?? [],
    }));

  // Tag membership filters in memory rather than in the query: an
  // array-contains filter would need its own operator, and the result set for
  // one person's ledger is small enough that it isn't worth it.
  if (filters.tag) rows = rows.filter((r) => (r.tags ?? []).includes(filters.tag!));

  // Transfers only make sense against the date/account filters -- they have no
  // category, tag or direction, so those filters exclude them entirely rather
  // than pretending to match.
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const showTransfers =
    !filters.category_id && !filters.q && !filters.tag && !filters.direction;
  const transfers: TransferRowData[] = !showTransfers
    ? []
    : (transfersRes.data ?? [])
        .filter((t) => {
          if (filters.from && t.occurred_on < filters.from) return false;
          if (filters.to && t.occurred_on > filters.to) return false;
          if (
            filters.account_id &&
            t.from_account_id !== filters.account_id &&
            t.to_account_id !== filters.account_id
          )
            return false;
          return true;
        })
        .map((t) => ({
          id: t.id,
          occurred_on: t.occurred_on,
          amount_minor: t.amount_minor,
          from_name: accountById.get(t.from_account_id)?.name ?? "—",
          to_name: accountById.get(t.to_account_id)?.name ?? "—",
          note: t.note,
        }));

  let net = 0n;
  for (const r of rows) {
    net += BigInt(r.amount_minor) * (r.direction === "in" ? 1n : -1n);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Ledger</h1>
        <CsvExportButton rows={rows} />
      </div>

      <details className="card">
        <summary className="row cursor-pointer list-none flex items-center justify-between">
          <span className="text-[15px] font-semibold">Filter &amp; search</span>
          <span className="text-muted text-[13px]">{rows.length} entries</span>
        </summary>
        <form method="get" className="row flex flex-col gap-2 border-t">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search descriptions and categories…"
            className="input"
            aria-label="Search"
          />
          <div className="flex gap-2">
            <select name="direction" defaultValue={filters.direction ?? ""} className="input" aria-label="Direction">
              <option value="">In and out</option>
              <option value="out">Spent only</option>
              <option value="in">Received only</option>
            </select>
            <select name="account_id" defaultValue={filters.account_id ?? ""} className="input" aria-label="Account">
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <select name="category_id" defaultValue={filters.category_id ?? ""} className="input" aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select name="tag" defaultValue={filters.tag ?? ""} className="input" aria-label="Tag">
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <input name="from" type="date" defaultValue={filters.from ?? ""} className="input" aria-label="From" />
            <input name="to" type="date" defaultValue={filters.to ?? ""} className="input" aria-label="To" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1">
              Apply
            </button>
            <a href="/ledger" className="btn flex-1 text-center">
              Clear
            </a>
          </div>
        </form>
      </details>

      <div className="card row flex items-center justify-between">
        <p className="section-label">Net, filtered</p>
        <p className={`num text-[15px] ${net >= 0n ? "text-positive" : ""}`}>{formatMoney(net)}</p>
      </div>

      <LedgerSummary rows={rows} />

      <LedgerList rows={rows} transfers={transfers} accounts={accounts} categories={categories} />
    </div>
  );
}
