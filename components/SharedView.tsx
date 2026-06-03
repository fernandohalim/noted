"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Eye } from "lucide-react";
import { customTheme } from "@/lib/editor-theme";
import { markdownDecorations } from "@/lib/markdown-decorations";
import { recordViewed, listViewed } from "@/lib/local-store";
import type { ViewedNote } from "@/types";

export default function SharedView({
  id,
  name,
  content,
  isOwner,
}: {
  id: string;
  name: string;
  content: string;
  isOwner: boolean;
}) {
  const [recent, setRecent] = useState<ViewedNote[]>([]);

  useEffect(() => {
    (async () => {
      if (!isOwner) {
        await recordViewed({ id, name, viewedAt: Date.now() });
        window.dispatchEvent(new Event("noted:viewed-updated"));
      }
      const all = await listViewed();
      setRecent(all.filter((v) => v.id !== id));
    })();
  }, [id, name, isOwner]);

  return (
    <div className="flex flex-col h-dvh font-mono">
      <header className="h-9 border-b border-border flex items-center justify-between px-3 text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <span className="truncate">{name}</span>
          <span className="flex items-center gap-1 text-text-muted shrink-0">
            <Eye size={10} /> read-only
          </span>
        </div>
        <Link href="/" className="text-text-muted hover:text-text shrink-0">
          noted ↗
        </Link>
      </header>

      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={content}
          editable={false}
          readOnly
          theme={customTheme}
          height="100%"
          extensions={[
            markdown({ codeLanguages: languages }),
            EditorView.lineWrapping,
            markdownDecorations,
          ]}
          basicSetup={{
            lineNumbers: false,
            foldGutter: true,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            highlightSelectionMatches: false,
          }}
          style={{ fontSize: 14, height: "100%" }}
        />
      </div>

      {recent.length > 0 && (
        <div className="border-t border-border px-3 py-2 text-xs text-text-muted shrink-0 max-h-28 overflow-y-auto">
          <div className="mb-1 flex items-center gap-1">
            <Eye size={11} /> recently viewed
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {recent.slice(0, 8).map((v) => (
              <a
                key={v.id}
                href={`/share/${v.id}`}
                className="hover:text-text underline truncate max-w-40"
              >
                {v.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
