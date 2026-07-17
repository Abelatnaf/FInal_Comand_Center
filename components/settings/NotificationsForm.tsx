"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { updateNotificationPrefs } from "@/app/(app)/settings/actions";

type Prefs = {
  notify_weekly_digest: boolean;
  notify_budget_alerts: boolean;
  notify_bill_reminders: boolean;
};

const ROWS: { key: keyof Prefs; label: string; caption: string }[] = [
  { key: "notify_weekly_digest", label: "Weekly digest", caption: "A Monday-morning summary of last week's spending, income, and balance." },
  { key: "notify_budget_alerts", label: "Over-budget alerts", caption: "Email when a category goes over its monthly budget." },
  { key: "notify_bill_reminders", label: "Bill & low-balance reminders", caption: "Email when a recurring bill is due tomorrow, or your balance drops below your alert threshold." },
];

export function NotificationsForm({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setError(null);
    startTransition(async () => {
      const res = await updateNotificationPrefs(next);
      if (res?.error) {
        setError(res.error);
        setPrefs(prefs); // revert on failure
      }
    });
  }

  return (
    <Glass className="p-6 max-w-xl">
      <div className="ios-headline mb-1">Email Notifications</div>
      <p className="text-text-dim ios-subhead mb-4">
        These work even when you don&apos;t open the app. In-app banners (the strip above your pages) show the same
        alerts regardless of these settings.
      </p>
      <div className="flex flex-col">
        {ROWS.map((row, i) => (
          <div key={row.key}>
            {i > 0 && <div className="h-px bg-[var(--separator)]" />}
            <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
              <span className="min-w-0">
                <span className="block ios-subhead text-text">{row.label}</span>
                <span className="block ios-footnote text-text-dim mt-0.5">{row.caption}</span>
              </span>
              <input
                type="checkbox"
                className="ios-switch shrink-0"
                checked={prefs[row.key]}
                disabled={pending}
                onChange={(e) => toggle(row.key, e.target.checked)}
              />
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-[var(--red)] text-[13px] mt-2">{error}</p>}
    </Glass>
  );
}
