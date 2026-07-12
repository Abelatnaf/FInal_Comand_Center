"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function parseIso(s?: string) {
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  return { y, m, d };
}
function fmtDisplay(s?: string) {
  const p = parseIso(s);
  if (!p) return "";
  return `${MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}`;
}

type Props = {
  name?: string;
  value?: string; // controlled ISO yyyy-mm-dd
  defaultValue?: string; // uncontrolled
  onChange?: (v: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
};

export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  required,
  className,
  placeholder = "Select date",
  id,
  ariaLabel,
}: Props) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(defaultValue ?? "");
  const selected = isControlled ? value ?? "" : internal;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Portal target only exists on the client — gate rendering until mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const initial =
    parseIso(selected) ??
    (() => {
      const n = new Date();
      return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
    })();
  const [view, setView] = useState<{ y: number; m: number }>({ y: initial.y, m: initial.m });

  const todayIso = useMemo(() => {
    const n = new Date();
    return toIso(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const popW = 300;
    const popH = 356;
    let left = r.left;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    if (top + popH > window.innerHeight - 8) {
      const above = r.top - popH - 6;
      top = above >= 8 ? above : Math.max(8, window.innerHeight - popH - 8);
    }
    setPos({ top, left, width: popW });
  }

  function openPicker() {
    const p = parseIso(selected);
    if (p) setView({ y: p.y, m: p.m });
    place();
    setOpen(true);
  }

  // Keep the popover glued to the trigger while open.
  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScrollResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

  function pick(iso: string) {
    if (!isControlled) setInternal(iso);
    onChange?.(iso);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) {
        m = 11;
        y--;
      }
      if (m > 11) {
        m = 0;
        y++;
      }
      return { y, m };
    });
  }

  const cells = useMemo(() => {
    const startDow = new Date(view.y, view.m, 1).getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const prevDays = new Date(view.y, view.m, 0).getDate();
    const out: { iso: string; day: number; muted: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevDays - i;
      const m = (view.m + 11) % 12;
      const y = view.m === 0 ? view.y - 1 : view.y;
      out.push({ iso: toIso(y, m, d), day: d, muted: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ iso: toIso(view.y, view.m, d), day: d, muted: false });
    }
    let next = 1;
    while (out.length < 42) {
      const m = (view.m + 1) % 12;
      const y = view.m === 11 ? view.y + 1 : view.y;
      out.push({ iso: toIso(y, m, next), day: next, muted: true });
      next++;
    }
    return out;
  }, [view]);

  return (
    <div className="relative inline-block w-full">
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        ref={btnRef}
        type="button"
        id={id}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-empty={selected ? undefined : "true"}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`input datefield ${className ?? ""}`}
      >
        <span>{selected ? fmtDisplay(selected) : placeholder}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--label-tertiary)", flex: "none" }}>
          <rect x="3" y="4.5" width="18" height="16" rx="3" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
      </button>

      {mounted && open && pos &&
        createPortal(
          <div
            ref={popRef}
            className="cal-pop"
            role="dialog"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 70 }}
          >
            <div className="flex items-center justify-between mb-2 px-0.5">
              <button type="button" onClick={() => shiftMonth(-1)} className="cal-nav" aria-label="Previous month">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="ios-headline">{MONTHS[view.m]} {view.y}</div>
              <button type="button" onClick={() => shiftMonth(1)} className="cal-nav" aria-label="Next month">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="cal-grid mb-0.5">
              {DOW.map((d, i) => (
                <div key={i} className="cal-dow">{d}</div>
              ))}
            </div>

            <div className="cal-grid">
              {cells.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className="cal-cell"
                  data-muted={c.muted ? "true" : undefined}
                  data-today={c.iso === todayIso ? "true" : undefined}
                  data-selected={c.iso === selected ? "true" : undefined}
                  onClick={() => pick(c.iso)}
                >
                  {c.day}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[var(--separator)]">
              <button type="button" className="link-action text-[13px]" onClick={() => pick(todayIso)}>
                Today
              </button>
              {!required && selected && (
                <button type="button" className="link-destructive text-[13px]" onClick={() => pick("")}>
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
