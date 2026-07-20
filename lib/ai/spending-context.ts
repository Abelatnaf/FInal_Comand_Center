import { createClient } from "@/lib/supabase/server";

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Bounded, read-only snapshot of a user's real data for grounding the AI
// assistant's answers — recent entries only (not the full life-to-date
// history) to keep the prompt small and the assistant's scope obviously
// "recent activity," not a claim to have crunched every row ever entered.
export async function buildSpendingContext(): Promise<string> {
  const supabase = await createClient();

  const [{ data: settings }, { data: balances }, { data: budgets }, { data: goals }, { data: entries }] =
    await Promise.all([
      supabase.from("settings").select("currency_code").single(),
      supabase.from("account_balance").select("name, kind, balance"),
      supabase.from("budget_vs_actual_this_month").select("name, monthly_budget, actual_spent"),
      supabase.from("savings_goals").select("name, target_amount, saved_so_far, account_id"),
      supabase
        .from("entries")
        .select("date, type, amount, description, is_recurring, categories(name), accounts:account_id(name)")
        .gte("date", daysAgoIso(90))
        .order("date", { ascending: false })
        .limit(150),
    ]);

  const currency = settings?.currency_code ?? "USD";
  const monthStart = monthStartIso();

  const entryLines = (entries ?? []).map((e) => {
    const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
    const acc = Array.isArray(e.accounts) ? e.accounts[0] : e.accounts;
    return `${e.date} | ${e.type} | ${e.amount} | ${e.description}${cat?.name ? " | category: " + cat.name : ""}${
      acc?.name ? " | account: " + acc.name : ""
    }${e.is_recurring ? " | recurring" : ""}`;
  });

  return `You are answering questions about the user's real personal finance data below. Currency is ${currency} unless noted. Today's date context: entries are shown newest-first, covering roughly the last 90 days (up to 150 rows). This month starts ${monthStart}.

ACCOUNT BALANCES (live):
${(balances ?? []).map((b) => `${b.name} (${b.kind}): ${b.balance}`).join("\n") || "(none)"}

BUDGET VS ACTUAL THIS MONTH:
${(budgets ?? []).map((b) => `${b.name}: budget ${b.monthly_budget}, spent so far ${b.actual_spent}`).join("\n") || "(none set)"}

SAVINGS GOALS:
${(goals ?? []).map((g) => `${g.name}: target ${g.target_amount}, saved ${g.account_id ? "(tracked live via linked account)" : g.saved_so_far}`).join("\n") || "(none)"}

RECENT ENTRIES (last ~90 days, newest first):
${entryLines.join("\n") || "(none logged yet)"}`;
}
