"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, FolderPlus, Upload } from "lucide-react";
import { createItem } from "@/app/actions";
import { usePending } from "./PendingProvider";

export default function SidebarHeader() {
  const router = useRouter();
  const { run } = usePending();
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current) return;
    if (!name.trim() || !creating) {
      setCreating(null);
      setName("");
      return;
    }
    inFlight.current = true;
    try {
      const res = await run(() => createItem(null, name, creating));
      if (res.data && creating === "file") {
        router.push(`/?file=${res.data.id}`);
      }
    } finally {
      inFlight.current = false;
    }
    setCreating(null);
    setName("");
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".txt")) continue;
      const content = await file.text();
      await run(() => createItem(null, file.name, "file", content));
    }
    e.target.value = "";
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            title="import .txt files"
          >
            <Upload size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            multiple
            onChange={handleImportFiles}
            className="hidden"
          />
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
