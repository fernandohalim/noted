"use client";

import { useState } from "react";
import type { TreeNode } from "@/types";
import TreeNodeComponent from "./TreeNode";

export default function FileTree({
  nodes,
  selectedId,
}: {
  nodes: TreeNode[];
  selectedId?: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
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
  );
}
