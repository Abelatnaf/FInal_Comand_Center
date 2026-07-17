import Link from "next/link";
import { PageHeader } from "@/components/glass/Glass";
import { CloseMonthPanel } from "@/components/settings/CloseMonthPanel";
import { createClient } from "@/lib/supabase/server";

function parseMonth(input: string | undefined) {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (input && /^\d{4}-\d{2}$/.test(input)) return input;
  return fallback;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function endOfMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

export default async function CloseMonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = parseMonth(rawMonth);
  const asOf = endOfMonth(month);

  const supabase = await createClient();

  const [{ data: accounts }, { data: periodClose }] = await Promise.all([
    supabase.from("accounts").select("id, name, kind").order("sort_order"),
    supabase
      .from("period_closes")
      .select("id, status, closed_at, reopen_reason, period_close_accounts(account_id, statement_balance, computed_balance, reconciled)")
      .eq("period_month", `${month}-01`)
      .maybeSingle(),
  ]);

  const computedBalances = await Promise.all(
    (accounts ?? []).map(async (a) => {
      if (a.kind !== "asset") return { id: a.id, balance: null as number | null };
      const { data } = await supabase.rpc("account_balance_as_of", { p_account_id: a.id, p_as_of: asOf });
      return { id: a.id, balance: data ?? null };
    })
  );
  const computedByAccount = new Map(computedBalances.map((c) => [c.id, c.balance]));
  const existingByAccount = new Map(
    (periodClose?.period_close_accounts ?? []).map((r) => [r.account_id, r])
  );

  const rows = (accounts ?? []).map((a) => {
    const existing = existingByAccount.get(a.id);
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      computedBalance: existing?.computed_balance ?? computedByAccount.get(a.id) ?? null,
      statementBalance: existing?.statement_balance ?? null,
      reconciled: existing?.reconciled ?? false,
    };
  });

  return (
    <div>
      <PageHeader
        title="Month-End Close"
        subtitle="Reconcile each account against your real statement, then lock the period so past history can't be silently edited."
      />

      <div className="flex items-center justify-between mb-5">
        <Link href={`/close?month=${shiftMonth(month, -1)}`} className="btn text-sm">
          ← Prior Month
        </Link>
        <div className="ios-title3">{monthLabel(month)}</div>
        <Link href={`/close?month=${shiftMonth(month, 1)}`} className="btn text-sm">
          Next Month →
        </Link>
      </div>

      <CloseMonthPanel
        month={month}
        status={periodClose?.status ?? "reconciling"}
        closedAt={periodClose?.closed_at ?? null}
        reopenReason={periodClose?.reopen_reason ?? null}
        accounts={rows}
      />
    </div>
  );
}
