"use client";

import Link from "next/link";
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
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="section-label" htmlFor="password">
            Password
          </label>
          <Link href="/forgot-password" className="text-[13px] text-accent">
            Forgot?
          </Link>
        </div>
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
