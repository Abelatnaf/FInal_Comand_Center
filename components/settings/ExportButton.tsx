"use client";

import { useTransition } from "react";
import { exportAllData } from "@/app/(app)/settings/actions";
import { downloadJson } from "@/lib/csv";
import { todayIso } from "@/lib/date";

export function ExportButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const data = await exportAllData();
          downloadJson(data, `command-deck-export-${todayIso()}.json`);
        })
      }
    >
      {pending ? "Exporting…" : "Export all data as JSON"}
    </button>
  );
}
