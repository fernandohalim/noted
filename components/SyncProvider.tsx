"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ItemMeta } from "@/types";
import {
  getSyncMeta,
  localClearAll,
  localGetAllItems,
} from "@/lib/local-store";
import { flushSync, pullDelta } from "@/lib/sync";
import { setCurrentUserId } from "@/lib/data";
import AppSkeleton from "./Skeleton";

type SyncStatus = "loading" | "ready" | "error";

interface SyncCtx {
  initialItems: ItemMeta[];
  triggerSync: () => void;
}

const Ctx = createContext<SyncCtx | null>(null);

export function useSync(): SyncCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSync must be inside SyncProvider");
  return ctx;
}

export default function SyncProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  // conditionally set the initial state so we don't have to fix it in the effect
  const [status, setStatus] = useState<SyncStatus>(
    userId ? "loading" : "ready",
  );
  const [initialItems, setInitialItems] = useState<ItemMeta[]>([]);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (!userId) {
      // state is already initialized to 'ready', just bail out
      return;
    }

    setCurrentUserId(userId);

    (async () => {
      try {
        const meta = await getSyncMeta();
        if (meta.userId && meta.userId !== userId) {
          await localClearAll(); // different account cached here — wipe
        }
        const fresh = await getSyncMeta();
        if (!fresh.initialSyncDone || fresh.userId !== userId) {
          await pullDelta(userId); // first run: block on full sync
        } else {
          void flushSync(userId); // warm cache: sync in background
        }
        setInitialItems(await localGetAllItems());
        setStatus("ready");
      } catch (err) {
        console.error("[sync] bootstrap failed", err);
        setStatus("error");
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (status !== "ready" || !userId) return;
    const sync = async () => {
      const changed = await flushSync(userId);
      if (changed) window.dispatchEvent(new Event("noted:items-updated"));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void sync(), 60_000);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [status, userId]);

  if (status === "loading") return <AppSkeleton />;
  if (status === "error") {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 text-sm text-text-muted">
        <p>couldn&apos;t load your notes.</p>
        <button
          onClick={() => location.reload()}
          className="px-3 py-1 border border-border hover:bg-bg-hover text-text"
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <Ctx.Provider
      value={{ initialItems, triggerSync: () => void flushSync(userId) }}
    >
      {children}
    </Ctx.Provider>
  );
}
