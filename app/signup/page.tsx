import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Track every dollar in one place. Free, and yours alone."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
