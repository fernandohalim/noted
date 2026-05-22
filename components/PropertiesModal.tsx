"use client";

import { useEffect, useMemo, useState } from "react";
import { File, Folder } from "lucide-react";
import { getItem, getFolderTree } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { useTree } from "./TreeProvider";
import type { Item, TreeNode } from "@/types";

function findPath(
  nodes: TreeNode[],
  id: string,
  trail: string[] = [],
): string[] | null {
  for (const n of nodes) {
    const next = [...trail, n.name];
    if (n.id === id) return next;
    if (n.children.length) {
      const found = findPath(n.children, id, next);
      if (found) return found;
    }
  }
  return null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 items-baseline">
      <dt className="text-text-muted w-28 shrink-0">{label}</dt>
      <dd className="text-text break-words min-w-0">{value}</dd>
    </div>
  );
}

export default function PropertiesModal({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const { tree } = useTree();
  const [item, setItem] = useState<Item | null>(null);
  const [email, setEmail] = useState("");
  const [folderStats, setFolderStats] = useState<{
    files: number;
    folders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const it = await getItem(itemId);
      if (cancelled) return;
      setItem(it);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setEmail(user?.email ?? "unknown");

      if (it && it.type === "folder") {
        const res = await getFolderTree(itemId);
        if (!cancelled) {
          setFolderStats({
            files: res.data.filter((d) => d.type === "file").length,
            folders: res.data.filter((d) => d.type === "folder").length,
          });
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const fullPath = useMemo(() => {
    const p = findPath(tree, itemId);
    return p ? p.join(" / ") : (item?.name ?? "");
  }, [tree, itemId, item]);

  const content = item && item.type === "file" ? item.content : "";
  const charCount = content.length;
  const lineCount = content.length ? content.split("\n").length : 0;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="bg-bg border border-border w-full max-w-md shadow-2xl flex flex-col relative z-10 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-bg-elevated">
          <span className="text-text text-sm font-bold">properties</span>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors text-lg cursor-pointer flex items-center justify-center w-6 h-6 leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {loading || !item ? (
            <div className="py-6 text-center text-xs text-text-muted">
              loading...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                {item.type === "folder" ? (
                  <Folder size={16} className="text-text shrink-0" />
                ) : (
                  <File size={16} className="text-text-muted shrink-0" />
                )}
                <span className="text-sm text-text truncate">{item.name}</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <Row label="type" value={item.type} />
                <Row label="full path" value={fullPath} />
                <Row label="created" value={fmtDate(item.created_at)} />
                <Row label="last updated" value={fmtDate(item.updated_at)} />
                <Row label="created by" value={email} />

                {item.type === "file" ? (
                  <>
                    <Row label="words" value={wordCount.toLocaleString()} />
                    <Row
                      label="characters"
                      value={charCount.toLocaleString()}
                    />
                    <Row label="lines" value={lineCount.toLocaleString()} />
                  </>
                ) : (
                  <>
                    <Row
                      label="files"
                      value={folderStats ? String(folderStats.files) : "—"}
                    />
                    <Row
                      label="folders"
                      value={folderStats ? String(folderStats.folders) : "—"}
                    />
                  </>
                )}
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
