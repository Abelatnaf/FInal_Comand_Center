"use client";

import { useActionState } from "react";
import { login } from "@/app/login/actions";

export function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);

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
    </>
  );
}
