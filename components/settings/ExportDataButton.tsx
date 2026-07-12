"use client";

import { useTransition } from "react";
import { exportAllData } from "@/app/(app)/settings/actions";
import { downloadJson } from "@/lib/csv";

export function ExportDataButton() {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const data = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `command-deck-export-${date}.json`);
    });
  }

  return (
    <button onClick={handleExport} disabled={pending} className="btn">
      {pending ? "Preparing…" : "Export All Data (JSON)"}
    </button>
  );
}
