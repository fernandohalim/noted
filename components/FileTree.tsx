"use client";

import { useState } from "react";
import type { TreeNode } from "@/types";
import TreeNodeComponent from "./TreeNode";
import { useTree } from "./TreeProvider";

export default function FileTree({
  nodes,
  selectedId,
}: {
  nodes: TreeNode[];
  selectedId?: string;
}) {
  const { moveItem } = useTree();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isRootDragOver, setIsRootDragOver] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/x-noted-id")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsRootDragOver(true);
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);
    const draggedId = e.dataTransfer.getData("application/x-noted-id");
    if (!draggedId) return;
    const res = await moveItem(draggedId, null);
    if (res.error) alert(res.error);
  };

  return (
    <div
      onDragOver={handleRootDragOver}
      onDragLeave={() => setIsRootDragOver(false)}
      onDrop={handleRootDrop}
      className={`min-h-full ${isRootDragOver ? "bg-bg-elevated/30" : ""}`}
    >
      <ul>
        {nodes.map((node) => (
          <TreeNodeComponent
            key={node.id}
            node={node}
            selectedId={selectedId}
            depth={0}
            expandedSet={expanded}
            onToggle={toggle}
          />
        ))}
      </ul>
    </div>
  );
}
