// Fixed category chips -- no dropdown, no search (plan section 6). The set
// depends on direction: spending categories don't make sense for income,
// and vice versa.
export const EXPENSE_CATEGORIES = [
  "Tuition & Fees",
  "Food",
  "Uniform & Gear",
  "Personal Care",
  "Travel & Leave",
  "Transportation",
  "Health",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Freelance",
  "Family Support",
  "Stipend/Pay",
  "Refund",
  "Gift",
  "Transfer In",
  "Scholarship",
  "Other",
] as const;

export type Direction = "in" | "out";

export function categoriesFor(direction: Direction): readonly string[] {
  return direction === "out" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

/**
 * "Most-used first" -- the fixed set, reordered by real usage (most recent
 * 90 days), falling back to the default order for a brand-new user with no
 * history yet. `usageCounts` only needs to cover categories that were
 * actually used; anything unused keeps its default-order position after
 * the used ones.
 */
export function sortByUsage(direction: Direction, usageCounts: Record<string, number>): string[] {
  const fixed = categoriesFor(direction);
  return [...fixed].sort((a, b) => {
    const diff = (usageCounts[b] ?? 0) - (usageCounts[a] ?? 0);
    if (diff !== 0) return diff;
    return fixed.indexOf(a) - fixed.indexOf(b);
  });
}
