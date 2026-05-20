"use client";

import { useEffect, useRef } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { customTheme } from "@/lib/editor-theme";

interface MergeDialogProps {
  fileName: string;
  conflictCount: number;
  oursResolved: string;
  theirsResolved: string;
  onResolve: (merged: string) => void;
  onUseMine: () => void;
  onUseTheirs: () => void;
  onCancel: () => void;
}

export default function MergeDialog({
  fileName,
  conflictCount,
  oursResolved,
  theirsResolved,
  onResolve,
  onUseMine,
  onUseTheirs,
  onCancel,
}: MergeDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const shared = [
      markdown({ codeLanguages: languages }),
      customTheme,
      EditorView.lineWrapping,
    ];
    const mv = new MergeView({
      parent: containerRef.current,
      a: { doc: oursResolved, extensions: shared },
      b: {
        doc: theirsResolved,
        extensions: [
          ...shared,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
        ],
      },
      revertControls: "b-to-a",
      highlightChanges: true,
      gutter: true,
      collapseUnchanged: { margin: 3, minSize: 4 },
    });
    mergeViewRef.current = mv;
    return () => {
      mv.destroy();
      mergeViewRef.current = null;
    };
  }, [oursResolved, theirsResolved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSaveMerged = () => {
    const merged = mergeViewRef.current?.a.state.doc.toString() ?? oursResolved;
    onResolve(merged);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono">
      <div className="bg-bg border border-border w-full max-w-6xl h-[88vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-elevated shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-bold text-text shrink-0">
              merge conflict
            </span>
            <span className="text-xs text-text-muted truncate">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-muted hover:text-text transition-colors text-lg cursor-pointer flex items-center justify-center w-6 h-6 leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        {/* explainer */}
        <div className="px-4 py-2 border-b border-border text-xs text-text-muted shrink-0">
          {conflictCount} conflicting{" "}
          {conflictCount === 1 ? "region" : "regions"}. edit the left side
          directly, or use the revert arrows between the panes to pull in their
          version, then save.
        </div>

        {/* pane labels */}
        <div className="flex border-b border-border text-xs shrink-0">
          <div className="flex-1 px-4 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-text">your version — editable</span>
          </div>
          <div className="flex-1 px-4 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
            <span className="text-text-muted">their version — reference</span>
          </div>
        </div>

        {/* merge view */}
        <div ref={containerRef} className="flex-1 min-h-0 bg-bg" />

        {/* footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-elevated shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUseTheirs}
              className="px-3 py-1.5 text-xs border border-border text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer"
            >
              use their version
            </button>
            <button
              type="button"
              onClick={onUseMine}
              className="px-3 py-1.5 text-xs border border-border text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer"
            >
              use my version
            </button>
            <button
              type="button"
              onClick={handleSaveMerged}
              className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-bg font-bold transition-colors cursor-pointer"
            >
              save merged
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
