"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import type { ItemMeta, TreeNode } from "@/types";
import { buildTree } from "@/lib/tree";
import { localGetAllItems } from "@/lib/local-store";

interface TreeContextValue {
  tree: TreeNode[];
  selectedId: string | undefined;
  openFile: (id: string) => void;
  closeFile: () => void;
  addNode: (item: ItemMeta) => void;
  renameNode: (id: string, newName: string) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, newParentId: string | null) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

export function useTree(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTree must be used within TreeProvider");
  return ctx;
}

export function TreeProvider({
  initialItems,
  children,
}: {
  initialItems: ItemMeta[];
  children: ReactNode;
}) {
  const [items, setItems] = useState<ItemMeta[]>(initialItems);

  const searchParams = useSearchParams();

  // derive the selected id directly from the url query parameters
  const selectedId = searchParams.get("file") ?? undefined;

  const tree = buildTree(items);

  // refresh the tree after a background sync brought new data
  useEffect(() => {
    const reload = () => {
      localGetAllItems().then(setItems);
    };
    window.addEventListener("noted:items-updated", reload);
    return () => window.removeEventListener("noted:items-updated", reload);
  }, []);

  const openFile = useCallback((id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("file", id);
    window.history.pushState(null, "", `?${params.toString()}`);
  }, []);

  const closeFile = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("file");
    const query = params.toString();
    window.history.pushState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }, []);

  const addNode = useCallback((item: ItemMeta) => {
    setItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
  }, []);

  const renameNode = useCallback((id: string, newName: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name: newName } : i)),
    );
  }, []);

  const removeNode = useCallback((id: string) => {
    setItems((prev) => {
      const toRemove = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const it of prev) {
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
      return prev.filter((i) => !toRemove.has(i.id));
    });
  }, []);

  const moveNode = useCallback((id: string, newParentId: string | null) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, parent_id: newParentId } : i)),
    );
  }, []);

  return (
    <TreeContext.Provider
      value={{
        tree,
        selectedId,
        openFile,
        closeFile,
        addNode,
        renameNode,
        removeNode,
        moveNode,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
}
