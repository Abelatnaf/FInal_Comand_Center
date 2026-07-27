"use client";

import type { Currency } from "@/lib/money";

export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Currency">
      <button type="button" data-active={value === "ETB"} onClick={() => onChange("ETB")}>
        ETB
      </button>
      <button type="button" data-active={value === "USD"} onClick={() => onChange("USD")}>
        USD
      </button>
    </div>
  );
}
