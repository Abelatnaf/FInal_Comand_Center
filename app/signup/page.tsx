import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/SignupForm";
import { AuthTabs } from "@/components/AuthTabs";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: canSignUp } = await supabase.rpc("can_create_first_account");

  if (!canSignUp) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass w-full max-w-sm p-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          VMI FINANCE
        </div>
        <AuthTabs active="signup" />
        <SignupForm />
      </div>
    </div>
  );
}
