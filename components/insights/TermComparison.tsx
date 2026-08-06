import { Amount } from "@/components/money/Amount";
import { colorVar } from "@/lib/categories";
import { formatShortDate } from "@/lib/date";

export type TermSummaryRow = {
  term_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  total_days: number;
  elapsed_days: number;
  spent_minor: number;
  received_minor: number;
  spent_per_day_minor: number | null;
  received_per_day_minor: number | null;
  savings_rate_percent: number | null;
};

export type TermCategoryRow = {
  term_id: string;
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  spent_usd_minor: number;
};

/**
 * This term against the one before it.
 *
 * Everything here is per-day, and that is the whole point rather than a
 * detail: terms are rarely the same length, and a 15-week semester compared
 * to a 12-week one on raw totals reads as "you spent more" even when the
 * daily habit was identical. A term still in progress is compared on the days
 * that have actually happened, not on the days it still has left.
 */
export function TermComparison({
  current,
  previous,
  categories,
}: {
  current: TermSummaryRow;
  previous: TermSummaryRow;
  categories: TermCategoryRow[];
}) {
  const inProgress = current.elapsed_days < current.total_days;

  const perDay = (row: TermSummaryRow, key: "spent_per_day_minor" | "received_per_day_minor") =>
    row[key] != null ? BigInt(row[key]) : null;

  const nowSpend = perDay(current, "spent_per_day_minor");
  const wasSpend = perDay(previous, "spent_per_day_minor");
  const nowIn = perDay(current, "received_per_day_minor");
  const wasIn = perDay(previous, "received_per_day_minor");

  // Per-day for each side, so the movers list is comparable the same way the
  // headline figures are.
  const byTerm = (termId: string, days: number) => {
    const map = new Map<string, { minor: bigint; name: string; icon: string | null; color: string | null }>();
    if (days <= 0) return map;
    for (const c of categories.filter((r) => r.term_id === termId)) {
      map.set(c.category_id, {
        minor: BigInt(c.spent_usd_minor) / BigInt(days),
        name: c.category_name,
        icon: c.category_icon,
        color: c.category_color,
      });
    }
    return map;
  };

  const nowCats = byTerm(current.term_id, current.elapsed_days);
  const wasCats = byTerm(previous.term_id, previous.elapsed_days);

  // Every category in either term appears, so one that fell to nothing still
  // reads as a real drop rather than quietly vanishing from the list.
  const movers = [...new Set([...nowCats.keys(), ...wasCats.keys()])]
    .map((id) => {
      const a = nowCats.get(id);
      const b = wasCats.get(id);
      const meta = a ?? b!;
      return {
        id,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        delta: (a?.minor ?? 0n) - (b?.minor ?? 0n),
      };
    })
    .filter((m) => m.delta !== 0n)
    .sort((x, y) => {
      const xa = x.delta < 0n ? -x.delta : x.delta;
      const ya = y.delta < 0n ? -y.delta : y.delta;
      return ya > xa ? 1 : -1;
    })
    .slice(0, 5);

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Compared with {previous.name}</p>
        <p className="text-[13px] text-muted">
          Per day, so the two are comparable even though {current.name} runs {current.total_days} days
          and {previous.name} ran {previous.total_days}.
          {inProgress && ` ${current.name} is ${current.elapsed_days} days in so far.`}
        </p>
      </div>

      <div className="row grid grid-cols-2 gap-4">
        <Stat label="Spending a day" now={nowSpend} was={wasSpend} lowerIsBetter />
        <Stat label="Coming in a day" now={nowIn} was={wasIn} />
      </div>

      {(current.savings_rate_percent != null || previous.savings_rate_percent != null) && (
        <div className="row">
          <p className="section-label mb-1">Kept, of what came in</p>
          <p className="text-[15px]">
            {current.savings_rate_percent != null ? (
              <span className="num font-medium">{current.savings_rate_percent}%</span>
            ) : (
              <span className="text-muted">nothing came in yet</span>
            )}
            {previous.savings_rate_percent != null && (
              <span className="text-muted text-[13px]">
                {" "}
                · {previous.savings_rate_percent}% in {previous.name}
              </span>
            )}
          </p>
        </div>
      )}

      {movers.length > 0 && (
        <>
          <p className="section-label row pb-1">Biggest movers, per day</p>
          {movers.map((m) => (
            <div key={m.id} className="row flex items-center gap-3">
              <span
                className="cat-dot"
                style={{ ["--cat-color" as string]: colorVar(m.color) }}
                aria-hidden
              />
              <span className="text-[15px] flex-1 truncate">
                <span aria-hidden className="mr-1.5">
                  {m.icon ?? "•"}
                </span>
                {m.name}
              </span>
              <span
                className={`text-[14px] shrink-0 ${m.delta > 0n ? "text-alarm" : "text-positive"}`}
              >
                {m.delta > 0n ? "+" : "−"}
                <Amount minor={m.delta < 0n ? -m.delta : m.delta} />
              </span>
            </div>
          ))}
        </>
      )}

      <p className="row text-[12px] text-faint">
        {previous.name}: {formatShortDate(previous.starts_on)} – {formatShortDate(previous.ends_on)}
      </p>
    </div>
  );
}

function Stat({
  label,
  now,
  was,
  lowerIsBetter = false,
}: {
  label: string;
  now: bigint | null;
  was: bigint | null;
  lowerIsBetter?: boolean;
}) {
  const delta = now != null && was != null ? now - was : null;
  // Direction and a word carry the meaning; colour only agrees with them.
  const better = delta == null ? null : lowerIsBetter ? delta < 0n : delta > 0n;

  return (
    <div>
      <p className="section-label">{label}</p>
      {now != null ? (
        <Amount minor={now} className="text-[19px] font-medium" />
      ) : (
        <p className="text-[19px] text-muted">—</p>
      )}
      {delta != null && delta !== 0n && (
        <p className={`text-[13px] ${better ? "text-positive" : "text-alarm"}`}>
          {delta > 0n ? "↑" : "↓"} <Amount minor={delta < 0n ? -delta : delta} /> vs last term
        </p>
      )}
      {delta === 0n && <p className="text-[13px] text-muted">same as last term</p>}
    </div>
  );
}
