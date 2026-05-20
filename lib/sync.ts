import {
  getSyncMeta,
  listMutations,
  localGetItemRaw,
  localPutItems,
  removeMutation,
  setConflict,
  setSyncMeta,
  enqueueMutation,
  localPutBase,
  localPutBases,
} from "./local-store";
import type { Item, PendingMutation, SyncMeta } from "@/types";
import {
  createItem as srvCreate,
  deleteItem as srvDelete,
  getItemsSince as srvGetItemsSince,
  moveItem as srvMove,
  renameItem as srvRename,
  updateFileContent as srvUpdateContent,
} from "@/app/actions";

// --- random id helper (mutation ids are not user-visible) ---
function mid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// ---------- pull (server -> local) ----------

export async function pullDelta(userId: string): Promise<{
  appliedCount: number;
  newLastSyncAt: string | null;
}> {
  const meta = await getSyncMeta();
  const since = meta.userId === userId ? meta.lastSyncAt : null;

  const res = await srvGetItemsSince(since);
  if ("error" in res && res.error) {
    throw new Error(res.error);
  }
  const items = (res.data ?? []) as Item[];

  if (items.length === 0) {
    if (!meta.initialSyncDone || meta.userId !== userId) {
      await setSyncMeta({
        userId,
        lastSyncAt: since,
        initialSyncDone: true,
      });
    }
    return { appliedCount: 0, newLastSyncAt: since };
  }

  // server returns items including deleted_at and content; we trust it as authoritative
  await localPutItems(items);

  // snapshot server-confirmed file content as the merge base — but skip files
  // with a pending local edit, so their base stays the true common ancestor
  const pendingItemIds = new Set((await listMutations()).map((m) => m.itemId));
  await localPutBases(
    items
      .filter(
        (i) => i.type === "file" && !i.deleted_at && !pendingItemIds.has(i.id),
      )
      .map((i) => ({ id: i.id, content: i.content, updatedAt: i.updated_at })),
  );

  const newest = items.reduce<string>(
    (acc, i) => (i.updated_at > acc ? i.updated_at : acc),
    since ?? "",
  );

  const next: SyncMeta = {
    userId,
    lastSyncAt: newest || since,
    initialSyncDone: true,
  };
  await setSyncMeta(next);

  return { appliedCount: items.length, newLastSyncAt: next.lastSyncAt };
}

// ---------- push (local mutations -> server) ----------

export async function pushPendingMutations(): Promise<{
  processed: number;
  conflicts: number;
  failures: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, conflicts: 0, failures: 0 };
  }

  const queue = await listMutations();
  let processed = 0;
  let conflicts = 0;
  let failures = 0;

  for (const m of queue) {
    try {
      const result = await applyMutation(m);
      if (result === "conflict") {
        conflicts += 1;
        await removeMutation(m.id);
      } else {
        await removeMutation(m.id);
        processed += 1;
      }
    } catch (err) {
      console.error("[sync] mutation failed", m, err);
      failures += 1;
      // increment attempts so we can back off later if needed
      await enqueueMutation({ ...m, attempts: m.attempts + 1 });
      // continue with next mutation; don't bail the whole loop
    }
  }

  return { processed, conflicts, failures };
}

async function applyMutation(
  m: PendingMutation,
): Promise<"ok" | "conflict"> {
  switch (m.type) {
    case "create": {
      const { parentId, name, itemType, content } = m.payload as {
        parentId: string | null;
        name: string;
        itemType: "file" | "folder";
        content: string;
      };
      const res = await srvCreate(
        parentId,
        name,
        itemType,
        content,
        m.itemId, // server inserts with the client-generated id
      );
      if ("error" in res && res.error) {
        // a duplicate means a prior sync already created it — treat as done
        if (res.error.toLowerCase().includes("duplicate")) return "ok";
        throw new Error(res.error);
      }
      if ("data" in res && res.data) {
        const created = res.data as Item;
        await localPutItems([{ ...created, content }]);
        if (itemType === "file") {
          await localPutBase({
            id: m.itemId,
            content,
            updatedAt: created.updated_at,
          });
        }
      }
      return "ok";
    }
    case "rename": {
      const { name } = m.payload as { name: string };
      const res = await srvRename(m.itemId, name);
      if ("error" in res && res.error) throw new Error(res.error);
      return "ok";
    }
    case "move": {
      const { newParentId } = m.payload as { newParentId: string | null };
      const res = await srvMove(m.itemId, newParentId);
      if ("error" in res && res.error) throw new Error(res.error);
      return "ok";
    }
    case "delete": {
      const res = await srvDelete(m.itemId);
      if ("error" in res && res.error) throw new Error(res.error);
      return "ok";
    }
    case "update_content": {
      const { content } = m.payload as { content: string };
      const res = await srvUpdateContent(
        m.itemId,
        content,
        m.expectedUpdatedAt,
      );
      if ("error" in res && res.error === "conflict") {
        const local = await localGetItemRaw(m.itemId);
        if (local) {
          await setConflict({
            itemId: m.itemId,
            localContent: content,
            localExpectedUpdatedAt: m.expectedUpdatedAt ?? "",
            serverUpdatedAt:
              (res as { currentUpdatedAt?: string }).currentUpdatedAt ?? "",
            detectedAt: Date.now(),
          });
        }
        return "conflict";
      }
      if ("error" in res && res.error) throw new Error(res.error);
      // queued edit is now server-confirmed — advance the merge base
      const confirmedAt = (res as { updatedAt?: string }).updatedAt;
      if (confirmedAt) {
        await localPutBase({ id: m.itemId, content, updatedAt: confirmedAt });
      }
      return "ok";
    }
  }
}

// ---------- public helpers for components ----------

export function makeMutationId(): string {
  return mid();
}

export async function queueMutation(
  partial: Omit<PendingMutation, "id" | "enqueuedAt" | "attempts">,
): Promise<PendingMutation> {
  const m: PendingMutation = {
    ...partial,
    id: mid(),
    enqueuedAt: Date.now(),
    attempts: 0,
  };
  await enqueueMutation(m);
  return m;
}

let flushing = false;

export async function flushSync(userId: string): Promise<boolean> {
  if (flushing) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  flushing = true;
  try {
    const push = await pushPendingMutations();
    const pull = await pullDelta(userId);
    return push.processed > 0 || pull.appliedCount > 0;
  } catch (err) {
    console.error("[sync] flush failed", err);
    return false;
  } finally {
    flushing = false;
  }
}