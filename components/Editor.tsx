"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { RotateCw, WifiOff } from "lucide-react";
import type { Item } from "@/types";
import { updateFileContent, refreshFileContent } from "@/app/actions";
import { usePending } from "./PendingProvider";
import { useConfirm } from "./ConfirmDialog";
import { customTheme } from "@/lib/editor-theme";
import { enqueueSave, getPendingSave, removeFromQueue } from "@/lib/sync-queue";
import { useOnline } from "@/lib/use-online";

type SaveState = "saved" | "unsaved" | "saving" | "error" | "queued";

export default function Editor({ file }: { file: Item }) {
  const { run } = usePending();
  const confirm = useConfirm();
  const isOnline = useOnline();

  // If we have a pending save from offline, restore it
  const queued = typeof window !== "undefined" ? getPendingSave(file.id) : null;
  const initialContent = queued?.content ?? file.content;

  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<SaveState>(
    queued ? "queued" : "saved",
  );

  const contentRef = useRef(initialContent);
  const savedRef = useRef(file.content);
  const updatedAtRef = useRef(file.updated_at);
  const savingRef = useRef(false);
  const editorViewRef = useRef<EditorView | null>(null);

  const replaceEditorContent = useCallback(
    (newContent: string, newUpdatedAt: string) => {
      const view = editorViewRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newContent },
        });
      }
      contentRef.current = newContent;
      savedRef.current = newContent;
      updatedAtRef.current = newUpdatedAt;
      setContent(newContent);
      setSaveState("saved");
      removeFromQueue(file.id);
    },
    [file.id],
  );

  const save = useCallback(
    async (force = false): Promise<void> => {
      if (savingRef.current) return;
      if (contentRef.current === savedRef.current) return;

      if (!navigator.onLine) {
        enqueueSave({
          fileId: file.id,
          content: contentRef.current,
          expectedUpdatedAt: updatedAtRef.current,
          queuedAt: Date.now(),
        });
        savedRef.current = contentRef.current;
        setSaveState("queued");
        return;
      }

      savingRef.current = true;
      try {
        const captured = contentRef.current;
        setSaveState("saving");
        const res = await run(() =>
          updateFileContent(
            file.id,
            captured,
            force ? undefined : updatedAtRef.current,
          ),
        );

        if (res.error === "conflict") {
          savingRef.current = false;
          const overwrite = await confirm({
            title: "this file was changed elsewhere",
            message:
              "overwrite the other version with yours, or discard yours and reload?",
            confirmText: "overwrite",
            cancelText: "discard mine",
            danger: true,
          });
          if (overwrite) {
            return save(true);
          } else {
            const refresh = await run(() => refreshFileContent(file.id));
            if ("content" in refresh && refresh.content !== undefined) {
              replaceEditorContent(refresh.content, refresh.updatedAt);
            }
          }
        } else if (res.error) {
          setSaveState("error");
        } else {
          savedRef.current = captured;
          if ("updatedAt" in res && res.updatedAt)
            updatedAtRef.current = res.updatedAt;
          removeFromQueue(file.id);
          setSaveState(contentRef.current === captured ? "saved" : "unsaved");
        }
      } finally {
        savingRef.current = false;
      }
    },
    [run, file.id, confirm, replaceEditorContent],
  );

  const handleRefresh = useCallback(async () => {
    if (contentRef.current !== savedRef.current) {
      const ok = await confirm({
        title: "discard unsaved changes?",
        message:
          "reload this file from the server. your unsaved edits will be lost.",
        confirmText: "reload",
        danger: true,
      });
      if (!ok) return;
    }
    const refresh = await run(() => refreshFileContent(file.id));
    if ("content" in refresh && refresh.content !== undefined) {
      replaceEditorContent(refresh.content, refresh.updatedAt);
    }
  }, [run, file.id, confirm, replaceEditorContent]);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        save();
      } else if (key === "r" && !e.shiftKey) {
        e.preventDefault();
        await handleRefresh();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [save, handleRefresh]);

  // After SyncManager replays our file's queued save, refresh our updated_at stamp
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.fileId !== file.id) return;
      refreshFileContent(file.id).then((res) => {
        if ("updatedAt" in res && res.updatedAt) {
          updatedAtRef.current = res.updatedAt;
          if (contentRef.current === savedRef.current) setSaveState("saved");
        }
      });
    };
    window.addEventListener("noted:synced", handler);
    return () => window.removeEventListener("noted:synced", handler);
  }, [file.id]);

  const onChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
    setSaveState(value === savedRef.current ? "saved" : "unsaved");
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="h-9 border-b border-border flex items-center justify-between px-3 text-xs shrink-0">
        <span className="text-text-muted truncate">{file.name}</span>
        <div className="flex items-center gap-3">
          {!isOnline && (
            <span
              className="flex items-center gap-1 text-yellow-500"
              title="working offline"
            >
              <WifiOff size={10} />
              <span className="hidden sm:inline">offline</span>
            </span>
          )}
          <button
            onClick={handleRefresh}
            title="reload from server"
            className="text-text-muted hover:text-text"
          >
            <RotateCw size={12} />
          </button>
          <SaveIndicator state={saveState} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={content}
          onChange={onChange}
          onBlur={(event) => {
            const newTarget = event.relatedTarget as HTMLElement | null;
            if (newTarget && newTarget.closest(".cm-editor")) return;
            save();
          }}
          onCreateEditor={(view) => {
            editorViewRef.current = view;
          }}
          theme={customTheme}
          height="100%"
          extensions={[
            markdown({ codeLanguages: languages }),
            EditorView.lineWrapping,
            EditorView.scrollMargins.of(() => ({ bottom: 120, top: 40 })),
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
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/i.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl";
  switch (state) {
    case "saved":
      return <span className="text-text-muted">saved</span>;
    case "unsaved":
      return (
        <span className="flex items-center gap-1.5 text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="hidden sm:inline">unsaved · {mod}S</span>
          <span className="sm:hidden">unsaved</span>
        </span>
      );
    case "saving":
      return <span className="text-text-muted">saving...</span>;
    case "queued":
      return (
        <span className="flex items-center gap-1.5 text-yellow-500">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          <span className="hidden sm:inline">queued · syncs when online</span>
          <span className="sm:hidden">queued</span>
        </span>
      );
    case "error":
      return <span className="text-red-400">save failed — retry?</span>;
  }
}
