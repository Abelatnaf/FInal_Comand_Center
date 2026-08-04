"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type LoanState = { error?: string; success?: boolean } | undefined;

export async function addLoan(_prev: LoanState, formData: FormData): Promise<LoanState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const servicer = String(formData.get("servicer") ?? "").trim() || null;
  const termId = String(formData.get("term_id") ?? "") || null;
  const principalRaw = String(formData.get("principal") ?? "").trim();
  const rateRaw = String(formData.get("interest_rate") ?? "").trim();
  const isSubsidized = String(formData.get("is_subsidized") ?? "") === "true";
  const disbursedOn = String(formData.get("disbursed_on") ?? "");

  if (!name) return { error: "Name the loan, e.g. “Unsubsidized Stafford”." };
  if (!disbursedOn) return { error: "When was it disbursed?" };

  let principal: bigint;
  try {
    principal = toMinor(principalRaw);
  } catch {
    return { error: "Enter the amount borrowed, like 5500." };
  }
  if (principal <= 0n) return { error: "The amount has to be greater than zero." };

  // Rates are stored in basis points so no float ever touches one.
  let rateBp = 0;
  if (rateRaw) {
    const parsed = Number(rateRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return { error: "Enter the rate as a percentage, like 5.5." };
    }
    rateBp = Math.round(parsed * 100);
  }

  const { error } = await supabase.from("student_loans").insert({
    user_id: user.id,
    name,
    servicer,
    term_id: termId,
    principal_minor: Number(principal),
    interest_rate_bp: rateBp,
    is_subsidized: isSubsidized,
    disbursed_on: disbursedOn,
  });

  if (error) return { error: error.message };
  revalidatePath("/loans");
  return { success: true };
}

export async function deleteLoan(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("student_loans").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/loans");
  return {};
}
