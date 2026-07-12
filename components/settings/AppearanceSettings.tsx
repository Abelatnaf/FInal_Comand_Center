"use client";

import { useEffect, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { ThemeToggle } from "@/components/ThemeToggle";

/* Keep these two maps in sync with the pre-paint script in app/layout.tsx. */
const ACCENTS: { name: string; key: string; base: string; hover: string }[] = [
  { name: "Blue", key: "blue", base: "#007aff", hover: "#0071e3" },
  { name: "Purple", key: "purple", base: "#af52de", hover: "#9a3fc8" },
  { name: "Indigo", key: "indigo", base: "#5856d6", hover: "#4a48c4" },
  { name: "Teal", key: "teal", base: "#30b0c7", hover: "#2a9cb0" },
  { name: "Pink", key: "pink", base: "#ff2d55", hover: "#e02648" },
  { name: "Orange", key: "orange", base: "#ff9500", hover: "#e68600" },
];

const DEFAULT_GLASS = 60;

function glassToPx(v: number) {
  return Math.round((Math.max(0, Math.min(100, v)) / 100) * 40);
}

export function AppearanceSettings() {
  const [glass, setGlass] = useState(DEFAULT_GLASS);
  const [accent, setAccent] = useState("blue");
  const [reduceMotion, setReduceMotion] = useState(false);

  // Hydrate the controls from persisted preferences on mount (external state).
  useEffect(() => {
    const g = localStorage.getItem("glass");
    const a = localStorage.getItem("accent");
    const r = localStorage.getItem("reduceMotion");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (g !== null && !Number.isNaN(+g)) setGlass(+g);
    if (a) setAccent(a);
    if (r === "true") setReduceMotion(true);
  }, []);

  function changeGlass(v: number) {
    setGlass(v);
    localStorage.setItem("glass", String(v));
    document.documentElement.style.setProperty("--glass-blur", `${glassToPx(v)}px`);
  }

  function changeAccent(key: string) {
    setAccent(key);
    const a = ACCENTS.find((x) => x.key === key)!;
    localStorage.setItem("accent", key);
    document.documentElement.style.setProperty("--blue", a.base);
    document.documentElement.style.setProperty("--blue-hover", a.hover);
  }

  function changeReduceMotion(on: boolean) {
    setReduceMotion(on);
    if (on) {
      localStorage.setItem("reduceMotion", "true");
      document.documentElement.dataset.reduceMotion = "true";
    } else {
      localStorage.removeItem("reduceMotion");
      delete document.documentElement.dataset.reduceMotion;
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      {/* Theme */}
      <Glass className="p-6">
        <div className="ios-headline mb-1">Theme</div>
        <p className="text-text-dim ios-subhead mb-4">Choose Light, Dark, or Auto to follow your device.</p>
        <ThemeToggle />
      </Glass>

      {/* Liquid glass */}
      <Glass className="p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="ios-headline">Liquid Glass</div>
          <div className="num text-text-dim text-[15px]">{glass}%</div>
        </div>
        <p className="text-text-dim ios-subhead mb-4">
          How much the frosted chrome — tab bar, sheets, and popovers — blurs what&apos;s behind it.
        </p>

        {/* Live preview: text behind a frosted bar */}
        <div className="relative h-20 rounded-[14px] overflow-hidden mb-4 border border-[var(--separator)]">
          <div
            className="absolute inset-0 flex items-center justify-around px-4 text-[13px] font-semibold"
            style={{ background: "linear-gradient(120deg,var(--blue),var(--purple) 55%,var(--teal))", color: "#fff" }}
          >
            <span>VMI</span><span>FINANCE</span><span>COMMAND</span><span>DECK</span>
          </div>
          <div className="material absolute inset-x-0 bottom-0 h-11 flex items-center px-4 border-t border-[var(--separator)]">
            <span className="ios-subhead">Frosted overlay preview</span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={glass}
          onChange={(e) => changeGlass(Number(e.target.value))}
          aria-label="Liquid glass amount"
          className="glass-slider"
          style={{ background: `linear-gradient(to right, var(--blue) ${glass}%, var(--gray5) ${glass}%)` }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="stat-label">Solid</span>
          <span className="stat-label">Frosted</span>
        </div>
      </Glass>

      {/* Accent color */}
      <Glass className="p-6">
        <div className="ios-headline mb-1">Accent Color</div>
        <p className="text-text-dim ios-subhead mb-4">
          The tint used for buttons, links, and selected states across the app.
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const on = accent === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => changeAccent(a.key)}
                aria-label={a.name}
                aria-pressed={on}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{ background: a.base, boxShadow: on ? `0 0 0 2px var(--bg-elevated), 0 0 0 4px ${a.base}` : "none" }}
              >
                {on && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </Glass>

      {/* Reduce motion */}
      <Glass className="p-6">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span>
            <span className="ios-headline block">Reduce Motion</span>
            <span className="text-text-dim ios-subhead">Turn off the progress-bar sweep and other animations.</span>
          </span>
          <input
            type="checkbox"
            className="ios-switch"
            checked={reduceMotion}
            onChange={(e) => changeReduceMotion(e.target.checked)}
          />
        </label>
      </Glass>
    </div>
  );
}
