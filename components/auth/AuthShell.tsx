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
          <div className="mb-6">
            <h1 className="page-title">{title}</h1>
            <p className="text-[15px] text-muted mt-0.5">{subtitle}</p>
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
