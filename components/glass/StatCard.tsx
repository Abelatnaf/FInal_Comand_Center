import { Glass } from "./Glass";

export function StatCard({
  label,
  value,
  delta,
  badge,
  className,
  size = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  badge?: string;
  className?: string;
  size?: "default" | "small";
}) {
  return (
    <Glass
      className={`flex flex-col justify-between ${
        size === "small" ? "p-5 min-h-[140px]" : "p-6 min-h-[220px]"
      } ${className ?? ""}`}
    >
      <div>
        <div className="stat-label">{label}</div>
        <div className={`stat-value mt-2 ${size === "small" ? "!text-[22px]" : ""}`}>{value}</div>
        {delta && <div className="text-text-dim text-xs mt-1.5 num">{delta}</div>}
      </div>
      {badge && <div className="badge mt-4">{badge}</div>}
    </Glass>
  );
}
