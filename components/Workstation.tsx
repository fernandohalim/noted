import type { Item, TreeNode } from "@/types";
import Editor from "./Editor";

export default function Workstation({
  file,
  tree,
}: {
  file: Item | null;
  tree: TreeNode[];
}) {
  if (!file) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-text-muted">
        select a file to start editing
      </main>
    );
  }
  return <Editor key={file.id} file={file} tree={tree} />;
}
