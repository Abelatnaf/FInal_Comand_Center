"use client";

import { useActionState } from "react";
import { login } from "@/app/login/actions";

export function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);

  return (
    <form action={loginAction} className="flex flex-col gap-3.5">
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

      {loginState?.error && <p className="text-red text-[15px]">{loginState.error}</p>}

      <button disabled={loginPending} type="submit" className="btn btn-primary w-full !py-3 !text-[17px] mt-2">
        {loginPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
