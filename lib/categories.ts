// Categories are real records now (public.categories), not a hardcoded list.
// That is what lets a category carry a monthly budget, a colour and an icon,
// and what lets renaming one leave history intact.

export type CategoryKind = "expense" | "income";
export type Direction = "in" | "out";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  budget_usd_minor: number | null;
  sort_order: number;
  is_archived: boolean;
};

/** The colour tokens defined in globals.css. Stored by name rather than by
 *  hex, so a category re-themes automatically when the palette changes and
 *  works in both light and dark without storing two values. */
export const CATEGORY_COLORS = [
  "emerald",
  "blue",
  "violet",
  "amber",
  "rose",
  "cyan",
  "orange",
  "pink",
  "teal",
  "indigo",
  "lime",
  "slate",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

/** Resolves a stored colour name to the CSS variable the styles read.
 *  Falls back to slate so an unrecognised value renders plainly rather than
 *  as an unstyled element. */
export function colorVar(color: string | null | undefined): string {
  return `var(--cat-${color && isCategoryColor(color) ? color : "slate"})`;
}

/** Offered when creating a category. Free text is still accepted — this is a
 *  shortcut, not a constraint. */
export const CATEGORY_ICONS = [
  "🛒", "🍔", "☕", "🚗", "⛽", "🏠", "💡", "📱", "🛍️", "👕",
  "💊", "🏥", "🎬", "🎮", "🎵", "🔁", "📚", "✈️", "🏨", "🧴",
  "🎁", "🐾", "🏦", "💼", "💻", "📈", "↩️", "📦",
] as const;

export const kindForDirection = (direction: Direction): CategoryKind =>
  direction === "out" ? "expense" : "income";

/**
 * "Most-used first" — the user's own categories reordered by real usage over
 * the last 90 days, falling back to each category's sort_order for anything
 * unused (and for a brand-new account with no history at all).
 */
export function sortByUsage<T extends { id: string; sort_order: number }>(
  categories: T[],
  usageCounts: Record<string, number>
): T[] {
  return [...categories].sort((a, b) => {
    const diff = (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0);
    if (diff !== 0) return diff;
    return a.sort_order - b.sort_order;
  });
}
