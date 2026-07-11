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
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <div className="eyebrow mb-2">
          <span className="dot" />
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-[32px] md:text-[42px] font-semibold">{title}</h1>
      {subtitle && <p className="text-text-dim text-[15px] mt-1">{subtitle}</p>}
    </div>
  );
}
