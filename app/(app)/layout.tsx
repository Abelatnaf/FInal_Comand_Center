import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ data: categories }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("settings").select("fx_rate").eq("id", 1).single(),
  ]);

  return (
    <AppShell onSignOut={signOut} categories={categories ?? []} fxRate={settings?.fx_rate ?? 180}>
      {children}
    </AppShell>
  );
}
