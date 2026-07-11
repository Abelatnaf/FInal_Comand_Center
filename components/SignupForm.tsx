"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/login/actions";

export function SignupForm() {
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, undefined);

  if (signUpState?.confirmEmail) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold mb-4">Check Your Email</h1>
        <p className="text-text-dim text-sm">
          Your account was created. Confirm it via the link we just emailed you, then sign in.
        </p>
        <Link href="/login" className="btn btn-primary mt-6 inline-block">
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold mb-6">Create Your Account</h1>

      <form action={signUpAction} className="flex flex-col gap-4">
        <div>
          <label className="stat-label block mb-1.5" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input w-full"
          />
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

        {signUpState?.error && <p className="text-text-dim text-sm">{signUpState.error}</p>}

        <button disabled={signUpPending} type="submit" className="btn btn-primary mt-2">
          {signUpPending ? "Creating…" : "Create account"}
        </button>
      </form>

      <Link href="/login" className="block text-text-dim hover:text-text text-sm mt-5">
        Already have an account? Sign in
      </Link>
    </>
  );
}
