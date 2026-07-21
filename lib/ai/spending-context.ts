import { createClient } from "@/lib/supabase/server";

function ym(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function n2(n: number) {
  return (Math.round(n * 100) / 100).toString();
}

// A rich, read-only snapshot of the user's real finances for grounding the
// assistant — not just raw rows, but pre-computed aggregates it can reason
// over directly: live net worth, this-month-vs-last-month cash flow and
// savings rate, per-category spending comparison, budget status, goal
// progress, and recurring items. The smarter the grounding data, the
// smarter (and more specific) the answers.
export async function buildSpendingContext(): Promise<string> {
  const supabase = await createClient();

  const now = new Date();
  const thisMonth = ym(now);
  const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const todayIso = now.toISOString().slice(0, 10);

  const [{ data: settings }, { data: balances }, { data: budgets }, { data: goals }, { data: entries }] =
    await Promise.all([
      supabase.from("settings").select("currency_code, secondary_currency_code").single(),
      supabase.from("account_balance").select("name, kind, balance"),
      supabase.from("budget_vs_actual_this_month").select("name, monthly_budget, actual_spent"),
      supabase
        .from("savings_goals")
        .select("name, target_amount, target_date, saved_so_far, account_id, accounts(name)"),
      // 100 days always fully covers this month + last month for the
      // comparison math, plus a solid recent-activity window.
      supabase
        .from("entries")
        .select("date, type, amount, description, is_recurring, categories(name), accounts:account_id(name)")
        .gte("date", daysAgoIso(100))
        .order("date", { ascending: false })
        .limit(400),
    ]);

  const currency = settings?.currency_code ?? "USD";
  const secondary = settings?.secondary_currency_code || null;

  const netWorth = (balances ?? []).reduce((s, b) => s + (b.balance ?? 0), 0);

  // Per-month income/expense totals, and per-category expense by month.
  const monthAgg: Record<string, { income: number; expense: number }> = {};
  const catByMonth: Record<string, Record<string, number>> = {};
  for (const e of entries ?? []) {
    const mk = e.date.slice(0, 7);
    (monthAgg[mk] ??= { income: 0, expense: 0 });
    if (e.type === "income") monthAgg[mk].income += e.amount;
    else if (e.type === "expense") {
      monthAgg[mk].expense += e.amount;
      const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
      const cname = cat?.name ?? "Uncategorized";
      (catByMonth[cname] ??= {});
      catByMonth[cname][mk] = (catByMonth[cname][mk] ?? 0) + e.amount;
    }
  }

  const tm = monthAgg[thisMonth] ?? { income: 0, expense: 0 };
  const lm = monthAgg[lastMonth] ?? { income: 0, expense: 0 };
  const tmNet = tm.income - tm.expense;
  const lmNet = lm.income - lm.expense;
  const tmRate = tm.income > 0 ? `${Math.round((tmNet / tm.income) * 100)}%` : "n/a";
  const lmRate = lm.income > 0 ? `${Math.round((lmNet / lm.income) * 100)}%` : "n/a";

  const catNames = Object.keys(catByMonth)
    .filter((c) => (catByMonth[c][thisMonth] ?? 0) > 0 || (catByMonth[c][lastMonth] ?? 0) > 0)
    .sort((a, b) => (catByMonth[b][thisMonth] ?? 0) - (catByMonth[a][thisMonth] ?? 0));
  const catLines = catNames.map(
    (c) => `- ${c}: this month ${n2(catByMonth[c][thisMonth] ?? 0)}, last month ${n2(catByMonth[c][lastMonth] ?? 0)}`
  );

  const balByName = new Map((balances ?? []).map((b) => [b.name, b.balance ?? 0]));
  const goalLines = (goals ?? []).map((g) => {
    const acc = Array.isArray(g.accounts) ? g.accounts[0] : g.accounts;
    const saved = g.account_id && acc ? balByName.get(acc.name) ?? 0 : g.saved_so_far;
    const pct = g.target_amount > 0 ? Math.round((saved / g.target_amount) * 100) : 0;
    return `- ${g.name}: ${n2(saved)} of ${n2(g.target_amount)} (${pct}%)${
      g.target_date ? `, target ${g.target_date}` : ""
    }${acc ? `, tracking ${acc.name}` : ""}`;
  });

  const seen = new Set<string>();
  const recurring: string[] = [];
  for (const e of entries ?? []) {
    if (!e.is_recurring) continue;
    const key = `${e.type}:${e.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recurring.push(`- ${e.description} (${e.type}, ~${n2(e.amount)})`);
  }

  const entryLines = (entries ?? []).slice(0, 200).map((e) => {
    const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
    const acc = Array.isArray(e.accounts) ? e.accounts[0] : e.accounts;
    return `${e.date} | ${e.type} | ${n2(e.amount)} | ${e.description}${cat?.name ? " | " + cat.name : ""}${
      acc?.name ? " | " + acc.name : ""
    }${e.is_recurring ? " | recurring" : ""}`;
  });

  return `THE USER'S REAL FINANCIAL DATA. All amounts are in ${currency}${
    secondary ? ` (they also display a secondary currency, ${secondary})` : ""
  }. Today is ${todayIso}. "This month" = ${thisMonth}; "last month" = ${lastMonth}.

NET WORTH: ${n2(netWorth)} (live: total assets minus liabilities)

ACCOUNTS:
${(balances ?? []).map((b) => `- ${b.name} (${b.kind}): ${n2(b.balance ?? 0)}`).join("\n") || "- (none)"}

CASH FLOW:
- This month (${thisMonth}): income ${n2(tm.income)}, spending ${n2(tm.expense)}, net ${n2(tmNet)}, savings rate ${tmRate}
- Last month (${lastMonth}): income ${n2(lm.income)}, spending ${n2(lm.expense)}, net ${n2(lmNet)}, savings rate ${lmRate}

SPENDING BY CATEGORY (this month vs last month):
${catLines.join("\n") || "- (no spending recorded)"}

BUDGET VS ACTUAL THIS MONTH:
${(budgets ?? []).map((b) => `- ${b.name}: budget ${n2(b.monthly_budget ?? 0)}, spent ${n2(b.actual_spent ?? 0)}`).join("\n") || "- (no budgets set)"}

SAVINGS GOALS:
${goalLines.join("\n") || "- (none)"}

RECURRING ITEMS (repeat monthly):
${recurring.join("\n") || "- (none flagged)"}

RECENT TRANSACTIONS (newest first, last ~100 days, up to 200 shown):
${entryLines.join("\n") || "(none logged yet)"}`;
}
