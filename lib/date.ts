// Date helpers, local time zone throughout. date-fns only — see
// CLAUDE.md v3 plan section 8.
import { differenceInCalendarDays, format, parseISO, startOfMonth, subDays, subMonths } from "date-fns";

/** Today's date as 'yyyy-MM-dd' in the local time zone. */
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** `days` calendar days before today, as 'yyyy-MM-dd'. */
export function daysAgoIso(days: number): string {
  return format(subDays(new Date(), days), "yyyy-MM-dd");
}

/** `days` calendar days after today, as 'yyyy-MM-dd'. */
export function daysAheadIso(days: number): string {
  return format(subDays(new Date(), -days), "yyyy-MM-dd");
}

/** Calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

/** True when `dateIso` is more than `days` calendar days before today. */
export function isOlderThanDays(dateIso: string, days: number): boolean {
  return daysBetween(dateIso, todayIso()) > days;
}

/** e.g. "Jul 27" */
export function formatShortDate(dateIso: string): string {
  return format(parseISO(dateIso), "MMM d");
}

/** First day of the current month, as 'yyyy-MM-dd'. */
export function monthStartIso(monthsAgo = 0): string {
  return format(startOfMonth(subMonths(new Date(), monthsAgo)), "yyyy-MM-dd");
}

/** e.g. "August 2026" — for a month heading. */
export function formatMonthLong(monthIso: string): string {
  return format(parseISO(monthIso), "MMMM yyyy");
}

/** The last `count` months' first days, oldest first. */
export function recentMonthStarts(count: number): string[] {
  return Array.from({ length: count }, (_, i) => monthStartIso(count - 1 - i));
}

/** "Today" / "Yesterday" / "Jul 25" — for lists grouped by day. */
export function formatRelativeDay(dateIso: string): string {
  const delta = daysBetween(dateIso, todayIso());
  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  return formatShortDate(dateIso);
}
