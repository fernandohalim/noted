"use client";

import { useState } from "react";
import type { TreeNode, Item } from "@/types";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";
import Workstation from "./Workstation";
import { TreeProvider, useTree } from "./TreeProvider";

export default function AppShell({
  email,
  tree,
  selectedId,
  selectedFile,
}: {
  email: string;
  tree: TreeNode[];
  selectedId?: string;
  selectedFile: Item | null;
}) {
  return (
    <TreeProvider initialTree={tree}>
      <AppShellInner
        email={email}
        selectedId={selectedId}
        selectedFile={selectedFile}
      />
    </TreeProvider>
  );
}

function AppShellInner({
  email,
  selectedId,
  selectedFile,
}: {
  email: string;
  selectedId?: string;
  selectedFile: Item | null;
}) {
  const { tree } = useTree();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);

  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setSidebarOpen(false);
  }

  return (
    <div className="h-dvh flex flex-col">
      <TitleBar
        email={email}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar tree={tree} selectedId={selectedId} isOpen={sidebarOpen} />
        <Workstation file={selectedFile} tree={tree} />
      </div>
    </div>
  );
}
