"use client";

import { useActionState } from "react";
import { signUp } from "@/app/login/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
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
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
        />
        <p className="text-[13px] text-faint mt-1.5">At least 8 characters.</p>
      </div>
      <div>
        <label className="section-label block mb-1.5" htmlFor="confirm_password">
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
        />
      </div>

      {state?.error && <p className="text-alarm text-[15px]">{state.error}</p>}
      {state?.notice && <p className="text-positive text-[15px]">{state.notice}</p>}

      <button disabled={pending} type="submit" className="btn btn-primary w-full mt-2">
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-[13px] text-faint text-center mt-1">
        By creating an account you agree to the Terms and Privacy Policy.
      </p>
    </form>
  );
}
