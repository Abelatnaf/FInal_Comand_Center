import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: canSignUp } = await supabase.rpc("can_create_first_account");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass w-full max-w-sm p-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          VMI FINANCE
        </div>
        <LoginForm canSignUp={canSignUp ?? false} />
      </div>
    </div>
  );
}
