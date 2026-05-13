"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, FolderPlus, Upload } from "lucide-react";
import { createItem as createItemAction } from "@/app/actions";
import { usePending } from "./PendingProvider";
import { useTree } from "./TreeProvider";
import { Loader2 } from "lucide-react";

export default function SidebarHeader() {
  const router = useRouter();
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const { run } = usePending();
  const { createItem } = useTree();

  const submit = async () => {
    if (inFlight.current || busy) return;
    if (!name.trim() || !creating) {
      setCreating(null);
      setName("");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const res = await createItem(null, name, creating);
      if (res.data && creating === "file") {
        router.push(`/?file=${res.data.id}`);
      } else if (res.error) {
        alert(res.error);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    setCreating(null);
    setName("");
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".txt")) continue;
        const content = await file.text();
        await run(() => createItemAction(null, file.name, "file", content));
      }
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-text-muted">files</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setCreating("file");
              setName("");
            }}
            className="p-1 hover:bg-bg-hover text-text-muted hover:text-text"
            title="new file"
            disabled={busy}
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => {
              setCreating("folder");
              setName("");
            }}
            className="p-1 hover:bg-bg-hover text-text-muted hover:text-text"
            title="new folder"
            disabled={busy}
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-bg-hover text-text-muted hover:text-text"
            title="import .txt files"
            disabled={busy}
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
        <div className="px-3 pb-2 flex items-center gap-1">
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
            className="flex-1 px-2 py-1 bg-bg-elevated border border-accent outline-none text-xs"
          />
        </div>
      )}
    </div>
  );
}
