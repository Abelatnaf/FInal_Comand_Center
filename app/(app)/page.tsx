import Link from "next/link";
import { Glass } from "@/components/glass/Glass";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney, fmtDate } from "@/lib/format";

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: balances }, { data: monthEntries }, { data: recent }] = await Promise.all([
    supabase.from("settings").select("currency_code").single(),
    supabase.from("account_balance").select("*"),
    supabase.from("entries").select("type, amount").gte("date", monthStartIso()),
    supabase
      .from("entries")
      .select("id, date, type, amount, description, categories(name), accounts:account_id(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const currency = settings?.currency_code ?? "USD";
  const netWorth = (balances ?? []).reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const spent = (monthEntries ?? []).filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const income = (monthEntries ?? []).filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);

  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <div>
      <h1 className="ios-large-title mb-6">Hi, {name}</h1>

      <Glass className="p-6 mb-4">
        <div className="stat-label mb-1">Net Worth</div>
        <div className="hero-value">{fmtMoney(netWorth, currency)}</div>
      </Glass>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Glass className="p-5">
          <div className="stat-label mb-1">Spent This Month</div>
          <div className="stat-value">{fmtMoney(spent, currency)}</div>
        </Glass>
        <Glass className="p-5">
          <div className="stat-label mb-1">Income This Month</div>
          <div className="stat-value">{fmtMoney(income, currency)}</div>
        </Glass>
      </div>

      {(balances ?? []).length > 0 && (
        <Glass className="p-5 mb-4">
          <div className="section-header mb-3">Accounts</div>
          <div className="flex flex-col">
            {(balances ?? []).map((a, i) => (
              <div
                key={a.account_id}
                className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}
              >
                <div className="ios-body">
                  {a.name}
                  {a.kind === "liability" && <span className="ios-caption text-text-faint ml-1.5">(liability)</span>}
                </div>
                <div className="num ios-headline">{fmtMoney(a.balance ?? 0, currency)}</div>
              </div>
            ))}
          </div>
        </Glass>
      )}

      <Glass className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="section-header">Recent Activity</div>
          <Link href="/transactions" className="link-action text-[13px]">
            See all
          </Link>
        </div>
        {(recent ?? []).length === 0 ? (
          <p className="ios-subhead text-text-dim py-4 text-center">
            Nothing logged yet. Tap the + button to add your first entry.
          </p>
        ) : (
          <div className="flex flex-col">
            {(recent ?? []).map((e, i) => {
              const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
              const acc = Array.isArray(e.accounts) ? e.accounts[0] : e.accounts;
              return (
                <div
                  key={e.id}
                  className={`flex items-center justify-between py-2.5 gap-3 ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="ios-body truncate">{e.description}</div>
                    <div className="ios-footnote text-text-dim">
                      {fmtDate(e.date)}
                      {cat?.name ? ` · ${cat.name}` : ""}
                      {acc?.name ? ` · ${acc.name}` : ""}
                    </div>
                  </div>
                  <div className={`num ios-headline shrink-0 ${e.type === "income" ? "pos" : e.type === "expense" ? "neg" : ""}`}>
                    {e.type === "income" ? "+" : e.type === "expense" ? "−" : ""}
                    {fmtMoney(Math.abs(e.amount), currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Glass>
    </div>
  );
}
