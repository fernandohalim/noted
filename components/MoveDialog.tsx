"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronRight, Folder, Home } from "lucide-react";
import { buildTree } from "@/lib/tree";
import type { TreeNode } from "@/types";
import { useTree } from "./TreeProvider";

export default function MoveDialog({
  itemId,
  itemName,
  currentParentId,
  onClose,
}: {
  itemId: string;
  itemName: string;
  currentParentId: string | null;
  onClose: () => void;
}) {
  const { items, moveItem } = useTree();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);

  const folderTree = useMemo(
    () => buildTree(items.filter((i) => i.type === "folder")),
    [items],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleMove = async (targetId: string | null) => {
    if (inFlight.current) return;
    if (targetId === currentParentId) {
      onClose();
      return;
    }
    inFlight.current = true;
    const res = await moveItem(itemId, targetId);
    inFlight.current = false;
    if (res.error) alert(res.error);
    onClose();
  };

  const renderFolder = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.id === itemId) return null;
    const childFolders = node.children.filter(
      (c) => c.type === "folder" && c.id !== itemId,
    );
    const isExpanded = expanded.has(node.id);

    return (
      <div key={node.id}>
        <div
          onClick={() => handleMove(node.id)}
          className="flex items-center gap-1 px-2 py-1 cursor-pointer text-sm hover:bg-[var(--color-bg-hover)]"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {childFolders.length > 0 ? (
            <ChevronRight
              size={12}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                });
              }}
              className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          ) : (
            <span className="w-3" />
          )}
          <Folder size={14} className="text-[var(--color-text-muted)]" />
          <span className="truncate">{node.name}</span>
        </div>
        {isExpanded && childFolders.map((c) => renderFolder(c, depth + 1))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-md flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm">move &quot;{itemName}&quot; to...</h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <div
            onClick={() => handleMove(null)}
            className="flex items-center gap-2 px-3 py-1 cursor-pointer text-sm hover:bg-[var(--color-bg-hover)]"
          >
            <Home size={14} className="text-[var(--color-text-muted)]" />
            <span>root</span>
          </div>
          {folderTree.map((n) => renderFolder(n, 0))}
        </div>
        <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
