"use client";

import { useActionState, useState } from "react";
import { login, signUp } from "@/app/login/actions";

export function LoginForm({ canSignUp }: { canSignUp: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, undefined);

  if (mode === "signup" && canSignUp && !signUpState?.confirmEmail) {
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

        <button
          type="button"
          onClick={() => setMode("signin")}
          className="text-text-dim hover:text-text text-sm mt-5"
        >
          Already have an account? Sign in
        </button>
      </>
    );
  }

  if (signUpState?.confirmEmail) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold mb-4">Check Your Email</h1>
        <p className="text-text-dim text-sm">
          Your account was created. Confirm it via the link we just emailed you, then sign in below.
        </p>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="btn btn-primary mt-6"
        >
          Go to sign in
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold mb-6">Command Deck Login</h1>

      <form action={loginAction} className="flex flex-col gap-4">
        <div>
          <label className="stat-label block mb-1.5" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input w-full" />
        </div>
        <div>
          <label className="stat-label block mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input w-full"
          />
        </div>

        {loginState?.error && <p className="text-text-dim text-sm">{loginState.error}</p>}

        <button disabled={loginPending} type="submit" className="btn btn-primary mt-2">
          {loginPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {canSignUp && (
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="text-text-dim hover:text-text text-sm mt-5"
        >
          First time here? Create your account
        </button>
      )}
    </>
  );
}
