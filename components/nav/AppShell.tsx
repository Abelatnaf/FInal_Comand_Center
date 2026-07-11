"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "./nav-links";
import { QuickAddFab } from "../QuickAddFab";
import { HomeIcon, ListIcon, IncomeIcon, MoreIcon } from "./icons";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TAB_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/transactions", label: "Transactions", Icon: ListIcon },
  { href: "/income", label: "Income", Icon: IncomeIcon },
] as const;

export function AppShell({
  children,
  onSignOut,
  categories,
  fxRate,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
  categories: { id: number; name: string }[];
  fxRate: number;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabHrefs = new Set<string>(TAB_ITEMS.map((t) => t.href));
  const moreLinks = NAV_LINKS.filter((l) => !tabHrefs.has(l.href));

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-[240px] md:flex-col md:shrink-0 border-r border-[var(--divider)] px-5 py-8 gap-1">
        <div className="eyebrow mb-8 px-2">
          <span className="dot" />
          VMI FINANCE
        </div>
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "px-3 py-2.5 rounded-[8px] text-[14px] transition-colors",
                active
                  ? "bg-[rgba(10,132,255,0.16)] text-tint font-medium"
                  : "text-text-dim hover:text-text hover:bg-white/[0.05]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <form action={onSignOut} className="mt-auto pt-4">
          <button
            type="submit"
            className="px-3 py-2.5 rounded-[8px] text-[14px] text-text-dim hover:text-text w-full text-left"
          >
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center px-5 py-4 border-b border-[var(--divider)]">
          <div className="eyebrow">
            <span className="dot" />
            VMI FINANCE
          </div>
        </header>

        <main className="max-w-[1180px] mx-auto px-5 md:px-8 py-8 md:py-12 pb-28 md:pb-12">{children}</main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass !rounded-none !border-x-0 !border-b-0 flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TAB_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={cx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2",
                active ? "text-tint" : "text-text-dim"
              )}
            >
              <Icon />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2",
            moreOpen || moreLinks.some((l) => l.href === pathname) ? "text-tint" : "text-text-dim"
          )}
        >
          <MoreIcon />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative glass w-full !rounded-b-none p-4 pb-8 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <div className="flex flex-col gap-1">
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={cx(
                    "px-3 py-3 rounded-[8px] text-[15px]",
                    pathname === link.href ? "bg-[rgba(10,132,255,0.16)] text-tint font-medium" : "text-text"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <form action={onSignOut}>
                <button
                  type="submit"
                  className="px-3 py-3 rounded-[8px] text-[15px] text-text-dim w-full text-left"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <QuickAddFab categories={categories} fxRate={fxRate} />
    </div>
  );
}
