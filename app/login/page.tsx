import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/LoginForm";
import { AuthTabs } from "@/components/AuthTabs";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: canSignUp } = await supabase.rpc("can_create_first_account");

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="glass w-full max-w-sm p-7">
        <div className="mb-6">
          <h1 className="ios-title2">VMI Finance</h1>
          <p className="ios-subhead text-text-dim mt-0.5">Command Center</p>
        </div>
        {canSignUp && <AuthTabs active="login" />}
        <LoginForm />
      </div>
    </div>
  );
}
