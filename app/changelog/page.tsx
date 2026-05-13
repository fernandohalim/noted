"use client";

import { useRouter } from "next/navigation";
import packageJson from "../../package.json";
import { releases } from "@/lib/changelog";

export default function Changelog() {
  const router = useRouter();

  return (
    <main className="flex min-h-dvh flex-col items-center p-6 bg-bg font-mono selection:bg-accent selection:text-bg pb-32">
      <div className="w-full max-w-2xl relative">
        <header className="sticky top-0 py-6 bg-bg/90 backdrop-blur z-20 flex items-center justify-between border-b border-border mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <span>←</span> back
          </button>
          <div className="text-right">
            <h1 className="text-lg font-bold text-text">changelog</h1>
            <p className="text-xs text-text-muted">
              current: v{packageJson.version}
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {releases.map((release) => (
            <div
              key={release.version}
              className="border border-border bg-bg-elevated p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-border pb-4 gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-text">
                    {release.title}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-bg border border-border text-accent">
                    v{release.version}
                  </span>
                </div>
                <time className="text-xs text-text-muted">{release.date}</time>
              </div>

              <ul className="space-y-2">
                {release.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-text flex items-start gap-3"
                  >
                    <span className="text-text-muted select-none">-</span>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-xs text-text-muted">
          more notes taking shape...
        </div>
      </div>
    </main>
  );
}
