"use client";

import { useEffect, useState } from "react";
import { Glass } from "@/components/glass/Glass";

const DEFAULT_GLASS = 60;

function glassToPx(v: number) {
  return Math.round((Math.max(0, Math.min(100, v)) / 100) * 40);
}

export function AppearanceSettings() {
  const [glass, setGlass] = useState(DEFAULT_GLASS);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Hydrate the controls from persisted preferences on mount (external state).
  useEffect(() => {
    const g = localStorage.getItem("glass");
    const r = localStorage.getItem("reduceMotion");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (g !== null && !Number.isNaN(+g)) setGlass(+g);
    if (r === "true") setReduceMotion(true);
  }, []);

  function changeGlass(v: number) {
    setGlass(v);
    localStorage.setItem("glass", String(v));
    document.documentElement.style.setProperty("--glass-blur", `${glassToPx(v)}px`);
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
            <span>COMMAND</span><span>DECK</span><span>FINANCE</span><span>TRACKER</span>
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
