"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { enrollMfa, verifyMfaEnrollment, unenrollMfa } from "@/app/(app)/settings/mfa-actions";

type Factor = { id: string; status: string };

export function MfaSettings({ initialFactors }: { initialFactors: Factor[] }) {
  const [factors, setFactors] = useState(initialFactors);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const verifiedFactor = factors.find((f) => f.status === "verified");

  function handleEnable() {
    setError(null);
    startTransition(async () => {
      const res = await enrollMfa();
      if ("error" in res) {
        setError(res.error ?? "Couldn't start enrollment.");
        return;
      }
      setEnrolling(res);
      setCode("");
    });
  }

  function handleVerify() {
    if (!enrolling) return;
    setError(null);
    startTransition(async () => {
      const res = await verifyMfaEnrollment(enrolling.factorId, code.trim());
      if (res?.error) {
        setError(res.error);
        return;
      }
      setFactors((prev) => [...prev.filter((f) => f.id !== enrolling.factorId), { id: enrolling.factorId, status: "verified" }]);
      setEnrolling(null);
      setCode("");
    });
  }

  function handleCancel() {
    if (!enrolling) return;
    const factorId = enrolling.factorId;
    setEnrolling(null);
    setCode("");
    setError(null);
    // Best-effort cleanup of the abandoned unverified factor — not
    // essential (the next Enable click sweeps stale ones anyway), but
    // avoids leaving one lying around if they never come back.
    startTransition(async () => {
      await unenrollMfa(factorId);
    });
  }

  function handleRemove() {
    if (!verifiedFactor) return;
    if (!confirm("Remove two-factor authentication? You'll only need your password to sign in after this.")) return;
    setError(null);
    startTransition(async () => {
      const res = await unenrollMfa(verifiedFactor.id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setFactors((prev) => prev.filter((f) => f.id !== verifiedFactor.id));
    });
  }

  return (
    <Glass className="p-6 max-w-xl">
      <div className="ios-headline mb-1">Two-Factor Authentication</div>
      <p className="text-text-dim ios-subhead mb-4">
        Require a code from an authenticator app (like Google Authenticator or 1Password) in addition to your
        password when signing in.
      </p>

      {enrolling ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from Supabase, not an optimizable remote image */}
            <img src={enrolling.qrCode} alt="Scan this QR code with your authenticator app" width={160} height={160} className="rounded-[12px] bg-white p-2 shrink-0" />
            <div className="min-w-0">
              <p className="ios-footnote text-text-dim mb-1">
                Scan with your authenticator app, or enter this code manually:
              </p>
              <code className="num text-[13px] text-text break-all">{enrolling.secret}</code>
            </div>
          </div>

          <div>
            <label className="stat-label block mb-1.5">Enter the 6-digit code to confirm</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="input w-full max-w-[160px] text-center tracking-[0.3em]"
              autoFocus
            />
          </div>

          {error && <p className="text-[var(--red)] text-[13px]">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleVerify} disabled={pending || code.trim().length !== 6} className="btn btn-primary text-sm">
              {pending ? "Verifying…" : "Verify & Enable"}
            </button>
            <button onClick={handleCancel} disabled={pending} className="btn text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : verifiedFactor ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
            <span className="ios-subhead text-text">Two-factor authentication is on.</span>
          </div>
          <button onClick={handleRemove} disabled={pending} className="link-destructive text-sm">
            {pending ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : (
        <div>
          {error && <p className="text-[var(--red)] text-[13px] mb-3">{error}</p>}
          <button onClick={handleEnable} disabled={pending} className="btn text-sm">
            {pending ? "Starting…" : "Enable Two-Factor Authentication"}
          </button>
        </div>
      )}
    </Glass>
  );
}
