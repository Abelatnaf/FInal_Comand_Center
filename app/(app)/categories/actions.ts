"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";
import { isCategoryColor } from "@/lib/categories";

function revalidateAffected() {
  revalidatePath("/");
  revalidatePath("/budgets");
  revalidatePath("/insights");
  revalidatePath("/ledger");
  revalidatePath("/settings");
  revalidatePath("/add");
}

/**
 * Budgets are stored in USD minor units — the only figure comparable across
 * this app's two currencies, and the unit budget_status measures spending in.
 * A blank input clears the budget rather than setting it to zero: "no budget"
 * and "a budget of nothing" are different states.
 */
export async function setCategoryBudget(
  categoryId: string,
  amount: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const trimmed = amount.trim();

  let minor: number | null = null;
  if (trimmed !== "") {
    try {
      minor = Number(toMinor(trimmed));
    } catch {
      return { error: "Enter a plain amount like 250 or 250.00." };
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({ budget_usd_minor: minor })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "expense");
  const color = String(formData.get("color") ?? "slate");
  const icon = String(formData.get("icon") ?? "").trim() || "📦";

  if (!name) return { error: "Give the category a name." };
  if (kind !== "expense" && kind !== "income") return { error: "Pick spending or income." };
  if (!isCategoryColor(color)) return { error: "Pick a colour." };

  // Sits after everything currently in its kind, rather than at a fixed
  // position, so a new category doesn't jump ahead of established ones.
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    kind,
    color,
    icon,
    sort_order: (last?.sort_order ?? 0) + 10,
  });

  if (error) {
    if (error.code === "23505") return { error: `You already have a ${kind} category called "${name}".` };
    return { error: error.message };
  }

  revalidateAffected();
  return {};
}

export async function updateCategory(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "slate");
  const icon = String(formData.get("icon") ?? "").trim() || "📦";

  if (!id) return { error: "Missing category." };
  if (!name) return { error: "Give the category a name." };
  if (!isCategoryColor(color)) return { error: "Pick a colour." };

  // Renaming is safe: transactions reference the category by id, so history
  // follows the rename rather than being orphaned by it.
  const { error } = await supabase.from("categories").update({ name, color, icon }).eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: `You already have a category called "${name}".` };
    return { error: error.message };
  }

  revalidateAffected();
  return {};
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ is_archived: archived }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/**
 * Hard delete, only when nothing references the category. Archiving is the
 * safe default offered in the UI — deleting one that has history would set
 * those transactions' category_id to null and silently strip the label off
 * entries the user already reconciled.
 */
export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      error: `${count} ${count === 1 ? "entry uses" : "entries use"} this category. Archive it instead — that hides it from new entries without touching your history.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}
