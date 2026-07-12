"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  type: string;
  id: string;
  label: string;
  sublabel: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const like = `%${q}%`;

  const [tx, inc, cats, bills, goals, dates, accts] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, description, notes, amount_usd")
      .or(`description.ilike.${like},notes.ilike.${like}`)
      .order("date", { ascending: false })
      .limit(6),
    supabase
      .from("income")
      .select("id, date, source, notes, amount_usd")
      .or(`source.ilike.${like},notes.ilike.${like}`)
      .order("date", { ascending: false })
      .limit(6),
    supabase.from("categories").select("id, name, monthly_budget").ilike("name", like).limit(4),
    supabase.from("recurring_bills").select("id, name, monthly_cost_usd").ilike("name", like).limit(4),
    supabase.from("savings_goals").select("id, name, target_amount_usd").ilike("name", like).limit(4),
    supabase.from("key_dates").select("id, event, window_label").ilike("event", like).limit(4),
    supabase.from("accounts").select("id, name, starting_balance").ilike("name", like).limit(4),
  ]);

  const results: SearchResult[] = [];

  for (const t of tx.data ?? []) {
    results.push({
      type: "Transaction",
      id: t.id,
      label: t.description || "(no description)",
      sublabel: `${t.date} · $${Number(t.amount_usd ?? 0).toFixed(2)}`,
      href: "/transactions",
    });
  }
  for (const i of inc.data ?? []) {
    results.push({
      type: "Income",
      id: i.id,
      label: i.source || "(no source)",
      sublabel: `${i.date} · $${Number(i.amount_usd ?? 0).toFixed(2)}`,
      href: "/income",
    });
  }
  for (const c of cats.data ?? []) {
    results.push({
      type: "Category",
      id: String(c.id),
      label: c.name,
      sublabel: `Budget $${Number(c.monthly_budget ?? 0).toFixed(0)}/mo`,
      href: "/settings",
    });
  }
  for (const b of bills.data ?? []) {
    results.push({
      type: "Recurring Bill",
      id: b.id,
      label: b.name,
      sublabel: `$${Number(b.monthly_cost_usd ?? 0).toFixed(2)}/mo`,
      href: "/recurring-bills",
    });
  }
  for (const g of goals.data ?? []) {
    results.push({
      type: "Savings Goal",
      id: g.id,
      label: g.name,
      sublabel: `Target $${Number(g.target_amount_usd ?? 0).toFixed(0)}`,
      href: "/savings-goals",
    });
  }
  for (const d of dates.data ?? []) {
    results.push({
      type: "Key Date",
      id: String(d.id),
      label: d.event,
      sublabel: d.window_label,
      href: "/key-dates",
    });
  }
  for (const a of accts.data ?? []) {
    results.push({
      type: "Account",
      id: a.id,
      label: a.name,
      sublabel: `Starting $${Number(a.starting_balance ?? 0).toFixed(2)}`,
      href: "/settings",
    });
  }

  return results;
}
