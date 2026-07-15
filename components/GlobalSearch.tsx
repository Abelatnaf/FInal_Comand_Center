"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/app/(app)/search-actions";
import { NAV_LINKS } from "@/components/nav/nav-links";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K opens (or closes) the launcher from anywhere in the app —
  // a global shortcut always wins over whatever's focused, matching how
  // command palettes behave everywhere else.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const r = await globalSearch(query);
      setResults(r);
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function goTo(href: string) {
    close();
    router.push(href);
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  const q = query.trim().toLowerCase();
  const pageMatches = NAV_LINKS.filter((l) => l.label.toLowerCase().includes(q));
  const showEmptyState = !loading && q.length < 2 && pageMatches.length === 0;
  const showNoResults = !loading && q.length >= 2 && results.length === 0 && pageMatches.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="hidden md:flex fixed top-2.5 right-24 z-30 items-center gap-2 px-3 py-1.5 rounded-full text-text-dim hover:text-text hover:bg-[var(--fill-quaternary)] transition-colors"
      >
        <SearchIcon size={16} />
        <span className="text-[13px]">Search</span>
        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-[5px] bg-[var(--fill-tertiary)] text-text-dim">⌘K</span>
      </button>

      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="md:hidden fixed bottom-24 left-5 z-40 w-12 h-12 rounded-full material border border-[var(--separator)] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.18)] active:opacity-80 active:scale-90 transition-[opacity,transform] duration-150"
      >
        <SearchIcon size={19} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh] anim-backdrop"
          onClick={close}
        >
          <div
            className="material w-full max-w-lg rounded-[16px] overflow-hidden max-h-[70vh] flex flex-col anim-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--separator)]">
              <SearchIcon size={17} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search transactions, income, categories, goals…"
                className="flex-1 bg-transparent outline-none text-[15px] text-text placeholder:text-text-dim"
              />
              <button onClick={close} className="text-text-dim text-[13px]">
                Cancel
              </button>
            </div>

            <div className="overflow-y-auto">
              {pageMatches.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 stat-label">Pages</div>
                  {pageMatches.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => goTo(l.href)}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--fill-quaternary)] transition-colors active:bg-[var(--fill-tertiary)]"
                    >
                      <span className="text-[15px] text-text truncate">{l.label}</span>
                      <span className="text-[12px] text-text-dim whitespace-nowrap">Go to</span>
                    </Link>
                  ))}
                </div>
              )}
              {loading && <div className="px-4 py-6 text-center text-text-dim text-sm">Searching…</div>}
              {showNoResults && (
                <div className="px-4 py-6 text-center text-text-dim text-sm">No matches for &quot;{query}&quot;.</div>
              )}
              {showEmptyState && (
                <div className="px-4 py-6 text-center text-text-dim text-sm">Type at least 2 characters to search, or a page name to jump straight there.</div>
              )}
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="px-4 pt-3 pb-1 stat-label">{type}</div>
                  {items.map((r) => (
                    <Link
                      key={`${r.type}-${r.id}`}
                      href={r.href}
                      onClick={() => goTo(r.href)}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--fill-quaternary)] transition-colors active:bg-[var(--fill-tertiary)]"
                    >
                      <span className="text-[15px] text-text truncate">{r.label}</span>
                      <span className="text-[12px] text-text-dim whitespace-nowrap num">{r.sublabel}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
