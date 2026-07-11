import Link from "next/link";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  return (
    <div className="flex gap-2 mb-6">
      <Link
        href="/login"
        className={`btn flex-1 !py-2 text-center ${active === "login" ? "btn-primary" : ""}`}
      >
        Log In
      </Link>
      <Link
        href="/signup"
        className={`btn flex-1 !py-2 text-center ${active === "signup" ? "btn-primary" : ""}`}
      >
        Sign Up
      </Link>
    </div>
  );
}
