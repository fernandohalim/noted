"use client";

import {
  createItem as srvCreate,
  renameItem as srvRename,
  moveItem as srvMove,
  deleteItem as srvDelete,
  updateFileContent as srvUpdateContent,
  refreshFileContent as srvRefresh,
} from "@/app/actions";
import {
  getConflicts,
  listMutations,
  localGetAllItems,
  localGetItem,
  localMarkDeleted,
  localPutItem,
} from "./local-store";
import { queueMutation } from "./sync";
import type { Item, ItemMeta, ItemType } from "@/types";

let currentUserId = "";
export function setCurrentUserId(id: string) {
  currentUserId = id;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function stripContent(item: Item): ItemMeta {
  const { content: _c, ...meta } = item;
  void _c;
  return meta;
}

// ---------- reads ----------

export async function getItem(id: string): Promise<Item | null> {
  return localGetItem(id);
}

export async function getFolders(): Promise<ItemMeta[]> {
  const all = await localGetAllItems();
  return all.filter((i) => i.type === "folder");
}

/** Folder subtree with relative paths, for zip export — built from local cache. */
export async function getFolderTree(folderId: string): Promise<{
  data: Array<{
    id: string;
    name: string;
    type: ItemType;
    parent_id: string | null;
    content: string;
    relative_path: string;
  }>;
}> {
  const all = await localGetAllItems();
  const byParent = new Map<string | null, ItemMeta[]>();
  for (const it of all) {
    const list = byParent.get(it.parent_id) ?? [];
    list.push(it);
    byParent.set(it.parent_id, list);
  }
  const out: Awaited<ReturnType<typeof getFolderTree>>["data"] = [];
  const walk = async (parentId: string, prefix: string) => {
    for (const child of byParent.get(parentId) ?? []) {
      const relPath = prefix ? `${prefix}/${child.name}` : child.name;
      let content = "";
      if (child.type === "file") {
        const full = await localGetItem(child.id);
        content = full?.content ?? "";
      }
      out.push({
        id: child.id,
        name: child.name,
        type: child.type,
        parent_id: child.parent_id,
        content,
        relative_path: relPath,
      });
      if (child.type === "folder") await walk(child.id, relPath);
    }
  };
  await walk(folderId, "");
  return { data: out };
}

export async function getItemConflict(id: string) {
  return (await getConflicts())[id] ?? null;
}

export async function hasPendingMutation(itemId: string): Promise<boolean> {
  return (await listMutations()).some((m) => m.itemId === itemId);
}

// ---------- mutations ----------

export async function createItem(
  parentId: string | null,
  name: string,
  type: ItemType,
  content: string = "",
): Promise<{ data?: ItemMeta; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "name required" };

  const id = uuid();
  const now = new Date().toISOString();
  const optimistic: Item = {
    id,
    user_id: currentUserId,
    parent_id: parentId,
    name: trimmed,
    type,
    content,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await localPutItem(optimistic);

  const queue = () =>
    queueMutation({
      itemId: id,
      type: "create",
      payload: { parentId, name: trimmed, itemType: type, content },
    });

  if (!online()) {
    await queue();
    return { data: stripContent(optimistic) };
  }
  const res = await srvCreate(parentId, trimmed, type, content, id);
  if ("error" in res && res.error) {
    await queue();
    return { data: stripContent(optimistic) };
  }
  const serverItem = { ...(res.data as Item), content };
  await localPutItem(serverItem);
  return { data: stripContent(serverItem) };
}

export async function renameItem(
  id: string,
  newName: string,
): Promise<{ ok?: true; error?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { error: "name required" };

  const existing = await localGetItem(id);
  if (existing) {
    await localPutItem({
      ...existing,
      name: trimmed,
      updated_at: new Date().toISOString(),
    });
  }
  const queue = () =>
    queueMutation({ itemId: id, type: "rename", payload: { name: trimmed } });

  if (!online()) {
    await queue();
    return { ok: true };
  }
  const res = await srvRename(id, trimmed);
  if ("error" in res && res.error) await queue();
  return { ok: true };
}

export async function moveItem(
  id: string,
  newParentId: string | null,
): Promise<{ ok?: true; error?: string }> {
  if (id === newParentId) return { error: "cannot move into itself" };

  const all = await localGetAllItems();
  if (newParentId) {
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === id) return { error: "cannot move into a descendant" };
      const parent = all.find((i) => i.id === cursor);
      cursor = parent?.parent_id ?? null;
    }
  }

  const existing = await localGetItem(id);
  if (existing) {
    await localPutItem({
      ...existing,
      parent_id: newParentId,
      updated_at: new Date().toISOString(),
    });
  }
  const queue = () =>
    queueMutation({ itemId: id, type: "move", payload: { newParentId } });

  if (!online()) {
    await queue();
    return { ok: true };
  }
  const res = await srvMove(id, newParentId);
  if ("error" in res && res.error) await queue();
  return { ok: true };
}

export async function deleteItem(
  id: string,
): Promise<{ ok?: true; error?: string }> {
  const now = new Date().toISOString();
  const all = await localGetAllItems();
  const toDelete = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const it of all) {
      if (it.parent_id && toDelete.has(it.parent_id) && !toDelete.has(it.id)) {
        toDelete.add(it.id);
        grew = true;
      }
    }
  }
  for (const did of toDelete) await localMarkDeleted(did, now);

  const queue = () =>
    queueMutation({ itemId: id, type: "delete", payload: {} });

  if (!online()) {
    await queue();
    return { ok: true };
  }
  const res = await srvDelete(id);
  if ("error" in res && res.error) await queue();
  return { ok: true };
}

export async function updateFileContent(
  id: string,
  content: string,
  expectedUpdatedAt?: string,
): Promise<
  | { ok: true; updatedAt?: string; queued?: boolean }
  | { error: "conflict"; currentUpdatedAt: string }
  | { error: string }
> {
  const existing = await localGetItem(id);
  if (existing) {
    await localPutItem({
      ...existing,
      content,
      updated_at: new Date().toISOString(),
    });
  }

  const queue = () =>
    queueMutation({
      itemId: id,
      type: "update_content",
      payload: { content },
      expectedUpdatedAt,
    });

  if (!online()) {
    await queue();
    return { ok: true, queued: true };
  }

  const res = await srvUpdateContent(id, content, expectedUpdatedAt);
  if ("error" in res && res.error === "conflict") {
    return {
      error: "conflict",
      currentUpdatedAt:
        (res as { currentUpdatedAt?: string }).currentUpdatedAt ?? "",
    };
  }
  if ("error" in res && res.error) {
    await queue();
    return { ok: true, queued: true };
  }
  const updatedAt = (res as { updatedAt?: string }).updatedAt;
  if (existing && updatedAt) {
    await localPutItem({ ...existing, content, updated_at: updatedAt });
  }
  return { ok: true, updatedAt };
}

export async function refreshFileContent(
  id: string,
): Promise<{ content: string; updatedAt: string } | { error: string }> {
  if (!online()) {
    const local = await localGetItem(id);
    if (local) return { content: local.content, updatedAt: local.updated_at };
    return { error: "offline and not cached" };
  }
  const res = await srvRefresh(id);
  if ("error" in res && res.error) return { error: res.error };
  const r = res as { content: string; updatedAt: string };
  const existing = await localGetItem(id);
  if (existing) {
    await localPutItem({
      ...existing,
      content: r.content,
      updated_at: r.updatedAt,
    });
  }
  return { content: r.content, updatedAt: r.updatedAt };
}