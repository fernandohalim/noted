import type { TreeNode } from "@/types";
import SidebarHeader from "./SidebarHeader";
import FileTree from "./FileTree";

export default function Sidebar({
  tree,
  selectedId,
}: {
  tree: TreeNode[];
  selectedId?: string;
}) {
  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col">
      <SidebarHeader />
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
            empty. create your first file.
          </div>
        ) : (
          <FileTree nodes={tree} selectedId={selectedId} />
        )}
      </div>
    </aside>
  );
}
