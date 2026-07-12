import Link from "next/link";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  return (
    <div className="segmented mb-6">
      <Link href="/login" data-active={active === "login"}>
        Log In
      </Link>
      <Link href="/signup" data-active={active === "signup"}>
        Sign Up
      </Link>
    </div>
  );
}
