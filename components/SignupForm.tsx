"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/login/actions";

export function SignupForm() {
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, undefined);

  if (signUpState?.confirmEmail) {
    return (
      <div className="text-center">
        <h1 className="ios-title2 mb-2">Check your email</h1>
        <p className="ios-subhead text-text-dim">
          Your account was created. Confirm it via the link we just emailed you, then sign in.
        </p>
        <Link href="/login" className="btn btn-primary w-full !py-3 !text-[17px] mt-6 inline-block text-center">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form action={signUpAction} className="flex flex-col gap-3.5">
      <div>
        <label className="stat-label block mb-1.5" htmlFor="signup-email">
          Email
        </label>
        <input id="signup-email" name="email" type="email" autoComplete="email" required className="input w-full" />
      </div>
      <div>
        <label className="stat-label block mb-1.5" htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input w-full"
        />
      </div>
      <div>
        <label className="stat-label block mb-1.5" htmlFor="signup-confirm">
          Confirm Password
        </label>
        <input
          id="signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input w-full"
        />
      </div>

      {signUpState?.error && <p className="text-red text-[15px]">{signUpState.error}</p>}

      <button disabled={signUpPending} type="submit" className="btn btn-primary w-full !py-3 !text-[17px] mt-2">
        {signUpPending ? "Creating…" : "Create Account"}
      </button>
    </form>
  );
}
