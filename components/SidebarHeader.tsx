"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, FolderPlus } from "lucide-react";
import { createItem } from "@/app/actions";
import { usePending } from "./PendingProvider";

export default function SidebarHeader() {
  const router = useRouter();
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [name, setName] = useState("");
  const { run } = usePending();
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current) return;
    if (!name.trim() || !creating) {
      setCreating(null);
      setName("");
      return;
    }
    const res = await run(() => createItem(null, name, creating));
    if (res.data && creating === "file") {
      router.push(`/?file=${res.data.id}`);
    }
    setCreating(null);
    setName("");
  };

  return (
    <div className="border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-[var(--color-text-muted)]">files</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setCreating("file");
              setName("");
            }}
            className="p-1 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            title="new file"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => {
              setCreating("folder");
              setName("");
            }}
            className="p-1 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            title="new folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      {creating && (
        <div className="px-3 pb-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setCreating(null);
                setName("");
              }
            }}
            placeholder={creating === "file" ? "filename.txt" : "folder name"}
            className="w-full px-2 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-accent)] outline-none text-xs"
          />
        </div>
      )}
    </div>
  );
}
