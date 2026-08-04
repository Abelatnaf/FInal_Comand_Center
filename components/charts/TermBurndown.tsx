import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/date";

export type BurndownPoint = {
  /** ISO date. */
  day: string;
  /** Spendable cash at the end of that day. Null after today. */
  actual: bigint | null;
  /** Straight line from the opening balance to what you said you want left. */
  ideal: bigint;
};

const W = 340;
const H = 140;
const PAD_TOP = 14;
const PAD_BOTTOM = 18;
const PAD_LEFT = 2;
/** Room for the direct labels, so a line can never run underneath its own name. */
const PAD_RIGHT = 56;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

/**
 * Money left across the term, against the pace that lands you on your target.
 *
 * This is emphasis, not two categories: your line is the point, the safe pace
 * is context. So it is one accent line plus one recessive dashed reference --
 * which means there is no second hue and no categorical palette to validate.
 * Both ends are directly labelled, so identity never rests on colour.
 *
 * The one place colour carries meaning is where your line sits below the safe
 * pace: those segments switch to --alarm, because that is the thing the chart
 * exists to show you.
 */
export function TermBurndown({ points }: { points: BurndownPoint[] }) {
  const withActual = points.filter((p) => p.actual !== null);
  if (points.length < 2 || withActual.length === 0) {
    return <p className="text-[14px] text-muted">Not enough of the term has passed yet.</p>;
  }

  const values = [
    ...points.map((p) => Number(p.ideal)),
    ...withActual.map((p) => Number(p.actual)),
  ];
  // Zero is always the floor when everything is positive: running out is what
  // this chart is about, so the axis has to be the thing you can hit.
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(1, ...values);
  const span = yMax - yMin || 1;

  const n = points.length;
  const x = (i: number) => PAD_LEFT + (i / (n - 1)) * PLOT_W;
  const y = (v: number) => PAD_TOP + (1 - (v - yMin) / span) * PLOT_H;
  const baselineY = y(Math.max(yMin, 0));

  const idealPath = points.map((p, i) => `${x(i)},${y(Number(p.ideal))}`).join(" ");

  const lastActualIndex = points.reduce((last, p, i) => (p.actual !== null ? i : last), 0);
  const actualPath = points
    .slice(0, lastActualIndex + 1)
    .map((p, i) => `${x(i)},${y(Number(p.actual))}`)
    .join(" ");

  // Runs of consecutive days where you are below the safe pace. Marked from
  // the first point of the pair, so a dip is never visually understated.
  const behindRuns: string[][] = [];
  let run: string[] = [];
  for (let i = 0; i < lastActualIndex; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a.actual === null || b.actual === null) continue;
    const behind = a.actual < a.ideal || b.actual < b.ideal;
    if (behind) {
      if (run.length === 0) run.push(`${x(i)},${y(Number(a.actual))}`);
      run.push(`${x(i + 1)},${y(Number(b.actual))}`);
    } else if (run.length > 0) {
      behindRuns.push(run);
      run = [];
    }
  }
  if (run.length > 0) behindRuns.push(run);

  const last = points[lastActualIndex];
  const lastX = x(lastActualIndex);
  const lastY = y(Number(last.actual));
  const idealEndY = y(Number(points[n - 1].ideal));

  // Both labels sit in the reserved right-hand gutter's leading edge or beside
  // their own point, never on top of a line. "you" flips to the left of its
  // point once the point is far enough right to run out of room.
  const youAnchor = lastX > PAD_LEFT + PLOT_W * 0.75 ? "end" : "start";
  const youX = youAnchor === "end" ? lastX - 7 : lastX + 7;
  // Above the point normally, but not so close to the axis that it sits on it.
  const youY = Math.abs(lastY - baselineY) < 13 ? lastY - 15 : lastY - 8;
  // Only collides when today IS the last day, which puts both ends together.
  const labelsCollide =
    youAnchor === "end" && lastX > PAD_LEFT + PLOT_W - 4 && Math.abs(youY - idealEndY) < 14;

  // Up to eight sampled points carry a native title, so an exact figure is one
  // press away without a client component or one node per day.
  const step = Math.max(1, Math.floor(lastActualIndex / 7));
  const samples: number[] = [];
  for (let i = 0; i <= lastActualIndex; i += step) samples.push(i);
  if (samples[samples.length - 1] !== lastActualIndex) samples.push(lastActualIndex);

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Money left across the term. ${formatMoney(last.actual!)} on ${formatShortDate(
          last.day
        )}, against a safe pace of ${formatMoney(last.ideal)}.`}
      >
        {/* Recessive hairline baseline, labelled so the scale has an anchor. */}
        <line
          x1={PAD_LEFT}
          y1={baselineY}
          x2={PAD_LEFT + PLOT_W}
          y2={baselineY}
          stroke="var(--border-strong)"
          strokeWidth={1}
        />
        {/* Dropped when the target lands on zero, where "safe pace" would sit
            on top of it and is the more useful of the two. */}
        {Math.abs(idealEndY - baselineY) >= 11 && (
          <text
            x={PAD_LEFT + PLOT_W + 4}
            y={baselineY + 3}
            fontSize="9"
            fill="var(--text-faint)"
          >
            $0
          </text>
        )}

        {/* The reference is a target you set, not a projection of your data. */}
        <polyline
          points={idealPath}
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        <polyline
          points={actualPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {behindRuns.map((r, i) => (
          <polyline
            key={i}
            points={r.join(" ")}
            fill="none"
            stroke="var(--alarm)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        <circle
          cx={lastX}
          cy={lastY}
          r={3.5}
          fill={last.actual! < last.ideal ? "var(--alarm)" : "var(--accent)"}
        />

        {samples.map((i) => (
          <circle key={i} cx={x(i)} cy={y(Number(points[i].actual))} r={9} fill="transparent">
            <title>{`${formatShortDate(points[i].day)}: ${formatMoney(
              points[i].actual!
            )} left · safe pace ${formatMoney(points[i].ideal)}`}</title>
          </circle>
        ))}

        <text
          x={youX}
          y={Math.max(youY, 9)}
          textAnchor={youAnchor}
          fontSize="10"
          fontWeight="600"
          fill={last.actual! < last.ideal ? "var(--alarm)" : "var(--accent)"}
        >
          you
        </text>
        <text
          x={PAD_LEFT + PLOT_W + 4}
          y={labelsCollide ? idealEndY + 14 : idealEndY + 3}
          fontSize="10"
          fill="var(--text-faint)"
        >
          safe pace
        </text>
      </svg>

      <div className="flex justify-between text-[10px] text-faint">
        <span>{formatShortDate(points[0].day)}</span>
        <span>{formatShortDate(points[n - 1].day)}</span>
      </div>
    </div>
  );
}
