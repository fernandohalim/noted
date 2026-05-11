"use client";

import { useEffect, useRef } from "react";

export type MenuItem =
  | { label: string; onClick: () => void; danger?: boolean; type?: never }
  | { type: "divider"; label?: never; onClick?: never; danger?: never };

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const adjustedX =
    typeof window !== "undefined" ? Math.min(x, window.innerWidth - 180) : x;
  const adjustedY =
    typeof window !== "undefined"
      ? Math.min(y, window.innerHeight - items.length * 32)
      : y;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] py-1 shadow-lg"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) =>
        item.type === "divider" ? (
          <div key={i} className="h-px bg-[var(--color-border)] my-1" />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.onClick!();
              onClose();
            }}
            className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-bg-hover)] ${
              item.danger ? "text-red-400" : ""
            }`}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
