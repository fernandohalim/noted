"use client";

import { useEffect, useRef } from "react";
import { readQueue, removeFromQueue } from "@/lib/sync-queue";
import { updateFileContent } from "@/app/actions";

export default function SyncManager() {
  const syncing = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (syncing.current) return;
      if (!navigator.onLine) return;
      const queue = readQueue();
      if (queue.length === 0) return;

      syncing.current = true;
      try {
        for (const item of queue) {
          try {
            const res = await updateFileContent(
              item.fileId,
              item.content,
              item.expectedUpdatedAt,
            );
            if (!res.error) {
              removeFromQueue(item.fileId);
              window.dispatchEvent(
                new CustomEvent("noted:synced", {
                  detail: { fileId: item.fileId },
                }),
              );
            } else if (res.error === "conflict") {
              window.dispatchEvent(
                new CustomEvent("noted:sync-conflict", {
                  detail: { fileId: item.fileId },
                }),
              );
              // Leave in queue — user resolves manually when they open the file
            }
          } catch {
            // Network blip — leave in queue, retry next online event
          }
        }
      } finally {
        syncing.current = false;
      }
    };

    window.addEventListener("online", sync);
    if (navigator.onLine) sync();
    return () => window.removeEventListener("online", sync);
  }, []);

  return null;
}
