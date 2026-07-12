import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ data: categories }, { data: settings }, { data: userData }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("settings").select("fx_rate").single(),
    supabase.auth.getUser(),
  ]);

  return (
    <AppShell
      onSignOut={signOut}
      categories={categories ?? []}
      fxRate={settings?.fx_rate ?? 1}
      email={userData?.user?.email ?? null}
    >
      {children}
    </AppShell>
  );
}
