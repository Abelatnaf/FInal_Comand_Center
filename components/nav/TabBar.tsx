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
        const isAdd = link.href === "/add";

        // Add gets the raised treatment: it is the action the whole app is
        // built around, and giving it its own affordance keeps the ≤3-tap
        // logging promise obvious rather than buried among four equals.
        return (
          <Link key={link.href} href={link.href} data-active={active} aria-label={link.label}>
            {isAdd ? (
              <span className="tab-add">
                <Icon className="w-6 h-6" />
              </span>
            ) : (
              <>
                <Icon className="w-6 h-6" />
                {link.label}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
