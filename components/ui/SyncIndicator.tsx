"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listQueuedTransactions, onQueueChanged } from "@/lib/offline/queue";
import { flushQueue } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

export function SyncIndicator() {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  useEffect(() => {
    async function refresh() {
      const queued = await listQueuedTransactions();
      setCount(queued.length);
    }
    refresh();
    return onQueueChanged(refresh);
  }, []);

  useEffect(() => {
    if (!isOnline || flushingRef.current) return;
    flushingRef.current = true;
    setSyncing(true);
    flushQueue()
      .then(({ synced }) => {
        if (synced > 0) router.refresh();
      })
      .finally(() => {
        flushingRef.current = false;
        setSyncing(false);
      });
  }, [isOnline, router]);

  if (count === 0) return null;

  async function syncNow() {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setSyncing(true);
    const { synced } = await flushQueue();
    flushingRef.current = false;
    setSyncing(false);
    if (synced > 0) router.refresh();
  }

  return (
    <div className="card row flex items-center justify-between text-[14px]">
      <span className="text-muted">
        {syncing ? "Syncing…" : `${count} ${count === 1 ? "entry" : "entries"} waiting to sync`}
      </span>
      {!syncing && isOnline && (
        <button type="button" className="text-text" onClick={syncNow}>
          Sync now
        </button>
      )}
    </div>
  );
}
