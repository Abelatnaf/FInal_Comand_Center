import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";

export const metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      subtitle="Pick something you'll remember. You'll stay signed in after this."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
