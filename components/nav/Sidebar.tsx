"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_LINKS, MORE_LINKS } from "./nav-links";
import { ICONS } from "./icons";

/**
 * The wide-screen form of the navigation, shown from 1024px up in place of
 * the bottom tab bar.
 *
 * It reads from the same TAB_LINKS and MORE_LINKS the tab bar and /more use,
 * rather than keeping its own list -- two hand-maintained copies of a nav
 * would drift the first time a route is added. The only thing dropped is the
 * "More" tab itself, which exists on a phone because five slots is the limit;
 * with a full-height rail there is nothing to hide behind it.
 */
export function Sidebar() {
  const pathname = usePathname();
  const primary = TAB_LINKS.filter((l) => l.href !== "/more");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sidebar" aria-label="Main">
      <p className="sidebar-heading">Command Deck</p>

      {primary.map((link) => {
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            className="sidebar-link"
            data-active={isActive(link.href)}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {link.label}
          </Link>
        );
      })}

      <p className="section-label px-3 pt-6 pb-2">Everything else</p>

      {MORE_LINKS.map((link) => {
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            className="sidebar-link"
            data-active={isActive(link.href)}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
