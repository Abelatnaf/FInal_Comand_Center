"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass w-full max-w-sm p-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          VMI FINANCE
        </div>
        <h1 className="font-display text-2xl font-semibold mb-6">Command Deck Login</h1>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="stat-label block mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input w-full"
            />
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

          {state?.error && <p className="text-text-dim text-sm">{state.error}</p>}

          <button disabled={pending} type="submit" className="btn btn-primary mt-2">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
