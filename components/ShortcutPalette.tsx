"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createItem } from "@/app/actions";
import { usePending } from "./PendingProvider";
import { usePrompt } from "./PromptDialog";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";
const SHIFT = isMac ? "⇧" : "Shift";
const ALT = isMac ? "⌥" : "Alt";

interface Shortcut {
  keys: string[];
  desc: string;
}

const groups: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "general",
    shortcuts: [
      { keys: ["?"], desc: "show this guide" },
      { keys: ["Esc"], desc: "close any modal or cancel input" },
    ],
  },
  {
    title: "files",
    shortcuts: [
      { keys: ["n"], desc: "new file at root" },
      { keys: [SHIFT, "N"], desc: "new folder at root" },
      { keys: ["Enter"], desc: "confirm rename / create" },
      { keys: ["drag"], desc: "drag a node onto a folder to move it" },
      { keys: ["right-click"], desc: "open context menu on a node" },
    ],
  },
  {
    title: "editor",
    shortcuts: [
      { keys: [MOD, "S"], desc: "save current file" },
      { keys: [MOD, "F"], desc: "find/replace within current file" },
      { keys: [MOD, "R"], desc: "reload file from server" },
      { keys: ["Enter"], desc: "new line — keeps indent and continues lists" },
      {
        keys: ["Tab"],
        desc: "skip to next tab stop (or indent selected lines)",
      },
      { keys: [SHIFT, "Tab"], desc: "outdent the current line or selection" },
      { keys: [MOD, "D"], desc: "duplicate the current line" },
      { keys: [ALT, "↑"], desc: "move line up" },
      { keys: [ALT, "↓"], desc: "move line down" },
      { keys: [MOD, "/"], desc: "toggle comment (inside code blocks)" },
    ],
  },
  {
    title: "formatting",
    shortcuts: [
      { keys: [MOD, "B"], desc: "wrap selection in bold (**...**)" },
      { keys: [MOD, "I"], desc: "wrap selection in italic (*...*)" },
      { keys: [MOD, "E"], desc: "wrap selection in inline code (`...`)" },
    ],
  },
];
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable ||
    !!el.closest(".cm-content")
  );
}

export default function ShortcutPalette() {
  const router = useRouter();
  const { run } = usePending();
  const prompt = usePrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      // Esc closes the palette
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "n") {
        e.preventDefault();
        const name = await prompt({
          title: "new file",
          placeholder: "filename.txt",
        });
        if (name) {
          const res = await run(() => createItem(null, name, "file"));
          if (res.data) router.push(`/?file=${res.data.id}`);
        }
      } else if (e.key === "N") {
        e.preventDefault();
        const name = await prompt({
          title: "new folder",
          placeholder: "folder name",
        });
        if (name) await run(() => createItem(null, name, "folder"));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, router, run, prompt]);

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
