"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type OnboardingInput = {
  displayName: string;
  accounts: { id: string; name: string; balance: string }[];
  budgets: { id: string; amount: string }[];
};

/**
 * Saves the whole first run in one call. Everything here is optional -- the
 * signup trigger has already provisioned usable accounts and categories, so
 * this only records what the user chose to fill in.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  for (const account of input.accounts) {
    const name = account.name.trim();
    if (!name) return { error: "Every account needs a name." };

    const raw = account.balance.trim();
    let balanceMinor = 0n;
    if (raw) {
      const negative = raw.startsWith("-");
      try {
        balanceMinor = toMinor(raw.replace(/^-/, ""));
      } catch {
        return { error: `“${raw}” isn't an amount I can read.` };
      }
      if (negative) balanceMinor = -balanceMinor;
    }

    const { error } = await supabase
      .from("accounts")
      .update({ name, opening_balance_minor: Number(balanceMinor) })
      .eq("id", account.id);
    if (error) return { error: error.message };
  }

  for (const budget of input.budgets) {
    const raw = budget.amount.trim();
    let value: number | null = null;
    if (raw) {
      try {
        value = Number(toMinor(raw));
      } catch {
        return { error: `“${raw}” isn't an amount I can read.` };
      }
    }
    const { error } = await supabase
      .from("categories")
      .update({ monthly_budget_usd_minor: value })
      .eq("id", budget.id);
    if (error) return { error: error.message };
  }

  const { error } = await supabase
    .from("settings")
    .update({
      display_name: input.displayName.trim() || null,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

/** Skipping is a real choice, not a failure -- it just marks the run done. */
export async function skipOnboarding(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("settings")
    .update({ onboarding_completed: true })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
