import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "@/components/MfaChallengeForm";

export default async function MfaChallengePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.nextLevel === aal.currentLevel) {
    // Nothing pending (already stepped up, or no factor enrolled) —
    // nothing to challenge here.
    redirect("/");
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const factor = factorsData?.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="glass w-full max-w-sm p-7">
        <div className="mb-6">
          <h1 className="ios-title2">Two-Factor Authentication</h1>
          <p className="ios-subhead text-text-dim mt-0.5">Enter the 6-digit code from your authenticator app.</p>
        </div>
        <MfaChallengeForm factorId={factor.id} />
      </div>
    </div>
  );
}
