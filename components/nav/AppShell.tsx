"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav-links";
import { QuickAddFab } from "../QuickAddFab";
import { InstallPrompt } from "../InstallPrompt";
import { NavIcon } from "./icons";
import { PullToRefresh } from "../ui/PullToRefresh";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({
  children,
  onSignOut,
  categories,
  accounts,
  email,
  mainCurrency,
  secondaryCurrency,
  fxRate,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  email: string | null;
  mainCurrency: string;
  secondaryCurrency: string | null;
  fxRate: number | null;
}) {
  const pathname = usePathname();
  const initial = (email?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen md:flex bg-[var(--bg)]">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-[230px] md:flex-col md:shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--separator)] px-3 py-5">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] transition-colors",
                  active ? "bg-[var(--blue)] text-white font-medium" : "text-text hover:bg-[var(--fill-quaternary)]"
                )}
              >
                <span className={active ? "text-white" : "text-text-dim"}>
                  <NavIcon href={link.href} size={19} />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <form action={onSignOut}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-[9px] text-[15px] text-text-dim hover:text-text hover:bg-[var(--fill-quaternary)] transition-colors"
            >
              Sign out
            </button>
          </form>
          <div className="stat-label px-3 pt-3 flex items-center gap-2 flex-wrap">
            <span>© 2026 Command Deck</span>
            <Link href="/privacy" className="hover:text-text-dim transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text-dim transition-colors">
              Terms
            </Link>
          </div>
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

        <main className="max-w-[1000px] mx-auto px-5 md:px-8 pt-6 md:pt-8 pb-28 md:pb-12">
          <PullToRefresh>{children}</PullToRefresh>
        </main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 material border-t border-[var(--separator)] flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors active:opacity-60",
                active ? "text-tint" : "text-[color:var(--gray)]"
              )}
            >
              <NavIcon href={link.href} size={25} />
              <span className="text-[10px] font-medium tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <InstallPrompt />
      <QuickAddFab
        categories={categories}
        accounts={accounts}
        mainCurrency={mainCurrency}
        secondaryCurrency={secondaryCurrency}
        fxRate={fxRate}
      />
    </div>
  );
}
