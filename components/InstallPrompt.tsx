"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "install_prompt_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(DISMISS_KEY) === "true";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || alreadyDismissed) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) setShowIosTip(true);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "true");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (dismissed || (!deferred && !showIosTip)) return null;

  return (
    <div
      className="md:hidden fixed left-4 right-4 z-40 material rounded-[14px] border border-[var(--separator)] shadow-[0_8px_24px_rgba(0,0,0,0.25)] p-3.5 flex items-center gap-3 anim-modal"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
    >
      <div className="w-9 h-9 rounded-[9px] bg-[var(--blue)] flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18V7l8-3 8 3v11" />
          <path d="M4 18h16M9 18v-5h6v5" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-text">Install Command Deck</div>
        <div className="text-[12px] text-text-dim">
          {deferred ? "Add it to your home screen for quicker access." : 'Tap the Share icon, then "Add to Home Screen."'}
        </div>
      </div>
      {deferred ? (
        <button onClick={install} className="btn btn-primary !py-1.5 !px-3 text-[13px] shrink-0">
          Install
        </button>
      ) : (
        <button onClick={dismiss} className="link-action text-[13px] shrink-0">
          Got it
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="text-text-dim shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
