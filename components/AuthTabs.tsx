import Link from "next/link";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  return (
    <div className="flex gap-1 mb-6 p-1 bg-[var(--surface-secondary)] rounded-[10px]">
      <Link
        href="/login"
        className={`flex-1 py-1.5 rounded-[8px] text-sm font-medium text-center transition-colors ${
          active === "login" ? "bg-white/[0.16] text-text" : "text-text-dim"
        }`}
      >
        Log In
      </Link>
      <Link
        href="/signup"
        className={`flex-1 py-1.5 rounded-[8px] text-sm font-medium text-center transition-colors ${
          active === "signup" ? "bg-white/[0.16] text-text" : "text-text-dim"
        }`}
      >
        Sign Up
      </Link>
    </div>
  );
}
