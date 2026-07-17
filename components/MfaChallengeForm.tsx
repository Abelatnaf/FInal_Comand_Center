"use client";

import { useActionState } from "react";
import { verifyMfaChallenge } from "@/app/mfa-challenge/actions";

export function MfaChallengeForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(verifyMfaChallenge, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="factorId" value={factorId} />
      <div>
        <label className="stat-label block mb-1.5" htmlFor="mfa-code">
          Authentication Code
        </label>
        <input
          id="mfa-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          className="input w-full text-center tracking-[0.3em] text-lg"
        />
      </div>

      {state?.error && <p className="text-red text-[15px]">{state.error}</p>}

      <button disabled={pending} type="submit" className="btn btn-primary w-full !py-3 !text-[17px] mt-2">
        {pending ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
