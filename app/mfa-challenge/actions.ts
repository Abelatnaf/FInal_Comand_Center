"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MfaChallengeState = { error?: string } | undefined;

export async function verifyMfaChallenge(
  _prevState: MfaChallengeState,
  formData: FormData
): Promise<MfaChallengeState> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
