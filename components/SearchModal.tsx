"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText } from "lucide-react";
import { searchItems } from "@/app/actions";

interface SearchResult {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  snippet: string;
  rank: number;
}

export default function SearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  // open/close shortcut and state reset handled together
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (!open) {
          // reset state right before opening
          setQuery("");
          setResults([]);
          setSelectedIdx(0);
          setLoading(false);
          setOpen(true);
        } else {
          setOpen(false);
        }
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // debounced search effect, cleared of synchronous state setters
  useEffect(() => {
    if (!query.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const res = await searchItems(query);
      if (myReq !== reqIdRef.current) return; // stale response, ignore

      setResults(res.data as SearchResult[]);
      setSelectedIdx(0);
      setLoading(false);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectResult = useCallback(
    (result: SearchResult) => {
      router.push(`/?file=${result.id}`);
      setOpen(false);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      selectResult(results[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-xl flex flex-col max-h-[70vh] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
          <Search
            size={14}
            className="text-[var(--color-text-muted)] flex-shrink-0"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);

              // handle empty queries instantly without waiting for effect
              if (!val.trim()) {
                setResults([]);
                setLoading(false);
              } else {
                setLoading(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="search across all files..."
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
          <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
            {loading
              ? "searching..."
              : results.length > 0
                ? `${results.length} result${results.length === 1 ? "" : "s"}`
                : query.trim()
                  ? "no results"
                  : ""}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => selectResult(r)}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`w-full text-left px-3 py-2 border-b border-[var(--color-border)] last:border-0 ${
                i === selectedIdx ? "bg-[var(--color-bg-hover)]" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <FileText
                  size={12}
                  className="text-[var(--color-text-muted)] flex-shrink-0"
                />
                <span className="text-sm truncate">{r.name}</span>
                {r.path !== r.name && (
                  <span className="text-xs text-[var(--color-text-muted)] truncate">
                    {r.path.replace(` / ${r.name}`, "")}
                  </span>
                )}
              </div>
              {r.snippet && (
                <div className="text-xs text-[var(--color-text-muted)] truncate pl-5">
                  {renderSnippet(r.snippet)}
                </div>
              )}
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="px-3 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex gap-3 flex-shrink-0">
            <span>
              <kbd className="text-[10px]">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="text-[10px]">enter</kbd> open
            </span>
            <span>
              <kbd className="text-[10px]">esc</kbd> close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderSnippet(snippet: string): React.ReactNode {
  const parts = snippet.split(/⟨MARK⟩|⟨\/MARK⟩/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="bg-[var(--color-accent)]/30 text-[var(--color-text)] px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
