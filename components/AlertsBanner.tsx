"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type Alert = { id: string; message: string; href?: string };

function dismissKey(id: string) {
  return `alert_dismissed_${id}_${new Date().toISOString().slice(0, 10)}`;
}

export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Dismissal is per-calendar-day and lives in localStorage, so it's unknown
  // until mount — gate rendering until then rather than flash-then-hide.
  useEffect(() => {
    const d = new Set<string>();
    for (const a of alerts) {
      if (localStorage.getItem(dismissKey(a.id)) === "true") d.add(a.id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(d);
    setHydrated(true);
  }, [alerts]);

  function dismiss(id: string) {
    localStorage.setItem(dismissKey(id), "true");
    setDismissed((prev) => new Set(prev).add(id));
  }

  if (!hydrated) return null;
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-5">
      {visible.map((a) => (
        <div
          key={a.id}
          className="glass flex items-center gap-3 px-4 py-2.5"
          style={{ border: "1px solid rgba(255,159,10,0.35)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <Link href={a.href ?? "/"} className="flex-1 text-[14px] text-text hover:opacity-80 transition-opacity">
            {a.message}
          </Link>
          <button onClick={() => dismiss(a.id)} aria-label="Dismiss" className="text-text-dim shrink-0 active:opacity-60 transition-opacity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
