"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 64;
const MAX_PULL = 96;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return;
      draggingRef.current = true;
      startYRef.current = e.touches[0].clientY;
      setDragging(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!draggingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0 || window.scrollY > 0) {
        draggingRef.current = false;
        setDragging(false);
        setPull(0);
        return;
      }
      e.preventDefault();
      setPull(Math.min(delta * 0.5, MAX_PULL));
    }

    function onTouchEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      setPull((p) => {
        if (p >= THRESHOLD) startTransition(() => router.refresh());
        return 0;
      });
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router]);

  const progress = Math.min(pull / THRESHOLD, 1);
  const showIndicator = pull > 0 || isPending;
  const offset = isPending ? THRESHOLD * 0.6 : pull;

  return (
    <div className="relative">
      {showIndicator && (
        <div
          className="fixed left-0 right-0 flex justify-center pointer-events-none z-20"
          style={{ top: 10, opacity: isPending ? 1 : progress }}
        >
          <div className="w-8 h-8 rounded-full material border border-[var(--separator)] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--label)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isPending ? "animate-spin" : ""}
              style={isPending ? undefined : { transform: `rotate(${progress * 220}deg)` }}
            >
              <path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" />
              <path d="M16 4v5h-5M8 20v-5h5" />
            </svg>
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${offset}px)`, transition: dragging ? "none" : "transform 0.25s ease" }}>
        {children}
      </div>
    </div>
  );
}
