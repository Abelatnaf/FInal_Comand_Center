import Link from "next/link";
import { daysBetween, formatShortDate, isOlderThanDays, todayIso } from "@/lib/date";

/** Matches the staleness threshold the Settings rate form already uses. */
const STALE_AFTER_DAYS = 7;

/**
 * Says something only when there's something to do about it.
 *
 * Two real cases: no rate at all while ETB accounts exist (every ETB entry
 * will be rejected on submit, which is otherwise only discovered after typing
 * an amount), and a rate old enough that coverage estimates shouldn't be
 * trusted. A current rate, or no ETB accounts at all, renders nothing --
 * a banner that's always present stops being read.
 */
export function FxRateNotice({
  rate,
  hasEtbAccounts,
}: {
  rate: { etb_per_usd: number; effective_on: string } | null;
  hasEtbAccounts: boolean;
}) {
  if (!hasEtbAccounts) return null;

  if (!rate) {
    return (
      <Link href="/settings" className="card row block">
        <p className="text-[15px] text-urgent">No exchange rate set</p>
        <p className="text-[13px] text-muted mt-1">
          ETB entries can&rsquo;t be saved until you add one. USD works either way. Tap to set it.
        </p>
      </Link>
    );
  }

  if (!isOlderThanDays(rate.effective_on, STALE_AFTER_DAYS)) return null;
  const age = daysBetween(rate.effective_on, todayIso());

  return (
    <Link href="/settings" className="card row block">
      <p className="text-[15px] text-urgent">Exchange rate is {age} days old</p>
      <p className="text-[13px] text-muted mt-1">
        From {formatShortDate(rate.effective_on)}. Recorded entries keep the rate they were saved with;
        it&rsquo;s the coverage estimate that drifts. Tap to update.
      </p>
    </Link>
  );
}
