"use client";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className="keypad-btn"
          onClick={() => onKey(k)}
          aria-label={k === "del" ? "Delete" : k}
        >
          {k === "del" ? "⌫" : k}
        </button>
      ))}
    </div>
  );
}
