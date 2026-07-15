"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "./nav-links";
import { QuickAddFab } from "../QuickAddFab";
import { GlobalSearch } from "../GlobalSearch";
import { InstallPrompt } from "../InstallPrompt";
import { AlertsBanner, type Alert } from "../AlertsBanner";
import { NavIcon } from "./NavIcons";
import { HomeIcon, ListIcon, IncomeIcon, MoreIcon } from "./icons";
import { PullToRefresh } from "../ui/PullToRefresh";

type Currency = { code: string; name: string; rate_to_usd: number };

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
  currencies,
  email,
  accounts,
  alerts,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
  categories: { id: number; name: string }[];
  currencies: Currency[];
  email: string | null;
  accounts: { id: string; name: string }[];
  alerts: Alert[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const initial = (email?.[0] ?? "?").toUpperCase();

  const tabHrefs = new Set<string>(TAB_ITEMS.map((t) => t.href));
  const moreLinks = NAV_LINKS.filter((l) => !tabHrefs.has(l.href));

  return (
    <div className="min-h-screen md:flex bg-[var(--bg)]">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-[250px] md:flex-col md:shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--separator)] px-3 py-5">
        <div className="flex items-center gap-2.5 px-3 pb-5">
          <div className="w-8 h-8 rounded-[9px] bg-[var(--blue)] flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18V7l8-3 8 3v11" />
              <path d="M4 18h16M9 18v-5h6v5" />
            </svg>
          </div>
          <div className="ios-headline">Command Deck</div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "flex items-center gap-3 px-3 py-2 rounded-[9px] text-[15px] transition-colors",
                  active
                    ? "bg-[var(--blue)] text-white font-medium"
                    : "text-text hover:bg-[var(--fill-quaternary)]"
                )}
              >
                <span className={active ? "text-white" : "text-text-dim"}>
                  <NavIcon href={link.href} />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          {/* Promo card */}
          <div
            className="rounded-[14px] p-4 mb-3 text-white overflow-hidden relative"
            style={{
              background:
                "radial-gradient(120% 130% at 100% 0%, rgba(78,222,163,0.35), transparent 60%), radial-gradient(90% 120% at 0% 100%, rgba(59,130,246,0.22), transparent 55%), var(--hero-bg)",
            }}
          >
            <div className="text-[15px] font-semibold">Command Center</div>
            <div className="text-[12px] mt-0.5" style={{ color: "rgba(218,226,253,0.65)" }}>
              Every dollar, in one place.
            </div>
            <Link
              href="/insights"
              className="inline-block text-[13px] font-medium mt-3 transition-opacity hover:opacity-80"
              style={{ color: "var(--blue-hover)" }}
            >
              View insights →
            </Link>
          </div>
          <form action={onSignOut}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-[9px] text-[15px] text-text-dim hover:text-text hover:bg-[var(--fill-quaternary)] transition-colors"
            >
              Sign out
            </button>
          </form>
          <div className="stat-label px-3 pt-3">© 2026 Command Deck</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Top bar (desktop) */}
        <div className="hidden md:flex items-center justify-end gap-3 px-8 h-14 border-b border-[var(--separator)] bg-[color:var(--bg)]/80 sticky top-0 z-30 backdrop-blur">
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full bg-[var(--blue)] text-white flex items-center justify-center text-[14px] font-semibold transition-transform active:scale-90 hover:opacity-90"
            aria-label="Settings"
          >
            {initial}
          </Link>
        </div>

        <main className="max-w-[1240px] mx-auto px-5 md:px-8 pt-6 md:pt-8 pb-32 md:pb-12">
          <AlertsBanner alerts={alerts} />
          <PullToRefresh>{children}</PullToRefresh>
        </main>
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
                "flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors active:opacity-60",
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
            "flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors active:opacity-60",
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
          <div className="absolute inset-0 bg-black/25 anim-backdrop" />
          <div
            className="relative material rounded-t-[16px] w-full p-2 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] max-h-[74vh] overflow-y-auto anim-sheet"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-[var(--gray3)] mx-auto mt-2 mb-3" />
            <div className="flex flex-col">
              {moreLinks.map((link, i) => (
                <div key={link.href}>
                  {i > 0 && <div className="h-px bg-[var(--separator)] ml-4" />}
                  <Link
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={cx(
                      "flex items-center gap-3 px-4 py-3 text-[17px] transition-colors active:bg-[var(--fill-quaternary)]",
                      pathname === link.href ? "text-tint font-medium" : "text-text"
                    )}
                  >
                    <span className={pathname === link.href ? "text-tint" : "text-text-dim"}>
                      <NavIcon href={link.href} size={20} />
                    </span>
                    {link.label}
                  </Link>
                </div>
              ))}
              <div className="h-px bg-[var(--separator)] ml-4" />
              <form action={onSignOut}>
                <button
                  type="submit"
                  className="block px-4 py-3 text-[17px] text-red w-full text-left transition-colors active:bg-[var(--fill-quaternary)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <GlobalSearch />
      <InstallPrompt />
      <QuickAddFab categories={categories} currencies={currencies} accounts={accounts} />
    </div>
  );
}
