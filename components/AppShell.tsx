"use client";

import { useState } from "react";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";
import Workstation from "./Workstation";
import ShortcutPalette from "./ShortcutPalette";
import SyncProvider, { useSync } from "./SyncProvider";
import { TreeProvider, useTree } from "./TreeProvider";

export default function AppShell({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  return (
    <SyncProvider userId={userId}>
      <TreeBootstrap email={email} />
    </SyncProvider>
  );
}

function TreeBootstrap({ email }: { email: string }) {
  const { initialItems } = useSync();
  return (
    <TreeProvider initialItems={initialItems}>
      <AppShellInner email={email} />
    </TreeProvider>
  );
}

function AppShellInner({ email }: { email: string }) {
  const { tree, selectedId } = useTree();
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
        <Workstation selectedId={selectedId} tree={tree} />
      </div>
      <ShortcutPalette />
    </div>
  );
}
