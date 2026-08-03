"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/app/login/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <div>
        <label className="section-label block mb-1.5" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>

      {state?.error && <p className="text-alarm text-[15px]">{state.error}</p>}
      {state?.notice && <p className="text-positive text-[15px]">{state.notice}</p>}

      <button disabled={pending} type="submit" className="btn btn-primary w-full mt-2">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <div>
        <label className="section-label block mb-1.5" htmlFor="password">
          New password
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
      </div>
      <div>
        <label className="section-label block mb-1.5" htmlFor="confirm_password">
          Confirm new password
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

      <button disabled={pending} type="submit" className="btn btn-primary w-full mt-2">
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
