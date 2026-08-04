"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type TermState = { error?: string; success?: boolean } | undefined;

/**
 * What you want left over when the term ends. Blank means zero -- the app then
 * paces you to exactly $0 on the last day, which is the old behaviour and a
 * legitimate choice, just not a good default to assume silently.
 */
function readTarget(formData: FormData): bigint | { error: string } {
  const raw = String(formData.get("target_end_balance") ?? "").trim();
  if (!raw) return 0n;
  try {
    const minor = toMinor(raw);
    if (minor < 0n) return { error: "A leftover target can't be negative." };
    return minor;
  } catch {
    return { error: "Enter a leftover target like 400 or 400.00." };
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/semesters");
  revalidatePath("/budgets");
  revalidatePath("/reports");
  revalidatePath("/meal-plan");
}

export async function createTerm(_prev: TermState, formData: FormData): Promise<TermState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const startsOn = String(formData.get("starts_on") ?? "");
  const endsOn = String(formData.get("ends_on") ?? "");

  if (!name) return { error: "Give the term a name, like “Fall 2026”." };
  if (!startsOn || !endsOn) return { error: "Pick a start and an end date." };
  if (endsOn <= startsOn) return { error: "The end date has to come after the start date." };

  // Overlapping terms would make "which term am I in" ambiguous, and the home
  // screen picks exactly one.
  const { data: clash } = await supabase
    .from("terms")
    .select("name")
    .eq("is_archived", false)
    .lte("starts_on", endsOn)
    .gte("ends_on", startsOn)
    .limit(1);

  if (clash && clash.length > 0) {
    return { error: `Those dates overlap “${clash[0].name}”. Adjust them or archive that term first.` };
  }

  const target = readTarget(formData);
  if (typeof target === "object") return target;

  const { error } = await supabase.from("terms").insert({
    user_id: user.id,
    name,
    starts_on: startsOn,
    ends_on: endsOn,
    target_end_balance_minor: Number(target),
  });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function updateTerm(_prev: TermState, formData: FormData): Promise<TermState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startsOn = String(formData.get("starts_on") ?? "");
  const endsOn = String(formData.get("ends_on") ?? "");

  if (!id) return { error: "Missing term." };
  if (!name) return { error: "Give the term a name." };
  if (endsOn <= startsOn) return { error: "The end date has to come after the start date." };

  const target = readTarget(formData);
  if (typeof target === "object") return target;

  const { error } = await supabase
    .from("terms")
    .update({
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      target_end_balance_minor: Number(target),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function setTermArchived(id: string, archived: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("terms").update({ is_archived: archived }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteTerm(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("terms").delete().eq("id", id);
  if (error) {
    // Meal plans cascade with the term, but say so rather than silently
    // dropping someone's swipe history.
    return { error: "Couldn't delete that term. Archive it instead to keep its history." };
  }
  revalidateAll();
  return {};
}
