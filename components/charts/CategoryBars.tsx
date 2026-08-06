import Link from "next/link";
import { colorVar } from "@/lib/categories";
import { formatMoney } from "@/lib/money";

export type CategorySlice = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  minor: bigint;
};

/**
 * Ranked horizontal bars — deliberately not a pie or donut. Every bar carries
 * its own name and figure, so identity never rests on colour alone and the
 * ordering answers "where did it go" directly. Colour follows the category
 * (the entity), never its rank, so filtering the list never repaints the
 * survivors.
 *
 * Amounts are each transaction's own frozen USD figure, which is the only unit
 * comparable across two currencies — so nothing here moves when today's rate
 * does, and no estimate marking is needed.
 */
export function CategoryBars({
  slices,
  limit = 6,
  emptyLabel = "Nothing spent in this period.",
}: {
  slices: CategorySlice[];
  limit?: number;
  emptyLabel?: string;
}) {
  const ranked = [...slices].filter((s) => s.minor > 0n).sort((a, b) => (b.minor > a.minor ? 1 : -1));

  if (ranked.length === 0) {
    return <p className="row text-[14px] text-muted">{emptyLabel}</p>;
  }

  // Anything past the cut folds into a single "Other" bar rather than
  // generating more colours than the palette can keep distinguishable.
  const shown = ranked.slice(0, limit);
  const rest = ranked.slice(limit);
  const otherTotal = rest.reduce((sum, s) => sum + s.minor, 0n);
  const bars = otherTotal > 0n
    ? [...shown, { id: "__other", name: `${rest.length} more`, icon: "•", color: "slate", minor: otherTotal }]
    : shown;

  const max = bars.reduce((m, s) => (s.minor > m ? s.minor : m), 1n);

  return (
    <div className="flex flex-col gap-3">
      {bars.map((s) => {
        const pct = Number((s.minor * 1000n) / max) / 10;
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="truncate">
                <span aria-hidden className="mr-1.5">
                  {s.icon ?? "•"}
                </span>
                {s.name}
              </span>
              <span className="num text-muted shrink-0">{formatMoney(s.minor)}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${Math.max(pct, 1)}%`, ["--cat-color" as string]: colorVar(s.color) }}
              />
            </div>
          </>
        );

        // The folded "N more" bar stands for several categories at once, so
        // there is no single page for it to lead to.
        return s.id === "__other" ? (
          <div key={s.id} className="flex flex-col gap-1.5">
            {body}
          </div>
        ) : (
          <Link key={s.id} href={`/categories/${s.id}`} className="flex flex-col gap-1.5">
            {body}
          </Link>
        );
      })}
    </div>
  );
}
