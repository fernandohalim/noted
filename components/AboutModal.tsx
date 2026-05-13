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
      <div className="bg-bg border border-border w-full max-w-sm shadow-2xl flex flex-col relative z-10 font-mono overflow-hidden">
        {/* header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-bg-elevated">
          <span className="text-text text-sm font-bold">about noted.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors text-lg cursor-pointer flex items-center justify-center w-6 h-6 leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          {/* icon */}
          <div className="w-20 h-20 rounded-xl border border-border bg-bg flex items-center justify-center mb-5 shrink-0">
            <span className="text-4xl font-bold text-accent">n.</span>
          </div>

          <h2 className="text-xl font-bold text-text mb-1">noted.</h2>
          <p className="text-sm text-text-muted mb-6">
            minimalist note-taking.
          </p>

          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                router.push("/changelog");
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-elevated border border-border hover:bg-bg-hover transition-colors cursor-pointer text-sm"
            >
              <span className="text-text">changelog</span>
              <span className="text-xs text-text-muted">
                v{packageJson.version} →
              </span>
            </button>

            <a
              href="https://github.com/fernandohalim/noted"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-elevated border border-border hover:bg-bg-hover transition-colors cursor-pointer text-sm"
            >
              <span className="text-text">source code</span>
              <span className="text-xs text-text-muted">github ↗</span>
            </a>

            <div className="grid grid-cols-4 gap-2 mt-2">
              <a
                href="https://fernando-halim.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-2 bg-bg-elevated border border-border hover:bg-bg-hover transition-colors text-text-muted hover:text-text"
              >
                <span className="text-xs">web</span>
              </a>
              <a
                href="https://linkedin.com/in/fernando-halimm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-2 bg-bg-elevated border border-border hover:bg-bg-hover transition-colors text-text-muted hover:text-text"
              >
                <span className="text-xs">in</span>
              </a>
              <a
                href="https://github.com/fernandohalim"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-2 bg-bg-elevated border border-border hover:bg-bg-hover transition-colors text-text-muted hover:text-text"
              >
                <span className="text-xs">gh</span>
              </a>
              <a
                href="mailto:fernandohalim26@gmail.com"
                className="flex items-center justify-center py-2 bg-bg-elevated border border-border hover:bg-bg-hover transition-colors text-text-muted hover:text-text"
              >
                <span className="text-xs">mail</span>
              </a>
            </div>
          </div>

          <div className="mt-8 text-xs text-text-muted border-t border-border pt-4 w-full">
            crafted by Fernando Halim
          </div>
        </div>
      </div>
    </div>
  );
}
