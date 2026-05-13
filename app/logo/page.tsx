"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

export default function LogoExporter() {
  const logoRef = useRef<HTMLDivElement>(null);
  const [renderSize, setRenderSize] = useState(512);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (size: number, filename: string) => {
    if (isExporting) return;

    // briefly set to target size for the snapshot
    setIsExporting(true);
    setRenderSize(size);

    // wait 150ms for react and the browser to paint the new size
    setTimeout(async () => {
      if (!logoRef.current) {
        setIsExporting(false);
        return;
      }
      try {
        const dataUrl = await htmlToImage.toPng(logoRef.current, {
          pixelRatio: 1, // forces exact pixels, ignoring retina displays
          width: size,
          height: size,
          canvasWidth: size,
          canvasHeight: size,
        });
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("failed to export image:", err);
      } finally {
        // snap back to the 512 preview
        setRenderSize(512);
        setIsExporting(false);
      }
    }, 150);
  };

  const sizes = [
    { width: 192, name: "icon-192.png" },
    { width: 512, name: "icon-512.png" },
    { width: 180, name: "apple-icon.png" },
    { width: 500, name: "icon-500.png" },
  ];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-bg p-8 font-mono overflow-auto">
      {/* export buttons */}
      <div className="flex flex-wrap gap-3 mb-12 justify-center max-w-lg">
        {sizes.map((s) => (
          <button
            key={s.width}
            onClick={() => handleExport(s.width, s.name)}
            disabled={isExporting}
            className="px-4 py-2 bg-bg-elevated text-text border border-border hover:bg-bg-hover disabled:opacity-50 transition-colors rounded text-sm cursor-pointer"
          >
            export {s.width}x{s.width}
          </button>
        ))}
      </div>

      {/* dynamic scalable container */}
      <div
        ref={logoRef}
        style={{
          width: renderSize,
          height: renderSize,
          minWidth: renderSize,
          minHeight: renderSize,
          // dynamically calculate outer border radius (0.225 mimics standard squircle)
          borderRadius: renderSize * 0.225,
        }}
        className="bg-bg flex flex-col items-center justify-center font-mono border border-border relative overflow-hidden shrink-0"
      >
        <div
          style={{
            width: "75%",
            height: "75%",
            // dynamically calculate properties so they always look right
            borderRadius: renderSize * 0.046, // mimics rounded-3xl
            borderWidth: Math.max(2, renderSize * 0.008), // mimics border-4
            fontSize: renderSize * 0.34, // mimics text-[11rem]
            paddingBottom: renderSize * 0.03, // mimics pb-4
          }}
          className="flex items-center justify-center border-border bg-bg text-accent font-bold"
        >
          n.
        </div>
      </div>

      {isExporting && (
        <p className="mt-8 text-xs text-text-muted animate-pulse">
          snapping {renderSize}x{renderSize}...
        </p>
      )}
    </div>
  );
}
