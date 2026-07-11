"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export type SignUpState = { error?: string; confirmEmail?: boolean } | undefined;

export async function signUp(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Re-check server-side right before creating the account — the account
  // creation form only ever exists to bootstrap the single VMI account, so
  // this must stay locked once that account exists, not just hidden in the UI.
  const { data: canSignUp, error: gateError } = await supabase.rpc("can_create_first_account");
  if (gateError || !canSignUp) {
    return { error: "An account already exists. Please sign in instead." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { confirmEmail: true };
  }

  redirect("/");
}
