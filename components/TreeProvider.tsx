"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as actions from "@/app/actions";
import { buildTree } from "@/lib/tree";
import type { ItemMeta, ItemType, TreeNode } from "@/types";

type CreateResult =
  | { data: ItemMeta; error?: undefined }
  | { error: string; data?: undefined };

type MutationResult =
  | { ok: true; error?: undefined }
  | { ok?: undefined; error: string };

interface TreeCtx {
  tree: TreeNode[];
  items: ItemMeta[];
  renameItem: (id: string, newName: string) => Promise<MutationResult>;
  deleteItem: (id: string) => Promise<MutationResult>;
  moveItem: (id: string, newParentId: string | null) => Promise<MutationResult>;
  createItem: (
    parentId: string | null,
    name: string,
    type: ItemType,
    content?: string,
  ) => Promise<CreateResult>;
}

const TreeContext = createContext<TreeCtx | null>(null);

export function useTree(): TreeCtx {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTree must be inside TreeProvider");
  return ctx;
}

export function isPendingItemId(id: string): boolean {
  return id.startsWith("temp-");
}

export function TreeProvider({
  initialItems,
  children,
}: {
  initialItems: ItemMeta[];
  children: ReactNode;
}) {
  const [items, setItems] = useState<ItemMeta[]>(initialItems);
  const [inFlight, setInFlight] = useState(0);

  // Ref lets mutation callbacks read the latest items without
  // recreating themselves on every items change.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Resync from the server prop only when nothing is mid-flight,
  // so an in-flight optimistic mutation isn't overwritten by a
  // stale snapshot from a prior revalidation.
  useEffect(() => {
    if (inFlight === 0) {
      setItems(initialItems);
    }
  }, [initialItems, inFlight]);

  const tree = useMemo(() => buildTree(items), [items]);

  const renameItem = useCallback(
    async (id: string, newName: string): Promise<MutationResult> => {
      const trimmed = newName.trim();
      if (!trimmed) return { error: "name required" };

      const snapshot = itemsRef.current;
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, name: trimmed } : it)),
      );

      setInFlight((c) => c + 1);
      try {
        const res = await actions.renameItem(id, trimmed);
        if (res.error) {
          setItems(snapshot);
          return { error: res.error };
        }
        return { ok: true };
      } finally {
        setInFlight((c) => c - 1);
      }
    },
    [],
  );

  const deleteItem = useCallback(
    async (id: string): Promise<MutationResult> => {
      const snapshot = itemsRef.current;

      // collect id + all descendants
      const toRemove = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const it of snapshot) {
          if (
            it.parent_id &&
            toRemove.has(it.parent_id) &&
            !toRemove.has(it.id)
          ) {
            toRemove.add(it.id);
            grew = true;
          }
        }
      }
      setItems((prev) => prev.filter((it) => !toRemove.has(it.id)));

      setInFlight((c) => c + 1);
      try {
        const res = await actions.deleteItem(id);
        if (res.error) {
          setItems(snapshot);
          return { error: res.error };
        }
        return { ok: true };
      } finally {
        setInFlight((c) => c - 1);
      }
    },
    [],
  );

  const moveItem = useCallback(
    async (id: string, newParentId: string | null): Promise<MutationResult> => {
      if (id === newParentId) return { error: "cannot move into itself" };

      const snapshot = itemsRef.current;

      // Block moves into own descendant up front (cheaper than waiting
      // for the server to refuse, and keeps optimistic UI honest).
      if (newParentId) {
        let cursor: string | null = newParentId;
        while (cursor) {
          if (cursor === id) {
            return { error: "cannot move into a descendant" };
          }
          const parent = snapshot.find((i) => i.id === cursor);
          cursor = parent?.parent_id ?? null;
        }
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, parent_id: newParentId } : it,
        ),
      );

      setInFlight((c) => c + 1);
      try {
        const res = await actions.moveItem(id, newParentId);
        if (res.error) {
          setItems(snapshot);
          return { error: res.error };
        }
        return { ok: true };
      } finally {
        setInFlight((c) => c - 1);
      }
    },
    [],
  );

  const createItem = useCallback(
    async (
      parentId: string | null,
      name: string,
      type: ItemType,
      content: string = "",
    ): Promise<CreateResult> => {
      const trimmed = name.trim();
      if (!trimmed) return { error: "name required" };

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();
      const optimistic: ItemMeta = {
        id: tempId,
        user_id: "",
        parent_id: parentId,
        name: trimmed,
        type,
        created_at: now,
        updated_at: now,
      };

      const snapshot = itemsRef.current;
      setItems((prev) => [...prev, optimistic]);

      setInFlight((c) => c + 1);
      try {
        const res = await actions.createItem(parentId, trimmed, type, content);
        if (res.error || !res.data) {
          setItems(snapshot);
          return { error: res.error ?? "failed to create" };
        }
        const real = res.data as ItemMeta;
        setItems((prev) => prev.map((it) => (it.id === tempId ? real : it)));
        return { data: real };
      } finally {
        setInFlight((c) => c - 1);
      }
    },
    [],
  );

  return (
    <TreeContext.Provider
      value={{ tree, items, renameItem, deleteItem, moveItem, createItem }}
    >
      {children}
    </TreeContext.Provider>
  );
}
