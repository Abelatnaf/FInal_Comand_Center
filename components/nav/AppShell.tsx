"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "./nav-links";
import { QuickAddFab } from "../QuickAddFab";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({
  children,
  onSignOut,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-[240px] md:flex-col md:shrink-0 border-r border-white/[0.06] px-5 py-8 gap-1">
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
                "px-3 py-2.5 rounded-xl text-[14px] transition-colors",
                active
                  ? "bg-white/[0.07] text-silver font-medium"
                  : "text-text-dim hover:text-text hover:bg-white/[0.03]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <form action={onSignOut} className="mt-auto pt-4">
          <button
            type="submit"
            className="px-3 py-2.5 rounded-xl text-[14px] text-text-faint hover:text-text-dim w-full text-left"
          >
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="eyebrow">
            <span className="dot" />
            VMI FINANCE
          </div>
          <button
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="text-text-dim text-sm px-3 py-1.5 rounded-lg border border-white/10"
          >
            Menu
          </button>
        </header>

        {menuOpen && (
          <nav className="md:hidden glass mx-4 mt-3 p-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cx(
                  "px-3 py-2.5 rounded-xl text-[14px]",
                  pathname === link.href
                    ? "bg-white/[0.07] text-silver font-medium"
                    : "text-text-dim"
                )}
              >
                {link.label}
              </Link>
            ))}
            <form action={onSignOut}>
              <button
                type="submit"
                className="px-3 py-2.5 rounded-xl text-[14px] text-text-faint w-full text-left"
              >
                Sign out
              </button>
            </form>
          </nav>
        )}

        <main className="max-w-[1180px] mx-auto px-5 md:px-8 py-8 md:py-12 pb-28">
          {children}
        </main>
      </div>

      <QuickAddFab />
    </div>
  );
}
