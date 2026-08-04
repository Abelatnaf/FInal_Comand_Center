import { formatMoney } from "@/lib/money";

export type TrendPoint = {
  /** First day of the month, ISO. */
  month: string;
  minor: bigint;
};

const MONTH_LABEL = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * Month-over-month spending. One series, so there is no legend — the heading
 * names it. The current month is the only highlighted column, and only the
 * largest column is directly labelled; every column carries a native title
 * tooltip so an exact figure is one hover/long-press away without shipping a
 * client component for it.
 */
export function SpendTrend({ points }: { points: TrendPoint[] }) {
  if (points.length === 0 || points.every((p) => p.minor === 0n)) {
    return <p className="text-[14px] text-muted">Not enough history yet.</p>;
  }

  const max = points.reduce((m, p) => (p.minor > m ? p.minor : m), 1n);
  const peakIndex = points.reduce((best, p, i) => (p.minor > points[best].minor ? i : best), 0);
  const lastIndex = points.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="col-chart">
        {points.map((p, i) => {
          const pct = Number((p.minor * 1000n) / max) / 10;
          const date = new Date(`${p.month}T00:00:00`);
          const label = `${date.toLocaleString("en-US", { month: "long" })} ${date.getFullYear()}`;
          return (
            <div key={p.month} className="col-item" data-current={i === lastIndex}>
              {i === peakIndex && (
                <span className="num text-[10px] text-muted text-center leading-none">
                  {formatMoney(p.minor)}
                </span>
              )}
              <div
                className="col-bar"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${label}: ${formatMoney(p.minor)}`}
              />
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
    </div>
  );
}
