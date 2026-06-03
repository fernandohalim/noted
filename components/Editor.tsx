"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { RotateCw, WifiOff, GitMerge, Share2, Check } from "lucide-react";
import type { Item, TreeNode } from "@/types";
import { usePending } from "./PendingProvider";
import { useConfirm } from "./ConfirmDialog";
import { customTheme } from "@/lib/editor-theme";
import { useOnline } from "@/lib/use-online";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { editorCommands } from "@/lib/editor-commands";
import {
  markdownDecorations,
  collapsedCodeField,
} from "@/lib/markdown-decorations";
import EditorToolbar from "./EditorToolbar";
import {
  updateFileContent,
  refreshFileContent,
  hasPendingMutation,
  getItemConflict,
  persistLocalContent,
  setItemPublic,
} from "@/lib/data";
import {
  localGetItem,
  clearConflict,
  localGetBase,
  localPutBase,
  setConflict,
} from "@/lib/local-store";
import { diff3Merge } from "@/lib/merge";
import MergeDialog from "./MergeDialog";

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

  // content from the local cache already includes any unsynced offline edits
  const initialContent = file.content;

  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const contentRef = useRef(initialContent);
  const savedRef = useRef(file.content);
  const updatedAtRef = useRef(file.updated_at);
  const savingRef = useRef(false);
  const conflictBusyRef = useRef(false);
  const editorViewRef = useRef<EditorView | null>(null);
  const localPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editableCompartment] = useState(() => new Compartment());
  const [mergeState, setMergeState] = useState<{
    oursResolved: string;
    theirsResolved: string;
    mine: string;
    theirs: string;
    conflictCount: number;
    theirsUpdatedAt: string;
  } | null>(null);
  const [mergedNotice, setMergedNotice] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const [isCoarsePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(any-pointer: coarse)").matches,
  );

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
    },
    [],
  );

  const resolveConflict = useCallback(
    async function self(mine: string): Promise<void> {
      conflictBusyRef.current = true;
      const base = await localGetBase(file.id);
      const theirsRes = await run(() => refreshFileContent(file.id));
      if (!("content" in theirsRes) || theirsRes.content === undefined) {
        setSaveState("error");
        conflictBusyRef.current = false;
        return;
      }
      const theirs = theirsRes.content;
      const theirsUpdatedAt = theirsRes.updatedAt;

      if (!base) {
        const overwrite = await confirm({
          title: "this file was changed elsewhere",
          message:
            "overwrite the other version with yours, or discard yours and reload?",
          confirmText: "overwrite",
          cancelText: "discard mine",
          danger: true,
        });
        if (overwrite) {
          const forced = await run(() => updateFileContent(file.id, mine));
          replaceEditorContent(
            mine,
            ("updatedAt" in forced && forced.updatedAt) || theirsUpdatedAt,
          );
        } else {
          replaceEditorContent(theirs, theirsUpdatedAt);
        }
        conflictBusyRef.current = false;
        return;
      }

      const result = diff3Merge(base.content, mine, theirs);

      if (result.clean) {
        const saved = await run(() =>
          updateFileContent(file.id, result.merged, theirsUpdatedAt),
        );
        if ("error" in saved && saved.error === "conflict") {
          return self(result.merged);
        }
        replaceEditorContent(
          result.merged,
          ("updatedAt" in saved && saved.updatedAt) || theirsUpdatedAt,
        );
        setMergedNotice(true);
        conflictBusyRef.current = false;
        return;
      }

      setSaveState("unsaved");
      setMergeState({
        oursResolved: result.oursResolved,
        theirsResolved: result.theirsResolved,
        mine,
        theirs,
        conflictCount: result.conflictCount,
        theirsUpdatedAt,
      });
    },
    [file.id, run, confirm, replaceEditorContent],
  );

  const save = useCallback(
    async (force = false): Promise<void> => {
      if (conflictBusyRef.current) return;
      if (savingRef.current) return;
      if (contentRef.current === savedRef.current) return;

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

        if ("error" in res && res.error === "conflict") {
          savingRef.current = false;
          await resolveConflict(captured);
        } else if ("error" in res && res.error) {
          setSaveState("error");
        } else {
          savedRef.current = captured;
          if ("updatedAt" in res && res.updatedAt)
            updatedAtRef.current = res.updatedAt;
          setSaveState(
            "queued" in res && res.queued
              ? "queued"
              : contentRef.current === captured
                ? "saved"
                : "unsaved",
          );
        }
      } catch (err) {
        // a thrown error must not leave the indicator stuck on "saving" —
        // surface it so the user (and we) can see the save didn't land
        console.error("[save] failed", err);
        setSaveState("error");
      } finally {
        savingRef.current = false;
        setEditable(true);
      }
    },
    [setEditable, file.id, run, resolveConflict],
  );

  const handleRefresh = useCallback(async () => {
    if (conflictBusyRef.current) return;
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

  const handleShare = useCallback(async () => {
    const res = await run(() => setItemPublic(file.id, true));
    if ("error" in res && res.error) {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 2500);
      return;
    }
    try {
      await navigator.clipboard?.writeText(
        `${location.origin}/share/${file.id}`,
      );
    } catch {}
    window.dispatchEvent(new Event("noted:items-updated"));
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2000);
  }, [file.id, run]);

  const handleMergeResolve = useCallback(
    async (merged: string) => {
      if (!mergeState) return;
      const { theirsUpdatedAt } = mergeState;
      setMergeState(null);
      const saved = await run(() =>
        updateFileContent(file.id, merged, theirsUpdatedAt),
      );
      if ("error" in saved && saved.error === "conflict") {
        // changed again while the user was resolving — restart the flow
        await resolveConflict(merged);
        return;
      }
      replaceEditorContent(
        merged,
        ("updatedAt" in saved && saved.updatedAt) || theirsUpdatedAt,
      );
      conflictBusyRef.current = false;
    },
    [mergeState, file.id, run, replaceEditorContent, resolveConflict],
  );

  const handleMergeUseMine = useCallback(async () => {
    if (!mergeState) return;
    const mine = mergeState.mine;
    setMergeState(null);
    const forced = await run(() => updateFileContent(file.id, mine));
    replaceEditorContent(
      mine,
      ("updatedAt" in forced && forced.updatedAt) || updatedAtRef.current,
    );
    conflictBusyRef.current = false;
  }, [mergeState, file.id, run, replaceEditorContent]);

  const handleMergeUseTheirs = useCallback(() => {
    if (!mergeState) return;
    replaceEditorContent(mergeState.theirs, mergeState.theirsUpdatedAt);
    setMergeState(null);
    conflictBusyRef.current = false;
  }, [mergeState, replaceEditorContent]);

  const handleMergeCancel = useCallback(() => {
    setMergeState(null);
    conflictBusyRef.current = false;
  }, []);

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

  // background sync may have pulled a newer version of this file
  useEffect(() => {
    const handler = async () => {
      const latest = await localGetItem(file.id);
      if (!latest) return;
      updatedAtRef.current = latest.updated_at;
      const hasUnsaved = contentRef.current !== savedRef.current;
      if (!hasUnsaved && latest.content !== contentRef.current) {
        replaceEditorContent(latest.content, latest.updated_at);
      }
    };
    window.addEventListener("noted:items-updated", handler);
    return () => window.removeEventListener("noted:items-updated", handler);
  }, [file.id, replaceEditorContent]);

  const onChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
    setSaveState(value === savedRef.current ? "saved" : "unsaved");
    if (mergedNotice) setMergedNotice(false);

    // durable local autosave — debounced. keeps the on-device copy current
    // so closing the note (or the tab) mid-edit never loses anything, even
    // before a server save runs.
    if (localPersistTimer.current) clearTimeout(localPersistTimer.current);
    localPersistTimer.current = setTimeout(() => {
      void persistLocalContent(file.id, contentRef.current);
    }, 400);
  };

  // reflect unsynced offline edits in the indicator
  useEffect(() => {
    hasPendingMutation(file.id).then((pending) => {
      if (pending && contentRef.current === savedRef.current) {
        setSaveState("queued");
      }
    });
  }, [file.id]);

  // backfill a merge base for files that predate this feature
  useEffect(() => {
    (async () => {
      if (await localGetBase(file.id)) return;
      if (await hasPendingMutation(file.id)) return; // unsynced edit — not a clean base
      await localPutBase({
        id: file.id,
        content: file.content,
        updatedAt: file.updated_at,
      });
    })();
  }, [file.id, file.content, file.updated_at]);

  // the auto-merge confirmation fades on its own
  useEffect(() => {
    if (!mergedNotice) return;
    const t = setTimeout(() => setMergedNotice(false), 6000);
    return () => clearTimeout(t);
  }, [mergedNotice]);

  // a queued save that conflicted on another device — resolve on open
  useEffect(() => {
    let cancelled = false;
    getItemConflict(file.id).then(async (c) => {
      if (!c || cancelled) return;
      // a real merge needs the server's current version — defer if offline
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      await clearConflict(file.id);
      await resolveConflict(c.localContent);
    });
    return () => {
      cancelled = true;
    };
  }, [file.id, resolveConflict]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--cm-keyboard-pad",
        `${Math.round(vv.height * 0.5)}px`,
      );
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  // never lose edits when navigating away: flush the latest content on unmount.
  // switching notes remounts the editor, so this fires on every note change.
  useEffect(() => {
    return () => {
      if (localPersistTimer.current) clearTimeout(localPersistTimer.current);
      // the CodeMirror view is being torn down — drop the ref so any late
      // async callback (e.g. a resolving confirm dialog) can't dispatch to it
      editorViewRef.current = null;

      const latest = contentRef.current;
      if (latest !== savedRef.current && !conflictBusyRef.current) {
        // unsynced edits — persist locally and push to the server.
        // fire-and-forget: the editor is unmounting so the interactive merge
        // flow can't run here; record any conflict for the next open instead.
        void updateFileContent(file.id, latest, updatedAtRef.current).then(
          (res) => {
            if ("error" in res && res.error === "conflict") {
              void setConflict({
                itemId: file.id,
                localContent: latest,
                localExpectedUpdatedAt: updatedAtRef.current ?? "",
                serverUpdatedAt:
                  (res as { currentUpdatedAt?: string }).currentUpdatedAt ?? "",
                detectedAt: Date.now(),
              });
            }
          },
        );
      } else {
        // nothing to sync, but make sure the local copy is durable
        void persistLocalContent(file.id, latest);
      }
    };
  }, [file.id]);

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
          {mergedNotice && (
            <span
              className="flex items-center gap-1 text-accent"
              title="merged changes from another device"
            >
              <GitMerge size={10} />
              <span className="hidden sm:inline">auto-merged</span>
            </span>
          )}
          <button
            onClick={handleShare}
            title="copy view-only share link"
            aria-label="share note"
            className="text-text-muted hover:text-text"
          >
            {shareState === "copied" ? (
              <Check size={12} className="text-accent" />
            ) : (
              <Share2
                size={12}
                className={shareState === "error" ? "text-red-400" : ""}
              />
            )}
          </button>
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
            ...(isCoarsePointer
              ? []
              : [EditorView.scrollMargins.of(() => ({ bottom: 80, top: 40 }))]),
            Prec.highest(keymap.of(editorCommands)),
            EditorState.tabSize.of(2),
            editableCompartment.of(EditorView.editable.of(true)),
            foldGutterTheme,
            markdownDecorations,
            collapsedCodeField,
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
      <EditorToolbar getView={() => editorViewRef.current} />
      {mergeState && (
        <MergeDialog
          fileName={file.name}
          conflictCount={mergeState.conflictCount}
          oursResolved={mergeState.oursResolved}
          theirsResolved={mergeState.theirsResolved}
          onResolve={handleMergeResolve}
          onUseMine={handleMergeUseMine}
          onUseTheirs={handleMergeUseTheirs}
          onCancel={handleMergeCancel}
        />
      )}
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
