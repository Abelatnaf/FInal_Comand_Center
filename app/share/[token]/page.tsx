import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { formatMoney } from "@/lib/money";

export default async function SharedSnapshotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_shared_snapshot", { p_token: token }).maybeSingle();

  // Distinguish a genuinely invalid/revoked link from "couldn't check right
  // now" -- conflating the two would misreport a real link as dead just
  // because a request failed.
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="card p-7 max-w-sm text-center">
          <p className="text-[15px] text-text">Couldn&rsquo;t load this right now.</p>
          <p className="text-[14px] text-muted mt-1">Try again in a moment.</p>
        </div>
      </div>
    );
  }

  if (!data?.found) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="card p-7 max-w-sm text-center">
          <p className="text-[15px] text-text">This link isn&rsquo;t valid.</p>
          <p className="text-[14px] text-muted mt-1">It may have been revoked.</p>
        </div>
      </div>
    );
  }

  const left = BigInt(data.money_left_minor ?? 0);
  const safe = data.safe_daily_minor != null ? BigInt(data.safe_daily_minor) : null;
  const actual = data.actual_daily_minor != null ? BigInt(data.actual_daily_minor) : null;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="page-title">{data.term_name ?? "Shared status"}</h1>
          <p className="text-[13px] text-muted">Read-only — nothing here can be edited.</p>
        </div>

        <div className="card row">
          <p className="section-label mb-2">Money left</p>
          <Amount minor={left} className={`text-[32px] font-light block ${left <= 0n ? "text-alarm" : ""}`} />
          {data.days_remaining != null && (
            <p className="text-[14px] text-muted mt-1">
              {data.days_remaining} {data.days_remaining === 1 ? "day" : "days"} to go
            </p>
          )}
          {safe !== null && (
            <div className="flex gap-6 mt-4 pt-4 border-t">
              <div>
                <p className="section-label">Safe a day</p>
                <Amount minor={safe} className="text-[17px] font-semibold" />
              </div>
              {actual !== null && (
                <div>
                  <p className="section-label">Actual a day</p>
                  <Amount
                    minor={actual}
                    className={`text-[17px] font-semibold ${actual > safe ? "text-alarm" : "text-positive"}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {data.next_due_title && (
          <div className="card row">
            <p className="section-label mb-2">Next due</p>
            <p className="text-[17px] text-text font-medium">{data.next_due_title}</p>
            <p className={`text-[14px] mt-1 ${data.next_due_is_past_due ? "text-alarm" : "text-muted"}`}>
              {formatMoney(BigInt(data.next_due_remaining_usd_minor ?? 0))}
              {data.next_due_is_past_due
                ? ` · ${Math.abs(data.next_due_days_until_due ?? 0)} days past due`
                : data.next_due_days_until_due != null
                  ? ` · ${data.next_due_days_until_due} days left`
                  : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
