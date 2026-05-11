"use client";

import { type ReactNode } from "react";
import { ConfirmProvider } from "./ConfirmDialog";
import { PromptProvider } from "./PromptDialog";
import { PendingProvider } from "./PendingProvider";
import ProgressBar from "./ProgressBar";
import ShortcutPalette from "./ShortcutPalette";
import SearchModal from "./SearchModal";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PendingProvider>
      <ConfirmProvider>
        <PromptProvider>
          <ProgressBar />
          {children}
          <ShortcutPalette />
          <SearchModal />
        </PromptProvider>
      </ConfirmProvider>
    </PendingProvider>
  );
}
