"use client";

import { usePending } from "./PendingProvider";

export default function ProgressBar() {
  const { isPending } = usePending();
  if (!isPending) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden pointer-events-none">
      <div
        className="h-full w-2/5 bg-[var(--color-accent)]"
        style={{ animation: "progress-slide 1.1s ease-in-out infinite" }}
      />
    </div>
  );
}
