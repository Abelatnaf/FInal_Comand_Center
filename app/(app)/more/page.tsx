import Link from "next/link";
import { MORE_LINKS } from "@/components/nav/nav-links";
import { ICONS } from "@/components/nav/icons";

export default function MorePage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">More</h1>

      <div className="card">
        {MORE_LINKS.map((link) => {
          const Icon = ICONS[link.icon];
          return (
            <Link key={link.href} href={link.href} className="row row-link flex items-center gap-3">
              <span className="cat-icon" style={{ ["--cat-color" as string]: "var(--accent)" }}>
                <Icon className="w-[18px] h-[18px] text-accent" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{link.label}</span>
                <span className="block text-[13px] text-muted truncate">{link.blurb}</span>
              </span>
              <span className="text-faint" aria-hidden>
                ›
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
