"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ItemMeta, TreeNode } from "@/types";
import { buildTree } from "@/lib/tree";

interface TreeContextValue {
  tree: TreeNode[];
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

function flattenTree(nodes: TreeNode[]): ItemMeta[] {
  const out: ItemMeta[] = [];
  const walk = (ns: TreeNode[]) => {
    for (const n of ns) {
      const { children: _children, ...meta } = n;
      void _children;
      out.push(meta);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function TreeProvider({
  initialTree,
  children,
}: {
  initialTree: TreeNode[];
  children: ReactNode;
}) {
  // useState's initial value runs only on first render — subsequent
  // initialTree prop changes (e.g. after navigation) are ignored.
  // Client state stays the source of truth post-mount.
  const [items, setItems] = useState<ItemMeta[]>(() =>
    flattenTree(initialTree),
  );

  const tree = buildTree(items);

  const addNode = useCallback((item: ItemMeta) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const renameNode = useCallback((id: string, newName: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name: newName } : i)),
    );
  }, []);

  const removeNode = useCallback((id: string) => {
    setItems((prev) => {
      // Cascade: also remove descendants
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
      value={{ tree, addNode, renameNode, removeNode, moveNode }}
    >
      {children}
    </TreeContext.Provider>
  );
}
