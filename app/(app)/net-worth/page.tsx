import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { AccountSwatch } from "@/components/money/AccountSwatch";
import { NetWorthTrend } from "@/components/charts/NetWorthTrend";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Net worth" };

const KIND_LABEL: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  credit: "Credit card",
  investment: "Investment",
  other: "Other",
};

export default async function NetWorthPage() {
  const supabase = await createClient();

  const [positionRes, balancesRes, trendRes] = await Promise.all([
    supabase.from("liquid_position").select("*").maybeSingle(),
    supabase.from("balance_by_account").select("*").eq("is_archived", false).order("kind").order("name"),
    supabase.from("net_worth_by_month").select("*").order("month"),
  ]);

  const position = positionRes.data;
  const netWorth = BigInt(position?.net_worth_usd_minor ?? 0);
  const liquid = BigInt(position?.total_liquid_usd_minor ?? 0);
  const debt = BigInt(position?.total_debt_usd_minor ?? 0);

  const balances = balancesRes.data ?? [];
  const assets = balances.filter((b) => !b.is_liability);
  const liabilities = balances.filter((b) => b.is_liability);

  // Last 12 months at most: further back is a scroll, not an insight.
  const trend = (trendRes.data ?? []).slice(-12).map((p) => ({
    month: p.month ?? "",
    minor: BigInt(p.net_worth_usd_minor ?? 0),
  }));

  const first = trend[0];
  const last = trend[trend.length - 1];
  const change = first && last ? last.minor - first.minor : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Net worth</h1>
        <Link href="/settings" className="text-[13px] text-accent font-semibold">
          Accounts →
        </Link>
      </div>

      <div className="card card-hero row">
        <p className="section-label mb-2">What you&rsquo;re worth today</p>
        <Amount minor={netWorth} className={`hero-figure block ${netWorth < 0n ? "text-alarm" : ""}`} />
        {change !== null && trend.length > 1 && (
          <p className="text-[14px] text-muted mt-1">
            <span className={change >= 0n ? "text-positive" : "text-alarm"}>
              {change >= 0n ? "↑" : "↓"} {formatMoney(change < 0n ? -change : change)}
            </span>{" "}
            over {trend.length} months
          </p>
        )}
        <div className="flex gap-6 mt-4 pt-4 border-t">
          <div>
            <p className="section-label">Assets</p>
            <Amount minor={liquid} className="text-[17px] font-semibold text-positive" />
          </div>
          <div>
            <p className="section-label">Owed</p>
            <Amount minor={debt} className={`text-[17px] font-semibold ${debt > 0n ? "text-alarm" : ""}`} />
          </div>
        </div>
      </div>

      {trend.length > 1 && (
        <div className="card row">
          <p className="section-label mb-3">Month by month</p>
          <NetWorthTrend points={trend} />
          <p className="text-[12px] text-faint mt-3">
            Transfers between your own accounts never move this line — only money in and money out do.
          </p>
        </div>
      )}

      <div className="card">
        <p className="section-label row pb-0">What you have</p>
        {assets.map((a, i) => (
          <Link
            key={a.account_id}
            href={`/accounts/${a.account_id}`}
            className="row row-link flex items-center gap-3"
          >
            <AccountSwatch name={a.name ?? "?"} index={i} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] truncate">{a.name}</p>
              <p className="text-[13px] text-muted truncate">
                {KIND_LABEL[a.kind ?? ""] ?? a.kind}
                {a.institution ? ` · ${a.institution}` : ""}
              </p>
            </div>
            <Amount minor={BigInt(a.balance_minor ?? 0)} />
          </Link>
        ))}
        {assets.length === 0 && <p className="row text-[14px] text-muted">No accounts yet.</p>}
      </div>

      {liabilities.length > 0 && (
        <div className="card">
          <p className="section-label row pb-0">What you owe</p>
          {liabilities.map((a, i) => {
            const owed = -BigInt(a.balance_minor ?? 0);
            const limit = a.credit_limit_minor ? BigInt(a.credit_limit_minor) : null;
            const usedPct = limit && limit > 0n ? Number((owed * 100n) / limit) : null;
            return (
              <Link
                key={a.account_id}
                href={`/accounts/${a.account_id}`}
                className="row row-link block"
              >
                <div className="flex items-center gap-3">
                  <AccountSwatch name={a.name ?? "?"} index={assets.length + i} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] truncate">{a.name}</p>
                    <p className="text-[13px] text-muted truncate">
                      {a.institution ?? "Credit card"}
                    </p>
                  </div>
                  <Amount minor={owed} className={owed > 0n ? "text-alarm" : ""} />
                </div>
                {usedPct !== null && (
                  <>
                    <div className="progress-track mt-2">
                      <div
                        className="progress-fill"
                        data-tone={usedPct > 90 ? "alarm" : usedPct > 30 ? "urgent" : undefined}
                        style={{ width: `${Math.min(Math.max(usedPct, 0), 100)}%` }}
                      />
                    </div>
                    {/* 30% is the usual rule of thumb for keeping utilisation
                        from dragging on a credit score. */}
                    <p className="text-[12px] text-faint mt-1">
                      {usedPct}% of {formatMoney(limit!)} limit
                      {usedPct > 30 && " · above the 30% mark most guidance suggests staying under"}
                    </p>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
