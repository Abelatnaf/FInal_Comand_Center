import { createTransaction } from "@/app/(app)/add/actions";
import { listQueuedTransactions, removeQueuedTransaction, type QueuedTransaction } from "./queue";

function toFormData(entry: QueuedTransaction): FormData {
  const fd = new FormData();
  fd.set("amount_minor", entry.amount_minor);
  fd.set("direction", entry.direction);
  fd.set("category_id", entry.category_id);
  fd.set("occurred_on", entry.occurred_on);
  fd.set("account_id", entry.account_id);
  fd.set("note", entry.note);
  fd.set("tags", entry.tags ?? "");
  fd.set("is_tax_deductible", entry.is_tax_deductible ?? "false");
  fd.set("obligation_id", entry.obligation_id);
  // A replay is never the user tapping Save twice, so the duplicate guard
  // would only ever produce a false positive here and silently drop the entry.
  fd.set("confirm_duplicate", "true");
  return fd;
}

/**
 * Replays every queued transaction through the real createTransaction
 * server action, in the order they were queued. Entries that fail
 * (validation error, or still offline) stay queued to retry next time --
 * only a confirmed server-side success removes one from the queue.
 */
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  if (!navigator.onLine) {
    const queued = await listQueuedTransactions();
    return { synced: 0, remaining: queued.length };
  }

  const queued = await listQueuedTransactions();
  let synced = 0;

  for (const entry of queued) {
    try {
      const result = await createTransaction(undefined, toFormData(entry));
      if (result?.error) continue;
      await removeQueuedTransaction(entry.id);
      synced += 1;
    } catch {
      // Network dropped again mid-flush -- stop here, the rest stay queued.
      break;
    }
  }

  const remaining = await listQueuedTransactions();
  return { synced, remaining: remaining.length };
}
