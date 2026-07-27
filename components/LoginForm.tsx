"use client";

import { useActionState } from "react";
import { login } from "@/app/login/actions";

export function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);

  return (
    <form action={loginAction} className="flex flex-col gap-3.5">
      <div>
        <label className="section-label block mb-1.5" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="section-label block mb-1.5" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      {loginState?.error && <p className="text-alarm text-[15px]">{loginState.error}</p>}

      <button disabled={loginPending} type="submit" className="btn btn-primary w-full mt-2">
        {loginPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
