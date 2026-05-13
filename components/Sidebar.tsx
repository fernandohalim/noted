import type { TreeNode } from "@/types";
import SidebarHeader from "./SidebarHeader";
import FileTree from "./FileTree";

export default function Sidebar({
  tree,
  selectedId,
  isOpen = false,
}: {
  tree: TreeNode[];
  selectedId?: string;
  isOpen?: boolean;
}) {
  return (
    <aside
      className={`
        w-64 border-r border-border bg-bg flex flex-col
        absolute md:static inset-y-0 left-0 z-20 h-full
        transform transition-transform duration-200
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      <SidebarHeader />
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-muted">
            empty. create your first file.
          </div>
        ) : (
          <FileTree nodes={tree} selectedId={selectedId} />
        )}
      </div>
    </aside>
  );
}
