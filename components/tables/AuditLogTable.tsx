"use client";

import { useMemo, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { HScroll } from "@/components/ui/HScroll";
import type { Json } from "@/lib/supabase/database.types";

type AuditRow = {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Json | null;
  new_data: Json | null;
  changed_at: string;
};

function asRecord(v: Json | null): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

const TABLE_LABELS: Record<string, string> = {
  transactions: "Transaction",
  income: "Income",
  transfers: "Transfer",
  recurring_bills: "Recurring Bill",
  savings_goals: "Savings Goal",
  net_worth_snapshots: "Net Worth Snapshot",
  accounts: "Account",
};

const LABEL_FIELDS = ["description", "source", "name", "notes"];
const IGNORE_FIELDS = new Set(["id", "user_id", "created_at", "fx_rate_used", "week_number"]);

function recordLabel(row: AuditRow): string {
  const data = asRecord(row.new_data) ?? asRecord(row.old_data);
  if (!data) return row.record_id;
  for (const f of LABEL_FIELDS) {
    const v = data[f];
    if (typeof v === "string" && v.trim()) return v;
  }
  if (typeof data.amount_original === "number") return `${data.currency ?? ""} ${data.amount_original}`.trim();
  if (typeof data.amount_usd === "number") return `$${data.amount_usd}`;
  return row.record_id.slice(0, 8);
}

function diffFields(oldDataRaw: Json | null, newDataRaw: Json | null) {
  const oldData = asRecord(oldDataRaw);
  const newData = asRecord(newDataRaw);
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  for (const key of keys) {
    if (IGNORE_FIELDS.has(key)) continue;
    const a = oldData[key];
    const b = newData[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ field: key, from: a, to: b });
    }
  }
  return changes;
}

function fmtValue(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function AuditRowDetail({ row }: { row: AuditRow }) {
  if (row.action === "UPDATE") {
    const changes = diffFields(row.old_data, row.new_data);
    if (changes.length === 0) return <span className="text-text-dim text-xs">No tracked fields changed.</span>;
    return (
      <div className="flex flex-col gap-0.5">
        {changes.map((c) => (
          <div key={c.field} className="text-xs text-text-dim">
            <span className="text-text">{c.field}</span>: {fmtValue(c.from)} → <span className="text-text">{fmtValue(c.to)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (row.action === "DELETE") {
    return <span className="text-text-dim text-xs">Deleted “{recordLabel(row)}”.</span>;
  }
  return <span className="text-text-dim text-xs">Created “{recordLabel(row)}”.</span>;
}

export function AuditLogTable({ entries }: { entries: AuditRow[] }) {
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const tables = useMemo(() => Array.from(new Set(entries.map((e) => e.table_name))).sort(), [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (tableFilter && e.table_name !== tableFilter) return false;
      if (actionFilter && e.action !== actionFilter) return false;
      return true;
    });
  }, [entries, tableFilter, actionFilter]);

  return (
    <div>
      <Glass className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="stat-label block mb-1 text-xs">Table</label>
          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="select text-sm">
            <option value="">All</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {TABLE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="stat-label block mb-1 text-xs">Action</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="select text-sm">
            <option value="">All</option>
            <option value="INSERT">Created</option>
            <option value="UPDATE">Edited</option>
            <option value="DELETE">Deleted</option>
          </select>
        </div>
      </Glass>

      <Glass>
        <HScroll>
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-text-dim text-left text-xs">
                <th className="py-3 px-2 font-normal whitespace-nowrap">When</th>
                <th className="py-3 px-2 font-normal">Table</th>
                <th className="py-3 px-2 font-normal">Action</th>
                <th className="py-3 px-2 font-normal">Record</th>
                <th className="py-3 px-2 font-normal">What changed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-text-dim text-sm">
                    No changes logged yet — this fills in as you add, edit, or delete entries.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--separator)]">
                    <td className="py-2.5 px-2 num text-xs text-text-dim whitespace-nowrap">
                      {new Date(row.changed_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-text-dim whitespace-nowrap">{TABLE_LABELS[row.table_name] ?? row.table_name}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className="badge badge-dim !text-[11px]">
                        {row.action === "INSERT" ? "Created" : row.action === "DELETE" ? "Deleted" : "Edited"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-text-dim whitespace-nowrap">{recordLabel(row)}</td>
                    <td className="py-2.5 px-2">
                      <AuditRowDetail row={row} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </HScroll>
      </Glass>
    </div>
  );
}
