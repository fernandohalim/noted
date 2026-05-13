"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap, showTooltip, Tooltip } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { RotateCw, WifiOff } from "lucide-react";
import type { Item, TreeNode } from "@/types";
import { updateFileContent, refreshFileContent } from "@/app/actions";
import { usePending } from "./PendingProvider";
import { useConfirm } from "./ConfirmDialog";
import { customTheme } from "@/lib/editor-theme";
import { enqueueSave, getPendingSave, removeFromQueue } from "@/lib/sync-queue";
import { useOnline } from "@/lib/use-online";
import { Compartment, EditorState, Prec, StateField } from "@codemirror/state";
import { editorCommands } from "@/lib/editor-commands";

const foldGutterTheme = EditorView.theme({
  ".cm-foldGutter": {
    width: "16px",
  },
  ".cm-foldGutter .cm-gutterElement": {
    display: "flex",
    alignItems: "flex-start" /* align to top instead of center */,
    justifyContent: "center",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  ".cm-foldMarker": {
    fontSize: "13px",
    lineHeight: "1",
  },
  ".cm-foldMarker:hover": {
    color: "var(--color-text)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-muted)",
    padding: "0 4px",
    borderRadius: "0px" /* removed rounding to match your theme */,
    margin: "0 4px",
    cursor: "pointer",
  },
  ".cm-foldPlaceholder:hover": {
    backgroundColor: "var(--color-bg-hover)",
    color: "var(--color-text)",
  },
});

type SaveState = "saved" | "unsaved" | "saving" | "error" | "queued";

function getFilePath(
  tree: TreeNode[],
  targetId: string,
  currentPath: string[] = [],
): string[] | null {
  for (const node of tree) {
    if (node.id === targetId) return [...currentPath, node.name];
    if (node.children) {
      const found = getFilePath(node.children, targetId, [
        ...currentPath,
        node.name,
      ]);
      if (found) return found;
    }
  }
  return null;
}

// helper to wrap selected text
function wrapSelection(view: EditorView, before: string, after: string) {
  const range = view.state.selection.ranges[0];
  if (!range) return;
  view.dispatch({
    changes: [
      { from: range.from, insert: before },
      { from: range.to, insert: after },
    ],
    selection: {
      anchor: range.from + before.length,
      head: range.to + before.length,
    },
  });
}

// defines the tooltip extension
const selectionTooltip = StateField.define<readonly Tooltip[]>({
  create(state) {
    return getTooltip(state);
  },
  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips;
    return getTooltip(tr.state);
  },
  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

// builds the actual dom element for the tooltip
function getTooltip(state: EditorState): readonly Tooltip[] {
  const ranges = state.selection.ranges;
  if (ranges.length === 0 || ranges[0].empty) return [];

  const range = ranges[0];
  return [
    {
      pos: Math.min(range.head, range.anchor),
      above: true,
      strictSide: true,
      arrow: true,
      create: (view: EditorView) => {
        const dom = document.createElement("div");
        // using --color-bg-elevated and removing rounded classes
        dom.className =
          "flex items-center gap-1 p-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-none shadow-lg text-xs z-50 text-[var(--color-text)]";

        const boldBtn = document.createElement("button");
        boldBtn.textContent = "B";
        boldBtn.className =
          "font-bold px-2 py-1 hover:bg-[var(--color-bg-hover)] rounded-none cursor-pointer";
        boldBtn.onclick = (e) => {
          e.preventDefault();
          wrapSelection(view, "**", "**");
          view.focus();
        };
        dom.appendChild(boldBtn);

        const italicBtn = document.createElement("button");
        italicBtn.textContent = "I";
        italicBtn.className =
          "italic px-2 py-1 hover:bg-[var(--color-bg-hover)] rounded-none cursor-pointer";
        italicBtn.onclick = (e) => {
          e.preventDefault();
          wrapSelection(view, "*", "*");
          view.focus();
        };
        dom.appendChild(italicBtn);

        const select = document.createElement("select");
        // ensuring text color is explicitly set so it doesn't wash out
        select.className =
          "ml-1 px-2 py-1 bg-transparent hover:bg-[var(--color-bg-hover)] rounded-none outline-none cursor-pointer text-[var(--color-text)]";

        const langs = [
          { val: "", label: "code block..." },
          { val: "js", label: "javascript" },
          { val: "ts", label: "typescript" },
          { val: "sql", label: "sql" },
          { val: "python", label: "python" },
          { val: "html", label: "html" },
          { val: "css", label: "css" },
          { val: "json", label: "json" },
        ];

        langs.forEach((l) => {
          const opt = document.createElement("option");
          opt.value = l.val;
          opt.textContent = l.label;
          // matching the dropdown background to the tooltip container
          opt.className =
            "bg-[var(--color-bg-elevated)] text-[var(--color-text)]";
          select.appendChild(opt);
        });

        select.onchange = (e) => {
          const val = (e.target as HTMLSelectElement).value;
          if (val) {
            wrapSelection(view, "\n```" + val + "\n", "\n```\n");
            select.value = "";
            view.focus();
          }
        };
        dom.appendChild(select);

        return { dom };
      },
    },
  ];
}

export default function Editor({
  file,
  tree,
}: {
  file: Item;
  tree: TreeNode[];
}) {
  const { run } = usePending();
  const confirm = useConfirm();
  const isOnline = useOnline();

  const pathArray = getFilePath(tree, file.id);
  const displayPath = pathArray ? pathArray.join(" / ") : file.name;

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
  const [editableCompartment] = useState(() => new Compartment());

  const setEditable = useCallback(
    (editable: boolean) => {
      const view = editorViewRef.current;
      if (!view) return;
      view.dispatch({
        effects: editableCompartment.reconfigure(
          EditorView.editable.of(editable),
        ),
      });
    },
    [editableCompartment],
  );

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
      setEditable(false);
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
        setEditable(true);
      }
    },
    [setEditable, file.id, run, confirm, replaceEditorContent],
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
        <span className="text-text-muted truncate" title={displayPath}>
          {displayPath}
        </span>{" "}
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
      <div className="flex-1 overflow-hidden relative">
        {saveState === "saving" && (
          <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none transition-colors" />
        )}{" "}
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
            EditorView.scrollMargins.of(() => ({
              bottom:
                typeof window !== "undefined" && window.innerWidth < 640
                  ? window.innerHeight / 2
                  : 120,
              top: 40,
            })),
            Prec.highest(keymap.of(editorCommands)),
            EditorState.tabSize.of(2),
            editableCompartment.of(EditorView.editable.of(true)),
            foldGutterTheme,
            selectionTooltip,
          ]}
          basicSetup={{
            lineNumbers: false,
            foldGutter: true,
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
