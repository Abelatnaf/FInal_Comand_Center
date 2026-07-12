"use client";

import { useEffect, useRef, useState } from "react";

export function HScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className={`hscroll overflow-x-auto ${className ?? ""}`}>
        {children}
      </div>
      {canScrollLeft && <div className="hscroll-fade hscroll-fade-left" aria-hidden />}
      {canScrollRight && <div className="hscroll-fade hscroll-fade-right" aria-hidden />}
    </div>
  );
}
