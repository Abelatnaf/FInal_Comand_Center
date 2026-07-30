import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/date";

type Balance = { name: string; currency: "ETB" | "USD"; balance_minor: number };

export default async function SharedSnapshotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_shared_snapshot", { p_token: token }).maybeSingle();

  // Distinguish a genuinely invalid/revoked link from "couldn't check right
  // now" -- conflating the two would misreport a real link as dead just
  // because of a transient fetch problem.
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="card row max-w-sm text-center">
          <p className="text-[15px] text-text">Couldn&rsquo;t load this right now.</p>
          <p className="text-[13px] text-muted mt-1">Try again in a moment.</p>
        </div>
      </div>
    );
  }

  if (!data || !data.found) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="card row max-w-sm text-center">
          <p className="text-[15px] text-text">This link isn&rsquo;t valid.</p>
          <p className="text-[13px] text-muted mt-1">It may have been revoked.</p>
        </div>
      </div>
    );
  }

  const balances = (data.balances as Balance[] | null) ?? [];
  const isCovered =
    data.total_liquid_usd_minor != null && data.next_due_remaining_usd_minor != null
      ? BigInt(data.total_liquid_usd_minor) >= BigInt(data.next_due_remaining_usd_minor)
      : null;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="page-title">Shared status</h1>
          <p className="text-[13px] text-muted">Read-only — nothing here can be edited.</p>
        </div>

        {data.next_due_title ? (
          <div className="card row">
            <p className="section-label mb-2">Next due</p>
            <p className="text-[17px] text-text font-medium">{data.next_due_title}</p>
            {data.next_due_payer_label && <p className="text-[13px] text-muted mb-2">{data.next_due_payer_label}</p>}
            <Amount
              minor={BigInt(data.next_due_remaining_usd_minor ?? 0)}
              currency="USD"
              className={`text-[28px] font-light block ${data.next_due_is_past_due ? "text-alarm" : (data.next_due_days_until_due ?? 99) <= 14 ? "text-urgent" : "text-text"}`}
            />
            <p className={`text-[14px] mt-1 ${data.next_due_is_past_due ? "text-alarm" : "text-muted"}`}>
              {data.next_due_is_past_due
                ? `${Math.abs(data.next_due_days_until_due ?? 0)} days past due`
                : `${data.next_due_days_until_due} days left`}
            </p>
          </div>
        ) : (
          <div className="card row">
            <p className="text-[15px] text-text">Nothing due right now.</p>
          </div>
        )}

        <div className="card row">
          <p className="section-label mb-2">Coverage</p>
          {data.total_liquid_usd_minor != null ? (
            <p className="text-[15px] text-text">
              <span className={`num estimate ${isCovered ? "text-positive" : "text-alarm"}`}>
                ~{formatMoney(BigInt(data.total_liquid_usd_minor), "USD")}
              </span>{" "}
              liquid
              {data.next_due_remaining_usd_minor != null && (
                <>
                  {" "}
                  against <Amount minor={BigInt(data.next_due_remaining_usd_minor)} currency="USD" className="text-text" /> due
                </>
              )}
              .
            </p>
          ) : (
            <p className="text-[14px] text-muted">Not available.</p>
          )}
          {data.fx_rate_effective_on && (
            <p className="text-[12px] text-faint mt-1">Rate as of {formatShortDate(data.fx_rate_effective_on)}</p>
          )}
        </div>

        <div className="card">
          <p className="section-label row pb-0">Balances</p>
          {balances.map((b) => (
            <div key={b.name} className="row flex items-center justify-between">
              <span className="text-[15px] text-text">{b.name}</span>
              <Amount minor={BigInt(b.balance_minor)} currency={b.currency} className="text-text" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
