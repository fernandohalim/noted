"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface PendingItemsCtx {
  isPending: (id: string) => boolean;
  withPending: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
}

const Ctx = createContext<PendingItemsCtx | null>(null);

export function usePendingItems(): PendingItemsCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("usePendingItems must be inside PendingItemsProvider");
  return ctx;
}

export function PendingItemsProvider({ children }: { children: ReactNode }) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const isPending = useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds],
  );

  const withPending = useCallback(
    async <T,>(id: string, fn: () => Promise<T>): Promise<T> => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      try {
        return await fn();
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  return (
    <Ctx.Provider value={{ isPending, withPending }}>{children}</Ctx.Provider>
  );
}
