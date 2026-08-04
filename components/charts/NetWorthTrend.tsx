import { formatMoney, formatMoneyShort } from "@/lib/money";

export type NetWorthPoint = {
  /** First day of the month, ISO. */
  month: string;
  minor: bigint;
};

const MONTH_LABEL = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * Net worth over time. Columns rather than a line, matching the spending
 * chart's form so the two read as one system, and a single series so there is
 * no legend — the heading names it.
 *
 * Net worth can be negative, so the baseline is zero rather than the minimum:
 * a bar that grows downward from a zero line is the honest picture of debt,
 * where a chart floored at the lowest value would make it look like progress.
 */
export function NetWorthTrend({ points }: { points: NetWorthPoint[] }) {
  if (points.length < 2) {
    return <p className="text-[14px] text-muted">Not enough history yet.</p>;
  }

  const maxAbs = points.reduce((m, p) => {
    const abs = p.minor < 0n ? -p.minor : p.minor;
    return abs > m ? abs : m;
  }, 1n);

  const hasNegative = points.some((p) => p.minor < 0n);
  const lastIndex = points.length - 1;

  // Prior months are dimmed so the current one reads as current, but not below
  // 3:1 against the card surface -- the bars are the data, not decoration.
  // Measured: 0.55 came out at 2.8:1 in both themes; 0.7 clears with margin.
  const PAST_OPACITY = 0.7;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-1.5 h-[120px]">
        {points.map((p, i) => {
          const abs = p.minor < 0n ? -p.minor : p.minor;
          const pct = Number((abs * 1000n) / maxAbs) / 10;
          const date = new Date(`${p.month}T00:00:00`);
          const label = `${date.toLocaleString("en-US", { month: "long" })} ${date.getFullYear()}`;
          const negative = p.minor < 0n;
          return (
            <div
              key={p.month}
              className="flex-1 flex flex-col justify-center min-w-0"
              title={`${label}: ${formatMoney(p.minor)}`}
            >
              {/* Two halves so the zero line stays in the same place for every
                  column, whichever direction that column happens to go. */}
              <div className="flex-1 flex flex-col justify-end">
                {!negative && (
                  <div
                    className="rounded-t-[3px] bg-[var(--accent)]"
                    style={{ height: `${Math.max(pct, 2)}%`, opacity: i === lastIndex ? 1 : PAST_OPACITY }}
                  />
                )}
              </div>
              {hasNegative && (
                <div className="flex-1 flex flex-col justify-start">
                  {negative && (
                    <div
                      className="rounded-b-[3px] bg-[var(--alarm)]"
                      style={{ height: `${Math.max(pct, 2)}%`, opacity: i === lastIndex ? 1 : PAST_OPACITY }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {points.map((p) => {
          const date = new Date(`${p.month}T00:00:00`);
          return (
            <span key={p.month} className="flex-1 text-center text-[10px] text-faint">
              {MONTH_LABEL[date.getMonth()]}
            </span>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-faint num">
        <span>{formatMoneyShort(points[0].minor)}</span>
        <span>{formatMoneyShort(points[lastIndex].minor)}</span>
      </div>
    </div>
  );
}
