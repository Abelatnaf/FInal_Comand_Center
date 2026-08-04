"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TermState = { error?: string; success?: boolean } | undefined;

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

  const { error } = await supabase
    .from("terms")
    .insert({ user_id: user.id, name, starts_on: startsOn, ends_on: endsOn });

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

  const { error } = await supabase
    .from("terms")
    .update({ name, starts_on: startsOn, ends_on: endsOn })
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
