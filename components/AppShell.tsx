"use client";

import { useState } from "react";
import type { ItemMeta, Item } from "@/types";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";
import Workstation from "./Workstation";
import { TreeProvider } from "./TreeProvider";
import ShortcutPalette from "./ShortcutPalette";

export default function AppShell({
  email,
  initialItems,
  selectedId,
  selectedFile,
}: {
  email: string;
  initialItems: ItemMeta[];
  selectedId?: string;
  selectedFile: Item | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);

  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setSidebarOpen(false);
  }

  return (
    <TreeProvider initialItems={initialItems}>
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
          <Sidebar selectedId={selectedId} isOpen={sidebarOpen} />
          <Workstation file={selectedFile} />
        </div>
      </div>
      <ShortcutPalette />
    </TreeProvider>
  );
}
