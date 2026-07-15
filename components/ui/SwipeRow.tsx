"use client";

import { useRef, useState } from "react";

const REVEAL = 76;

// A native-feeling swipe-to-delete row (Mail.app style). Purely an
// enhancement, not the only path to delete — every caller also keeps a
// plain, always-visible Delete link/button in its content for
// non-touch/accessibility use.
export function SwipeRow({
  children,
  onDelete,
  deleteLabel = "Delete",
}: {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startOpenRef = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.touches[0].clientX;
    startOpenRef.current = open;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return;
    const delta = e.touches[0].clientX - startXRef.current;
    const base = startOpenRef.current ? -REVEAL : 0;
    setDragX(Math.max(-REVEAL, Math.min(0, base + delta)));
  }

  function onTouchEnd() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setOpen(dragX < -REVEAL / 2);
    setDragX(0);
  }

  const x = dragging ? dragX : open ? -REVEAL : 0;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: REVEAL }}>
        <button
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
          className="flex-1 bg-red text-white text-[13px] font-semibold active:opacity-80"
        >
          {deleteLabel}
        </button>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => open && setOpen(false)}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
        className="relative bg-[var(--bg-elevated)]"
      >
        {children}
      </div>
    </div>
  );
}
