"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";

interface PromptOptions {
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
}

type PromptFn = (opts: PromptOptions) => Promise<string | null>;

const PromptContext = createContext<PromptFn | null>(null);

export function usePrompt(): PromptFn {
  const fn = useContext(PromptContext);
  if (!fn) throw new Error("usePrompt must be inside PromptProvider");
  return fn;
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    opts: PromptOptions;
    resolve: (v: string | null) => void;
  } | null>(null);
  const [value, setValue] = useState("");

  const prompt = useCallback<PromptFn>((opts) => {
    setValue(opts.initialValue ?? "");
    return new Promise<string | null>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  const close = (result: string | null) => {
    state?.resolve(result);
    setState(null);
    setValue("");
  };

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state]);

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => close(null)}
        >
          <div
            className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm">{state.opts.title}</h3>
            </div>
            <div className="px-4 py-3">
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={state.opts.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") close(value.trim() ? value : null);
                  if (e.key === "Escape") close(null);
                }}
                className="w-full px-2 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-accent)] outline-none text-sm"
              />
            </div>
            <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button
                onClick={() => close(null)}
                className="px-3 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                cancel
              </button>
              <button
                onClick={() => close(value.trim() ? value : null)}
                className="px-3 py-1 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)]"
              >
                {state.opts.confirmText ?? "create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  );
}
