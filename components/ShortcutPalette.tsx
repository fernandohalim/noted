"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createItem } from "@/app/actions";
import { usePending } from "./PendingProvider";
import { usePrompt } from "./PromptDialog";

interface Shortcut {
  keys: string[];
  desc: string;
}

const groups: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "general",
    shortcuts: [
      { keys: ["⌘", "/"], desc: "show this guide" },
      { keys: ["esc"], desc: "close any modal or cancel input" },
    ],
  },
  {
    title: "files",
    shortcuts: [
      { keys: ["⌘", "N"], desc: "new file at root" },
      { keys: ["⌘", "⇧", "N"], desc: "new folder at root" },
      { keys: ["enter"], desc: "confirm rename / create" },
      { keys: ["right-click"], desc: "open context menu on a node" },
    ],
  },
  {
    title: "editor",
    shortcuts: [
      { keys: ["⌘", "S"], desc: "save current file" },
      { keys: ["⌘", "F"], desc: "find within current file" },
      { keys: ["blur"], desc: "auto-save on focus loss" },
    ],
  },
  {
    title: "search",
    shortcuts: [
      { keys: ["⌘", "⇧", "F"], desc: "global search across all files" },
      { keys: ["↑", "↓"], desc: "navigate results" },
      { keys: ["enter"], desc: "open selected result" },
    ],
  },
];

export default function ShortcutPalette() {
  const router = useRouter();
  const { run } = usePending();
  const prompt = usePrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Toggle help
      if (mod && key === "/") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      // Skip mutating shortcuts if user is typing in an input
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        !!target.closest(".cm-content");

      if (isTyping) return;

      if (mod && e.shiftKey && key === "n") {
        e.preventDefault();
        const name = await prompt({
          title: "new folder",
          placeholder: "folder name",
        });
        if (name) await run(() => createItem(null, name, "folder"));
      } else if (mod && !e.shiftKey && key === "n") {
        e.preventDefault();
        const name = await prompt({
          title: "new file",
          placeholder: "filename.txt",
        });
        if (name) {
          const res = await run(() => createItem(null, name, "file"));
          if (res.data) router.push(`/?file=${res.data.id}`);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, run, prompt]);

  // Also listen for the title-bar button trigger
  useEffect(() => {
    const handler = () => setOpen((o) => !o);
    window.addEventListener("toggle-shortcuts", handler);
    return () => window.removeEventListener("toggle-shortcuts", handler);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-sm">keyboard shortcuts</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            esc
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {groups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <h4 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                {group.title}
              </h4>
              <ul className="space-y-1.5">
                {group.shortcuts.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm gap-3"
                  >
                    <span>{s.desc}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="px-1.5 py-0.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-w-[22px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
