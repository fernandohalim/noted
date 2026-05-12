"use client";

import { useRef } from "react";
import * as htmlToImage from "html-to-image";

export default function OpenGraphExporter() {
  const ogRef = useRef<HTMLDivElement>(null);

  const exportImage = async () => {
    if (!ogRef.current) return;
    try {
      // force exact output dimensions ignoring screen scale
      const dataUrl = await htmlToImage.toPng(ogRef.current, {
        pixelRatio: 1,
        width: 1200,
        height: 630,
        canvasWidth: 1200,
        canvasHeight: 630,
      });
      const link = document.createElement("a");
      link.download = "opengraph-image.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("failed to export image:", err);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--color-bg)] p-8 font-mono overflow-auto">
      {" "}
      <button
        onClick={exportImage}
        className="mb-8 px-4 py-2 bg-[var(--color-bg-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors rounded text-sm cursor-pointer"
      >
        export opengraph-image.png
      </button>
      {/* 1200x630 container for the og image */}
      <div
        ref={ogRef}
        style={{ width: 1200, height: 630, minWidth: 1200, minHeight: 630 }}
        className="bg-[var(--color-bg)] flex flex-col items-center justify-center font-mono border border-[var(--color-border)] relative overflow-hidden shrink-0"
      >
        <div className="w-40 h-40 flex items-center justify-center rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-accent)] text-7xl font-bold mb-10">
          n.
        </div>
        <h1 className="text-6xl font-bold text-[var(--color-text)] mb-4">
          noted.
        </h1>
        <p className="text-3xl text-[var(--color-text-muted)]">
          minimalist note-taking.
        </p>
      </div>
    </div>
  );
}
