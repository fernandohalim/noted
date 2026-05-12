"use client";

import { type ReactNode } from "react";
import { ConfirmProvider } from "./ConfirmDialog";
import { PromptProvider } from "./PromptDialog";
import { PendingProvider } from "./PendingProvider";
import ProgressBar from "./ProgressBar";
import ShortcutPalette from "./ShortcutPalette";
import SyncManager from "./SyncManager";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PendingProvider>
      <ConfirmProvider>
        <PromptProvider>
          <ProgressBar />
          {children}
          <ShortcutPalette />
          <SyncManager />
          <ServiceWorkerRegister />
        </PromptProvider>
      </ConfirmProvider>
    </PendingProvider>
  );
}
