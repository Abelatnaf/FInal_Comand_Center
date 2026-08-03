import { dbDelete, dbGetAll, dbPut, QUEUE_STORE } from "./db";

export type QueuedTransaction = {
  id: string;
  queued_at: string;
  amount_minor: string;
  currency: string;
  direction: string;
  category_id: string;
  occurred_on: string;
  account_id: string;
  payer_id: string;
  note: string;
  obligation_id: string;
};

const QUEUE_CHANGED_EVENT = "offline-queue-changed";

function notifyQueueChanged() {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function onQueueChanged(listener: () => void): () => void {
  window.addEventListener(QUEUE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, listener);
}

export async function enqueueTransaction(entry: Omit<QueuedTransaction, "id" | "queued_at">): Promise<void> {
  const queued: QueuedTransaction = {
    ...entry,
    id: crypto.randomUUID(),
    queued_at: new Date().toISOString(),
  };
  await dbPut(QUEUE_STORE, queued);
  notifyQueueChanged();
}

export async function listQueuedTransactions(): Promise<QueuedTransaction[]> {
  const rows = await dbGetAll<QueuedTransaction>(QUEUE_STORE);
  return rows.sort((a, b) => a.queued_at.localeCompare(b.queued_at));
}

export async function removeQueuedTransaction(id: string): Promise<void> {
  await dbDelete(QUEUE_STORE, id);
  notifyQueueChanged();
}
