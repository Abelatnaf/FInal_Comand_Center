"use client";

import { useEffect, useState } from "react";

type Alert = { id: string; message: string };

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const today = todayIso();
    const dismissed = new Set<string>();
    for (const a of alerts) {
      if (localStorage.getItem(`alert_dismissed_${a.id}`) === today) dismissed.add(a.id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedIds(dismissed);
  }, [alerts]);

  function dismiss(id: string) {
    localStorage.setItem(`alert_dismissed_${id}`, todayIso());
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  const visible = alerts.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {visible.map((a) => (
        <div key={a.id} className="glass-dense flex items-center justify-between gap-3 py-2.5 px-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-tint shrink-0"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <p className="ios-footnote truncate">{a.message}</p>
          </div>
          <button onClick={() => dismiss(a.id)} aria-label="Dismiss" className="text-text-faint shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
