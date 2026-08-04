"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string } | undefined;

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${forwardedHost}`;
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/");
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }
  if (password !== confirm) {
    return { error: "Those passwords don't match." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/welcome` },
  });

  if (error) return { error: error.message };

  // Whether a session comes back depends on the project's "confirm email"
  // setting, which this code doesn't control. Handle both rather than assume:
  // an active session goes straight in, otherwise say to check the inbox.
  if (data.session) redirect("/welcome");

  return { notice: "Check your email for a confirmation link, then sign in." };
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });

  // Deliberately the same reply either way. Reporting "no account with that
  // email" would let anyone check which addresses are registered here.
  if (error && !error.message.toLowerCase().includes("user")) {
    return { error: error.message };
  }

  return { notice: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "That reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/");
}
