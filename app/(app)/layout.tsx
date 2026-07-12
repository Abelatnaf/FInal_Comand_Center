import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ data: categories }, { data: userData }, { data: accounts }, { data: currencies }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.auth.getUser(),
    supabase.from("accounts").select("id, name").order("sort_order"),
    supabase.from("currencies").select("code, name, rate_to_usd").order("code"),
  ]);

  return (
    <AppShell
      onSignOut={signOut}
      categories={categories ?? []}
      currencies={currencies ?? []}
      email={userData?.user?.email ?? null}
      accounts={accounts ?? []}
    >
      {children}
    </AppShell>
  );
}
