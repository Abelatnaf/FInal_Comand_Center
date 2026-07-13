import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountCard } from "@/components/wallet/AccountCard";
import { AppIcon } from "@/components/ui/AppIcon";
import { createClient } from "@/lib/supabase/server";
import { fmtUsd } from "@/lib/format";

function dayLabel(iso: string, todayIso: string, yesterdayIso: string) {
  if (iso === todayIso) return "Today";
  if (iso === yesterdayIso) return "Yesterday";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [accountRes, latestSnapshotRes, txRes, incomeRes] = await Promise.all([
    supabase.from("accounts").select("id, name, starting_balance, kind").eq("id", id).single(),
    supabase.from("net_worth_snapshots").select("id").order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("transactions")
      .select("id, date, description, amount_usd, categories(name)")
      .eq("account_id", id)
      .order("date", { ascending: false })
      .limit(40),
    supabase
      .from("income")
      .select("id, date, source, amount_usd")
      .eq("account_id", id)
      .order("date", { ascending: false })
      .limit(40),
  ]);

  if (accountRes.error || !accountRes.data) {
    notFound();
  }
  const account = accountRes.data;

  let displayBalance = account.starting_balance;
  if (latestSnapshotRes.data) {
    const { data: detail } = await supabase
      .from("net_worth_snapshot_detail")
      .select("account_id, amount")
      .eq("snapshot_id", latestSnapshotRes.data.id)
      .eq("account_id", id)
      .maybeSingle();
    if (detail) displayBalance = detail.amount ?? displayBalance;
  }

  type Row = { id: string; date: string; title: string; subtitle: string; amount: number; positive: boolean };
  const rows: Row[] = [
    ...(txRes.data ?? []).map((t) => ({
      id: `tx-${t.id}`,
      date: t.date,
      title: t.description || "Transaction",
      subtitle: (t.categories as { name: string } | null)?.name ?? "Uncategorized",
      amount: t.amount_usd ?? 0,
      positive: false,
    })),
    ...(incomeRes.data ?? []).map((inc) => ({
      id: `inc-${inc.id}`,
      date: inc.date,
      title: inc.source || "Income",
      subtitle: "Income",
      amount: inc.amount_usd ?? 0,
      positive: true,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  const groups: { label: string; rows: Row[] }[] = [];
  for (const row of rows) {
    const label = dayLabel(row.date, todayIso, yesterdayIso);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/"
          aria-label="Back to Command Deck"
          className="w-8 h-8 rounded-full bg-[var(--fill-tertiary)] flex items-center justify-center shrink-0 active:opacity-60 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="ios-headline">{account.name}</h1>
        <Link href="/settings" className="link-action text-[13px] ml-auto">
          Manage
        </Link>
      </div>

      <div style={{ height: 168 }} className="mb-6">
        <AccountCard
          id={account.id}
          name={account.name}
          balance={displayBalance}
          kind={account.kind === "liability" ? "liability" : "asset"}
          finish="titanium"
          variant="expanded"
        />
      </div>

      <div className="section-header uppercase mb-2 px-1">Activity tagged to this account</div>

      {rows.length === 0 ? (
        <div className="glass p-6 text-center">
          <p className="ios-subhead text-text-dim">
            No transactions or income are tagged to this account yet. New entries you add through Quick Add can be
            linked here going forward.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="section-header uppercase mb-1.5 px-1">{g.label}</div>
              <div className="glass overflow-hidden">
                {g.rows.map((row, i) => (
                  <div key={row.id}>
                    {i > 0 && <div className="h-px bg-[var(--separator)] ml-[56px]" />}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <AppIcon glyph={row.positive ? "cash" : "bag"} color={row.positive ? "#132a1c" : "#3a2a12"} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="ios-subhead text-text font-medium truncate">{row.title}</div>
                        <div className="stat-label truncate">{row.subtitle}</div>
                      </div>
                      <div className={`num text-[14.5px] font-semibold ${row.positive ? "pos" : ""}`}>
                        {row.positive ? "+" : "−"}
                        {fmtUsd(row.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
