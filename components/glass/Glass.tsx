import { HTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Glass({
  className,
  dense,
  ...props
}: HTMLAttributes<HTMLDivElement> & { dense?: boolean }) {
  return <div className={cx(dense ? "glass-dense" : "glass", className)} {...props} />;
}

export function PageHeader({
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="ios-large-title">{title}</h1>
      {subtitle && <p className="ios-subhead text-text-dim mt-1">{subtitle}</p>}
    </div>
  );
}
