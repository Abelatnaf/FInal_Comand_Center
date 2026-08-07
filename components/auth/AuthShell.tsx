import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="card p-7">
          {/* A nameplate rather than a form label: the wordmark, an italic
              tagline underneath it the way a newspaper runs its own motto
              under the masthead, then a rule closing it off before the
              actual form starts. */}
          <div className="mb-6 pb-5 border-b border-border text-center">
            <h1 className="page-title">{title}</h1>
            <p className="tagline text-[15px] text-faint mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
        {footer && <div className="text-center text-[14px] text-muted mt-5">{footer}</div>}
        <p className="text-center text-[13px] text-faint mt-6">
          <Link href="/privacy" className="hover:text-muted">
            Privacy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-muted">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
