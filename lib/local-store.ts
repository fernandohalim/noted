import { clearLocalData, getDB } from "./idb";
import type {
  ConflictRecord,
  Item,
  ItemMeta,
  PendingMutation,
  SyncMeta,
} from "@/types";

// in-memory cache of full items (incl. content), keyed by id.
// notes apps are small — we cache everything without eviction.
const itemCache = new Map<string, Item>();

// ---------- items ----------

export async function localGetAllItems(): Promise<ItemMeta[]> {
  const db = await getDB();
  const all = await db.getAll("items");
  for (const i of all) itemCache.set(i.id, i);
  return all
    .filter((i) => !i.deleted_at)
    .map((i) => {
      const { content: _c, ...meta } = i;
      void _c;
      return meta;
    });
}

/** Synchronous cache-only read. undefined = not cached (or deleted). */
export function localPeekItem(id: string): Item | undefined {
  const c = itemCache.get(id);
  if (!c || c.deleted_at) return undefined;
  return c;
}

export async function localGetItem(id: string): Promise<Item | null> {
  const cached = itemCache.get(id);
  if (cached) return cached.deleted_at ? null : cached;
  const db = await getDB();
  const item = await db.get("items", id);
  if (item) itemCache.set(id, item);
  if (!item || item.deleted_at) return null;
  return item;
}

/** Returns even soft-deleted items — used by the sync layer. */
export async function localGetItemRaw(id: string): Promise<Item | null> {
  const cached = itemCache.get(id);
  if (cached) return cached;
  const db = await getDB();
  const item = (await db.get("items", id)) ?? null;
  if (item) itemCache.set(id, item);
  return item;
}

export async function localPutItem(item: Item): Promise<void> {
  itemCache.set(item.id, item);
  const db = await getDB();
  await db.put("items", item);
}

export async function localPutItems(items: Item[]): Promise<void> {
  if (items.length === 0) return;
  for (const i of items) itemCache.set(i.id, i);
  const db = await getDB();
  const tx = db.transaction("items", "readwrite");
  await Promise.all(items.map((i) => tx.store.put(i)));
  await tx.done;
}

export async function localMarkDeleted(
  id: string,
  deletedAt: string,
): Promise<void> {
  const db = await getDB();
  const existing = itemCache.get(id) ?? (await db.get("items", id));
  if (!existing) return;
  const updated = { ...existing, deleted_at: deletedAt };
  itemCache.set(id, updated);
  await db.put("items", updated);
}

export async function localClearAll(): Promise<void> {
  itemCache.clear();
  await clearLocalData();
}

// ---------- mutation queue ----------

export async function enqueueMutation(m: PendingMutation): Promise<void> {
  const db = await getDB();
  await db.put("mutations", m);
}

export async function listMutations(): Promise<PendingMutation[]> {
  const db = await getDB();
  const all = await db.getAll("mutations");
  return all.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("mutations", id);
}

// ---------- sync meta ----------

const META_KEY_SYNC = "sync";
const META_KEY_CONFLICTS = "conflicts";

export async function getSyncMeta(): Promise<SyncMeta> {
  const db = await getDB();
  const meta = (await db.get("meta", META_KEY_SYNC)) as SyncMeta | undefined;
  return meta ?? { userId: null, lastSyncAt: null, initialSyncDone: false };
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await getDB();
  await db.put("meta", meta, META_KEY_SYNC);
}

// ---------- conflict log ----------

export async function getConflicts(): Promise<Record<string, ConflictRecord>> {
  const db = await getDB();
  const c = (await db.get("meta", META_KEY_CONFLICTS)) as
    | Record<string, ConflictRecord>
    | undefined;
  return c ?? {};
}

export async function setConflict(c: ConflictRecord): Promise<void> {
  const db = await getDB();
  const map = await getConflicts();
  map[c.itemId] = c;
  await db.put("meta", map, META_KEY_CONFLICTS);
}

export async function clearConflict(itemId: string): Promise<void> {
  const db = await getDB();
  const map = await getConflicts();
  delete map[itemId];
  await db.put("meta", map, META_KEY_CONFLICTS);
}