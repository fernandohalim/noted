"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import packageJson from "../../package.json";
import { releases } from "@/lib/changelog";

export default function Changelog() {
  const router = useRouter();
  const [expandedVersions, setExpandedVersions] = useState<
    Record<string, boolean>
  >({});

  return (
    <main className="flex min-h-[100dvh] flex-col items-center p-6 bg-[#0a0a0a] pb-32 font-sans selection:bg-[#d97757]/30 selection:text-white">
      <div className="w-full max-w-md relative">
        <div className="sticky top-0 pt-4 pb-4 bg-[#0a0a0a]/90 backdrop-blur-xl z-20 flex items-center justify-between mb-8 border-b border-stone-800/50">
          <button
            onClick={() => router.push("/")}
            aria-label="back home"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-stone-900 shadow-sm border border-stone-800 text-stone-400 hover:text-[#d97757] hover:border-[#d97757]/30 hover:scale-110 active:scale-95 transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex flex-col items-end">
            <h1 className="text-xl font-black text-white tracking-tight">
              changelog 📖
            </h1>
            <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase">
              current version {packageJson.version}
            </span>
          </div>
        </div>

        <div className="space-y-5 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-1/2 before:h-full before:w-1 before:bg-gradient-to-b before:from-[#d97757] before:via-stone-800 before:to-stone-900 before:rounded-full">
          {releases.map((release, index) => {
            const parts = release.version.split(".");
            let weight = 3;
            if (parts.length === 2) {
              weight = parts[1] === "0" ? 1 : 2;
            }
            const isExpanded =
              weight !== 3 || expandedVersions[release.version];

            let Node = null;
            if (weight === 1) {
              Node = (
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#0a0a0a] bg-stone-800 shadow-xl relative z-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform">
                  <span className="text-xl" aria-hidden="true">
                    🚀
                  </span>
                </div>
              );
            } else if (weight === 2) {
              Node = (
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0a0a] bg-[#d97757] text-[#0a0a0a] shadow-sm relative z-10 group-hover:scale-110 transition-transform mt-0.5">
                  <span className="text-[10px] font-black">
                    v{release.version}
                  </span>
                </div>
              );
            } else {
              Node = (
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] border-[#0a0a0a] bg-stone-700 relative z-10 group-hover:bg-[#d97757] group-hover:scale-125 transition-all mt-2.5"
                  aria-hidden="true"
                ></div>
              );
            }

            return (
              <div
                key={release.version}
                className={`relative flex gap-3 sm:gap-4 group is-active animate-in slide-in-from-bottom-4 fade-in duration-500 ${
                  weight === 1 ? "mt-12" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 flex justify-center shrink-0">{Node}</div>
                <div
                  onClick={() => {
                    if (weight === 3) {
                      setExpandedVersions((prev) => ({
                        ...prev,
                        [release.version]: !prev[release.version],
                      }));
                    }
                  }}
                  role={weight === 3 ? "button" : undefined}
                  tabIndex={weight === 3 ? 0 : undefined}
                  className={`flex-1 transition-all group-hover:-translate-y-1 ${
                    weight === 3 ? "cursor-pointer" : "cursor-default"
                  } ${
                    weight === 1
                      ? "p-6 rounded-4xl bg-stone-900 border-2 border-stone-800 shadow-lg hover:shadow-xl hover:border-[#d97757]/50"
                      : weight === 2
                        ? "p-5 rounded-3xl bg-stone-900/80 border-2 border-stone-800/80 shadow-sm hover:shadow-md hover:border-[#d97757]/30"
                        : "p-4 rounded-2xl bg-stone-900/50 border border-stone-800/50 shadow-sm hover:bg-stone-900 hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                          release.badgeColor ||
                          "bg-[#d97757]/10 text-[#d97757] border-[#d97757]/20"
                        }`}
                      >
                        v{release.version} - {release.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <time className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                        {release.date}
                      </time>
                      {weight === 3 && (
                        <svg
                          className={`w-4 h-4 text-stone-600 transition-transform duration-300 ${
                            isExpanded ? "rotate-180 text-[#d97757]" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <h3
                    className={`font-extrabold text-white ${
                      weight === 1
                        ? "text-2xl"
                        : weight === 2
                          ? "text-lg"
                          : "text-base"
                    } ${isExpanded ? "mb-3" : "mb-1"}`}
                  >
                    {release.title}
                  </h3>
                  {isExpanded && (
                    <ul className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      {release.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className={`text-sm font-medium flex items-start gap-2 leading-tight ${
                            weight === 3 ? "text-stone-400" : "text-stone-300"
                          }`}
                        >
                          <span
                            className={`mt-0.5 shrink-0 transition-colors ${
                              weight === 1
                                ? "text-stone-600 group-hover:text-[#d97757]"
                                : weight === 2
                                  ? "text-[#d97757]"
                                  : "text-stone-700 group-hover:text-[#d97757]"
                            }`}
                            aria-hidden="true"
                          >
                            ↳
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-16 text-center">
          <p className="text-xs font-black text-stone-600 uppercase tracking-widest animate-pulse">
            more magic coming soon ✨
          </p>
        </div>
      </div>
    </main>
  );
}
