"use client";

import { useRouter } from "next/navigation";
import packageJson from "../package.json";
import { AboutModalProps } from "@/types";

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* modal body */}
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-sm rounded shadow-2xl flex flex-col relative z-10 font-mono overflow-hidden">
        {/* header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <span className="text-[var(--color-text)] text-sm font-bold">
            about noted.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors text-lg cursor-pointer flex items-center justify-center w-6 h-6 leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          {/* icon */}
          <div className="w-20 h-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-center mb-5 shrink-0">
            <span className="text-4xl font-bold text-[var(--color-accent)]">
              n.
            </span>
          </div>

          <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">
            noted.
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            minimalist note-taking.
          </p>

          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                router.push("/changelog");
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-sm"
            >
              <span className="text-[var(--color-text)]">changelog</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                v{packageJson.version} →
              </span>
            </button>

            <a
              href="https://github.com/fernandohalim/noted"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-sm"
            >
              <span className="text-[var(--color-text)]">source code</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                github ↗
              </span>
            </a>
          </div>

          <div className="mt-8 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-4 w-full">
            crafted by Fernando Halim
          </div>
        </div>
      </div>
    </div>
  );
}
