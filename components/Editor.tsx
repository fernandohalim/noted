"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import type { Item } from "@/types";
import { updateFileContent } from "@/app/actions";
import { usePending } from "./PendingProvider";
import { customTheme } from "@/lib/editor-theme";

type SaveState = "saved" | "unsaved" | "saving" | "error";

export default function Editor({ file }: { file: Item }) {
  const { run } = usePending();

  // Initialized once per mount; `key={file.id}` in Workstation remounts on file switch.
  const [content, setContent] = useState(file.content);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const contentRef = useRef(file.content);
  const savedRef = useRef(file.content);
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    if (savingRef.current) return;
    if (contentRef.current === savedRef.current) return;
    savingRef.current = true;
    try {
      const captured = contentRef.current;
      setSaveState("saving");
      const res = await run(() => updateFileContent(file.id, captured));
      if (res.error) {
        setSaveState("error");
      } else {
        savedRef.current = captured;
        setSaveState(contentRef.current === captured ? "saved" : "unsaved");
      }
    } finally {
      savingRef.current = false;
    }
  }, [run, file.id]);

  // Ctrl/Cmd+S anywhere while a file is open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [save]);

  const onChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
    setSaveState(value === savedRef.current ? "saved" : "unsaved");
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="h-9 border-b border-[var(--color-border)] flex items-center justify-between px-3 text-xs flex-shrink-0">
        <span className="text-[var(--color-text-muted)] truncate">
          {file.name}
        </span>
        <SaveIndicator state={saveState} />
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={content}
          onChange={onChange}
          onBlur={save}
          theme={customTheme}
          height="100%"
          extensions={[
            markdown({ codeLanguages: languages }),
            EditorView.lineWrapping,
          ]}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            highlightSelectionMatches: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            searchKeymap: true,
          }}
          style={{ fontSize: 14, height: "100%" }}
        />
      </div>
    </main>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  switch (state) {
    case "saved":
      return <span className="text-[var(--color-text-muted)]">saved</span>;
    case "unsaved":
      return (
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          unsaved · ⌘S to save
        </span>
      );
    case "saving":
      return <span className="text-[var(--color-text-muted)]">saving...</span>;
    case "error":
      return <span className="text-red-400">save failed — retry?</span>;
  }
}
