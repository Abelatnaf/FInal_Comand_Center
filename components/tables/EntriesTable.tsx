"use client";

import { useMemo, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { HScroll } from "@/components/ui/HScroll";
import { DatePicker } from "@/components/ui/DatePicker";
import { fmtMoney, fmtDate } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { updateEntry, deleteEntry } from "@/app/(app)/transactions/actions";

type Entry = {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  notes: string | null;
  is_recurring: boolean;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  category_name: string | null;
  account_name: string | null;
  to_account_name: string | null;
};

type Category = { id: string; name: string };
type Account = { id: string; name: string };

const TYPE_LABEL: Record<string, string> = { expense: "Expense", income: "Income", transfer: "Transfer" };

function EditForm({
  entry,
  categories,
  accounts,
  onDone,
}: {
  entry: Entry;
  categories: Category[];
  accounts: Account[];
  onDone: () => void;
}) {
  const [type, setType] = useState(entry.type);
  const [date, setDate] = useState(entry.date);

  return (
    <form
      action={async (formData) => {
        await updateEntry(entry.id, formData);
        onDone();
      }}
      className="flex flex-col gap-2.5 p-3.5 bg-[var(--fill-quaternary)] rounded-[10px]"
    >
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="date" value={date} />
      <div className="grid grid-cols-2 gap-2.5">
        <select value={type} onChange={(e) => setType(e.target.value)} className="select !py-1.5 !px-2 text-sm">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <DatePicker value={date} onChange={setDate} className="!py-1.5 !px-2 text-sm" />
      </div>
      <input name="description" defaultValue={entry.description} required className="input !py-1.5 !px-2 text-sm" placeholder="Description" />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="amount" type="number" step="0.01" min="0.01" defaultValue={entry.amount} required className="input !py-1.5 !px-2 text-sm" />
        {type === "expense" ? (
          <select name="categoryId" defaultValue={entry.category_id ?? ""} className="select !py-1.5 !px-2 text-sm">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <select name="accountId" defaultValue={entry.account_id ?? ""} className="select !py-1.5 !px-2 text-sm">
          <option value="">No account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {type === "transfer" && (
          <select name="toAccountId" defaultValue={entry.to_account_id ?? ""} required className="select !py-1.5 !px-2 text-sm">
            <option value="">To account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <input name="notes" defaultValue={entry.notes ?? ""} className="input !py-1.5 !px-2 text-sm" placeholder="Notes (optional)" />
      {type !== "transfer" && (
        <label className="flex items-center justify-between py-1">
          <span className="ios-footnote">Repeats every month</span>
          <input type="checkbox" name="isRecurring" defaultChecked={entry.is_recurring} className="ios-switch" style={{ width: 40, height: 24 }} />
        </label>
      )}
      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onDone} className="link-action text-[13px]">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary !py-1.5 !px-3 text-[13px]">
          Save
        </button>
      </div>
    </form>
  );
}

export function EntriesTable({
  entries,
  categories,
  accounts,
  currency,
}: {
  entries: Entry[];
  categories: Category[];
  accounts: Account[];
  currency: string;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.description.toLowerCase().includes(q) && !(e.notes ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, typeFilter, search]);

  function exportCsv() {
    const rows: unknown[][] = [["Date", "Type", "Description", "Category", "Account", "Amount", "Notes"]];
    for (const e of filtered) {
      rows.push([e.date, TYPE_LABEL[e.type] ?? e.type, e.description, e.category_name ?? "", e.account_name ?? "", e.amount, e.notes ?? ""]);
    }
    downloadCsv(rows, `entries-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <Glass className="p-4 mb-4 flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="segmented">
            {(["all", "expense", "income", "transfer"] as const).map((t) => (
              <div key={t} data-active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                {t === "all" ? "All" : TYPE_LABEL[t]}
              </div>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="input text-sm !py-2 !px-3 w-40"
          />
        </div>
        <button onClick={exportCsv} className="btn text-sm !py-2 !px-3">
          Export CSV
        </button>
      </Glass>

      <Glass>
        <HScroll>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-text-dim text-left text-xs">
                <th className="py-3 px-3 font-normal">Date</th>
                <th className="py-3 px-3 font-normal">Type</th>
                <th className="py-3 px-3 font-normal">Description</th>
                <th className="py-3 px-3 font-normal">Category / Account</th>
                <th className="py-3 px-3 font-normal text-right">Amount</th>
                <th className="py-3 px-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-dim text-sm">
                    Nothing here yet.
                  </td>
                </tr>
              ) : (
                filtered.map((e) =>
                  editingId === e.id ? (
                    <tr key={e.id} className="border-t border-[var(--separator)]">
                      <td colSpan={6} className="p-2">
                        <EditForm entry={e} categories={categories} accounts={accounts} onDone={() => setEditingId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={e.id} className="border-t border-[var(--separator)] hover:bg-[var(--fill-quaternary)] transition-colors">
                      <td className="py-2.5 px-3 num text-text-dim whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="badge badge-dim !text-[11px]">{TYPE_LABEL[e.type] ?? e.type}</span>
                      </td>
                      <td className="py-2.5 px-3">{e.description}</td>
                      <td className="py-2.5 px-3 text-text-dim">
                        {e.type === "transfer"
                          ? `${e.account_name ?? "—"} → ${e.to_account_name ?? "—"}`
                          : [e.category_name, e.account_name].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className={`py-2.5 px-3 num text-right ${e.type === "income" ? "pos" : e.type === "expense" ? "neg" : ""}`}>
                        {e.type === "income" ? "+" : e.type === "expense" ? "−" : ""}
                        {fmtMoney(Math.abs(e.amount), currency)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <button onClick={() => setEditingId(e.id)} className="link-action text-[13px] mr-3">
                          Edit
                        </button>
                        {pendingDeleteId === e.id ? (
                          <button
                            onClick={async () => {
                              await deleteEntry(e.id);
                              setPendingDeleteId(null);
                            }}
                            className="link-destructive text-[13px]"
                          >
                            Confirm?
                          </button>
                        ) : (
                          <button onClick={() => setPendingDeleteId(e.id)} className="link-destructive text-[13px]">
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </HScroll>
      </Glass>
    </div>
  );
}
