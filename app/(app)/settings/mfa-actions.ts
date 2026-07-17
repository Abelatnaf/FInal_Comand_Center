"use server";

import { createClient } from "@/lib/supabase/server";

export async function listMfaFactors() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { error: error.message };
  return { factors: data.totp };
}

export async function enrollMfa() {
  const supabase = await createClient();

  // Clean up any abandoned enrollment attempts (QR shown, never verified)
  // before starting a fresh one — otherwise a second enroll() call can
  // collide with a stale unverified factor from a previous attempt.
  // listFactors()'s `.totp` array is typed as verified-only (a simplification
  // in the SDK's types, not actually true at runtime), so `.all` is used
  // here instead to see unverified factors too.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const f of existing?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) return { error: error.message };
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyMfaEnrollment(factorId: string, code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: error.message };
  return { success: true };
}

export async function unenrollMfa(factorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };
  return { success: true };
}
