import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { Category } from "@/lib/categories";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const supabase = await createClient();

  const [settingsRes, accountsRes, categoriesRes] = await Promise.all([
    supabase.from("settings").select("onboarding_completed, display_name").maybeSingle(),
    supabase.from("accounts").select("id, name, kind, opening_balance_minor").order("kind").order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived")
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("sort_order"),
  ]);

  // Already set up: this is a first-run screen, not somewhere to come back to.
  if (settingsRes.data?.onboarding_completed) redirect("/");

  return (
    <OnboardingWizard
      accounts={accountsRes.data ?? []}
      categories={(categoriesRes.data ?? []) as Category[]}
      displayName={settingsRes.data?.display_name ?? ""}
    />
  );
}
