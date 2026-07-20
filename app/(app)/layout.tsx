import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ data: categories }, { data: userData }, { data: accounts }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.auth.getUser(),
    supabase.from("accounts").select("id, name").order("sort_order"),
  ]);

  return (
    <AppShell onSignOut={signOut} categories={categories ?? []} email={userData?.user?.email ?? null} accounts={accounts ?? []}>
      {children}
    </AppShell>
  );
}
