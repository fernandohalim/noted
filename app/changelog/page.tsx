"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import packageJson from "../../package.json";
import { releases } from "@/lib/changelog";

// badge tone matches the release type — accent carries meaning,
// borders stay uniform so it reads as one system
function badgeClasses(badge: string): string {
  switch (badge) {
    case "major":
      return "bg-accent text-bg border border-accent";
    case "launch":
      return "bg-accent text-bg border border-accent";
    case "feature":
      return "bg-bg text-accent border border-border";
    default: // patch
      return "bg-bg text-text-muted border border-border";
  }
}

// diff-style marker: + for new things, ~ for fixes/tweaks
function markerFor(badge: string): string {
  return badge === "patch" ? "~" : "+";
}

export default function Changelog() {
  const router = useRouter();
  const currentVersion = packageJson.version;

  return (
    <main className="h-dvh overflow-y-auto bg-bg font-mono selection:bg-accent selection:text-bg">
      {/* sticky header — echoes the app title bar (accent dot + version chip) */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text cursor-pointer"
          >
            <ArrowLeft size={14} />
            back
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <h1 className="text-sm font-bold text-text">changelog</h1>
            <span className="border border-border bg-bg px-1.5 py-0.5 text-[11px] text-text-muted">
              v{currentVersion}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pt-8 pb-32">
        <p className="mb-8 text-xs text-text-muted">
          {releases.length} releases · newest first
        </p>

        {/* commit-graph style timeline */}
        <div>
          {releases.map((release, idx) => {
            const isCurrent = release.version === currentVersion;
            const isFirst = idx === 0;
            const isLast = idx === releases.length - 1;
            return (
              <article
                key={release.version}
                id={`v${release.version}`}
                className="group relative flex scroll-mt-16 gap-4"
              >
                {/* timeline rail */}
                <div className="relative w-6 shrink-0">
                  {/* connecting line */}
                  <div
                    className={`absolute left-3 bottom-0 w-px -translate-x-1/2 bg-border ${
                      isFirst ? "top-2.5" : "top-0"
                    }`}
                  />
                  {/* node — filled accent for the current release, hollow for history */}
                  <div
                    className={`absolute left-3 top-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-bg ${
                      isCurrent
                        ? "h-3 w-3 bg-accent"
                        : "h-2.5 w-2.5 border border-text-muted bg-bg transition-colors group-hover:border-accent"
                    }`}
                  />
                </div>

                {/* entry */}
                <div className={`min-w-0 flex-1 ${isLast ? "pb-4" : "pb-10"}`}>
                  <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border pb-2.5">
                    <span
                      className={`bg-bg px-1.5 py-0.5 text-[11px] ${
                        isCurrent
                          ? "border border-accent text-accent"
                          : "border border-border text-text"
                      }`}
                    >
                      v{release.version}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClasses(
                        release.badge,
                      )}`}
                    >
                      {release.badge}
                    </span>
                    <h2 className="text-sm font-bold text-text">
                      {release.title}
                    </h2>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        current
                      </span>
                    )}
                    <time className="ml-auto text-xs text-text-muted">
                      {release.date}
                    </time>
                  </div>

                  <ul className="space-y-1.5">
                    {release.features.map((feature, fi) => (
                      <li key={fi} className="flex gap-2.5 text-sm text-text">
                        <span className="shrink-0 select-none text-text-muted">
                          {markerFor(release.badge)}
                        </span>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 text-center text-xs text-text-muted">
          more notes taking shape...
        </div>
      </div>
    </main>
  );
}
