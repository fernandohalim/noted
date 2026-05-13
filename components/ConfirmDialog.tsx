"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be inside ConfirmProvider");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div
            className="bg-bg border border-border w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") close(false);
              if (e.key === "Enter") close(true);
            }}
          >
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm">{state.opts.title}</h3>
            </div>
            {state.opts.message && (
              <div className="px-4 py-3 text-sm text-text-muted">
                {state.opts.message}
              </div>
            )}
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="px-3 py-1 text-sm text-text-muted hover:text-text"
              >
                {state.opts.cancelText ?? "cancel"}
              </button>
              <button
                autoFocus
                onClick={() => close(true)}
                className={`px-3 py-1 text-sm transition-colors ${
                  state.opts.danger
                    ? "bg-red-500/90 hover:bg-red-500 text-white"
                    : "bg-accent hover:bg-accent-hover text-bg"
                }`}
              >
                {state.opts.confirmText ?? "confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
