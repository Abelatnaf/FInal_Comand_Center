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
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-[248px] md:flex-col md:shrink-0 border-r border-[var(--separator)] px-3 py-6 gap-0.5">
        <div className="px-3 pb-5">
          <div className="ios-headline">VMI Finance</div>
          <div className="ios-caption text-text-dim mt-0.5">Command Center</div>
        </div>
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "px-3 py-2 rounded-[8px] text-[15px] transition-colors",
                active
                  ? "bg-[rgba(10,132,255,0.16)] text-tint font-medium"
                  : "text-text hover:bg-white/[0.05]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <form action={onSignOut} className="mt-auto pt-4">
          <button
            type="submit"
            className="px-3 py-2 rounded-[8px] text-[15px] text-text-dim hover:text-text w-full text-left"
          >
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex-1 min-w-0">
        <main className="max-w-[1180px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-32 md:pb-12">{children}</main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 material border-t border-[var(--separator)] flex items-stretch"
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
                "flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5",
                active ? "text-tint" : "text-[color:var(--gray)]"
              )}
            >
              <Icon size={26} />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cx(
            "flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5",
            moreOpen || moreLinks.some((l) => l.href === pathname) ? "text-tint" : "text-[color:var(--gray)]"
          )}
        >
          <MoreIcon size={26} />
          <span className="text-[10px] font-medium tracking-tight">More</span>
        </button>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative material rounded-t-[16px] w-full p-2 pb-8 max-h-[74vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-[var(--gray2)] mx-auto mt-2 mb-3" />
            <div className="flex flex-col">
              {moreLinks.map((link, i) => (
                <div key={link.href}>
                  {i > 0 && <div className="h-px bg-[var(--separator)] ml-4" />}
                  <Link
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={cx(
                      "block px-4 py-3 text-[17px]",
                      pathname === link.href ? "text-tint font-medium" : "text-text"
                    )}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
              <div className="h-px bg-[var(--separator)] ml-4" />
              <form action={onSignOut}>
                <button type="submit" className="block px-4 py-3 text-[17px] text-red w-full text-left">
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
