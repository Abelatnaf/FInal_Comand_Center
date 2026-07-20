"use client";

import { useState } from "react";
import { exportAllData } from "@/app/(app)/settings/actions";
import { downloadJson } from "@/lib/csv";

export function ExportDataButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const data = await exportAllData();
        downloadJson(data, `command-deck-export-${new Date().toISOString().slice(0, 10)}.json`);
        setBusy(false);
      }}
      className="btn text-sm !py-2 !px-3.5"
    >
      {busy ? "Preparing…" : "Export All Data (JSON)"}
    </button>
  );
}
