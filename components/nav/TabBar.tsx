"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_LINKS } from "./nav-links";
import { ICONS } from "./icons";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      {TAB_LINKS.map((link) => {
        const Icon = ICONS[link.icon];
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} data-active={active}>
            <Icon className="w-6 h-6" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
