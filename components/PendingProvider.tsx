"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface PendingCtx {
  isPending: boolean;
  run: <T>(fn: () => Promise<T>) => Promise<T>;
}

const PendingContext = createContext<PendingCtx | null>(null);

export function usePending() {
  const ctx = useContext(PendingContext);
  if (!ctx) throw new Error("usePending requires PendingProvider");
  return ctx;
}

export function PendingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setCount((c) => c + 1);
    try {
      return await fn();
    } finally {
      setCount((c) => Math.max(0, c - 1));
    }
  }, []);

  return (
    <PendingContext.Provider value={{ isPending: count > 0, run }}>
      {children}
    </PendingContext.Provider>
  );
}
