import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Command Deck"
      subtitle="Every expense, in one place."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-accent font-medium">
            Create an account
          </Link>
        </>
      }
    >
      {error === "link_expired" && (
        <p className="text-alarm text-[15px] mb-4">
          That link has expired or was already used. Request a new one below.
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
