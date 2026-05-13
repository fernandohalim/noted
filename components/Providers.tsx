"use client";

import { type ReactNode } from "react";
import { ConfirmProvider } from "./ConfirmDialog";
import { PromptProvider } from "./PromptDialog";
import { PendingProvider } from "./PendingProvider";
import ProgressBar from "./ProgressBar";
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
            <SyncManager />
            <ServiceWorkerRegister />
          </PromptProvider>
        </ConfirmProvider>
      </PendingItemsProvider>
    </PendingProvider>
  );
}
