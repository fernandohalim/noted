"use client";

import { type ReactNode } from "react";
import { ConfirmProvider } from "./ConfirmDialog";
import { PromptProvider } from "./PromptDialog";
import { PendingProvider } from "./PendingProvider";
import ProgressBar from "./ProgressBar";
import ShortcutPalette from "./ShortcutPalette";
import SyncManager from "./SyncManager";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import { PendingItemsProvider } from "./PendingItemsProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PendingProvider>
      <PendingItemsProvider>
        <ConfirmProvider>
          <PromptProvider>
            <ProgressBar />
            {children}
            <ShortcutPalette />
            <SyncManager />
            <ServiceWorkerRegister />
            tsx{" "}
          </PromptProvider>
        </ConfirmProvider>
      </PendingItemsProvider>
    </PendingProvider>
  );
}
