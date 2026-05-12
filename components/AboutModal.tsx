"use client";

import { useRouter } from "next/navigation";
import packageJson from "../package.json";
import { AboutModalProps } from "@/types";

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      {/* backdrop */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* modal body */}
      <div className="bg-[#0a0a0a] border border-stone-800 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 overflow-hidden relative pb-8 sm:pb-0 z-10">
        {/* close button */}
        <div className="px-6 py-5 pt-8 sm:pt-6 flex justify-end items-center absolute top-0 right-0 w-full z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-800 hover:text-white hover:rotate-90 active:scale-90 transition-all font-bold text-lg shadow-sm border border-stone-800"
          >
            ×
          </button>
        </div>

        {/* brand background gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#d97757]/10 to-transparent z-0"></div>

        <div className="p-8 pt-12 flex flex-col items-center text-center relative z-10">
          {/* exact app icon hero */}
          <div className="relative mb-6 group mt-4 cursor-pointer">
            <div className="absolute inset-0 bg-[#d97757] opacity-20 rounded-xl blur-2xl group-hover:opacity-40 transition-opacity duration-500"></div>

            <div className="w-24 h-24 rounded-2xl bg-[#0a0a0a] border border-stone-800 shadow-xl flex items-center justify-center relative z-10 group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-300 ease-out">
              <span className="text-5xl font-bold text-[#d97757] select-none group-hover:rotate-6 transition-transform duration-300 font-mono">
                n.
              </span>
            </div>
          </div>

          {/* brand title & dev credit */}
          <div className="flex flex-col gap-0.5 mb-8">
            <h2 className="text-3xl font-black text-white tracking-tighter">
              noted.
            </h2>
            <p className="text-sm font-medium text-stone-400 mb-2">
              minimalist note-taking.
            </p>
            <p className="text-[10px] font-bold text-[#d97757] uppercase tracking-widest px-2.5 py-1.5 bg-[#d97757]/10 rounded-lg border border-[#d97757]/20">
              crafted by Fernando Halim 🚀
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            {/* changelog button */}
            <button
              onClick={() => {
                onClose();
                router.push("/changelog");
              }}
              className="w-full flex items-center justify-between p-4 sm:p-5 bg-stone-900/50 border border-stone-800 rounded-2xl hover:bg-stone-800/80 hover:border-[#d97757]/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] group mb-1"
            >
              <div className="flex items-center gap-3.5 text-white font-extrabold text-sm">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-inner border border-white/5">
                  ✨
                </div>
                what&apos;s new
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest bg-stone-800 text-stone-300 px-2.5 py-1 rounded-lg border border-stone-700">
                  v{packageJson.version}
                </span>
                <svg
                  className="w-4 h-4 text-stone-500 group-hover:text-white transition-colors duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            {/* social links */}
            <div className="flex justify-center items-center gap-3 mb-1 w-full p-2">
              <a
                href="https://fernando-halim.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-14 h-14 bg-stone-900/50 border border-stone-800 rounded-2xl flex items-center justify-center text-stone-400 hover:text-[#d97757] hover:bg-[#d97757]/10 hover:border-[#d97757]/30 transition-all duration-300 active:scale-[0.95]"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/in/fernando-halimm"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-14 h-14 bg-stone-900/50 border border-stone-800 rounded-2xl flex items-center justify-center text-stone-400 hover:text-[#d97757] hover:bg-[#d97757]/10 hover:border-[#d97757]/30 transition-all duration-300 active:scale-[0.95]"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://github.com/fernandohalim"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-14 h-14 bg-stone-900/50 border border-stone-800 rounded-2xl flex items-center justify-center text-stone-400 hover:text-[#d97757] hover:bg-[#d97757]/10 hover:border-[#d97757]/30 transition-all duration-300 active:scale-[0.95]"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>

            <a
              href="https://github.com/fernandohalim/noted"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-[11px] font-black text-stone-500 uppercase tracking-widest hover:text-[#d97757] transition-colors flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 duration-300"
            >
              view noted source code 📓
            </a>
          </div>

          <div className="mt-8 text-[10px] font-black text-stone-600 uppercase tracking-widest border-t border-dashed border-stone-800 pt-6 w-full text-center">
            noted v{packageJson.version} • taking notes simply
          </div>
        </div>
      </div>
    </div>
  );
}
