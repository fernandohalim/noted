"use client";

import type { Item } from "@/types";
import Editor from "./Editor";
import { useTree } from "./TreeProvider";

export default function Workstation({ file }: { file: Item | null }) {
  const { tree } = useTree();

  if (!file) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-text-muted">
        select a file to start editing
      </main>
    );
  }
  return <Editor key={file.id} file={file} tree={tree} />;
}
