"use client";

import { useEffect, useState } from "react";
import type { Item, TreeNode } from "@/types";
import { getItem } from "@/lib/data";
import { localPeekItem } from "@/lib/local-store";
import Editor from "./Editor";

export default function Workstation({
  selectedId,
  tree,
}: {
  selectedId: string | undefined;
  tree: TreeNode[];
}) {
  if (!selectedId) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-text-muted">
        select a file to start editing
      </main>
    );
  }
  return <FileLoader key={selectedId} fileId={selectedId} tree={tree} />;
}

function FileLoader({ fileId, tree }: { fileId: string; tree: TreeNode[] }) {
  const [item, setItem] = useState<Item | null | undefined>(() =>
    localPeekItem(fileId),
  );

  useEffect(() => {
    if (localPeekItem(fileId)) return; // cache hit — already rendered
    let cancelled = false;
    getItem(fileId).then((it) => {
      if (!cancelled) setItem(it);
    });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (item === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-text-muted">
        opening...
      </main>
    );
  }
  if (item === null) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-text-muted">
        file not found
      </main>
    );
  }
  return <Editor file={item} tree={tree} />;
}
