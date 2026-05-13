import { EditorView, KeyBinding } from "@codemirror/view";
import {
  copyLineDown,
  indentLess,
  indentMore,
  moveLineDown,
  moveLineUp,
  toggleComment,
} from "@codemirror/commands";

const smartEnter = (view: EditorView): boolean => {
  const { state } = view;
  const ranges = state.selection.ranges;
  if (ranges.length !== 1 || !ranges[0].empty) return false;

  const pos = ranges[0].from;
  const line = state.doc.lineAt(pos);
  const beforeCursor = line.text.slice(0, pos - line.from);

  const listMatch = beforeCursor.match(/^(\s*)([-*+]|(\d+)\.)\s+/);

  if (listMatch) {
    const indent = listMatch[1];
    const marker = listMatch[2];
    const orderedNum = listMatch[3];

    if (beforeCursor === listMatch[0]) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: indent },
        selection: { anchor: line.from + indent.length },
      });
      return true;
    }

    const nextMarker = orderedNum
      ? `${parseInt(orderedNum, 10) + 1}.`
      : marker;
    const insertion = `\n${indent}${nextMarker} `;
    view.dispatch({
      changes: { from: pos, insert: insertion },
      selection: { anchor: pos + insertion.length },
    });
    return true;
  }

  const indentMatch = beforeCursor.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : "";
  if (!indent) return false;

  const insertion = `\n${indent}`;
  view.dispatch({
    changes: { from: pos, insert: insertion },
    selection: { anchor: pos + insertion.length },
  });
  return true;
};

const smartTab = (view: EditorView): boolean => {
  const { state } = view;
  const range = state.selection.main;

  const startLine = state.doc.lineAt(range.from);
  const endLine = state.doc.lineAt(range.to);

  // Multi-line selection — indent every line
  if (startLine.number !== endLine.number) {
    return indentMore(view);
  }

  // Single line / cursor — insert spaces to next tab stop
  const tabSize = state.tabSize;
  const col = range.from - startLine.from;
  const spacesNeeded = tabSize - (col % tabSize);
  const spaces = " ".repeat(spacesNeeded);

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: spaces },
    selection: { anchor: range.from + spaces.length },
  });
  return true;
};

const wrap = (chars: string) => (view: EditorView): boolean => {
  const range = view.state.selection.main;
  if (range.empty) {
    view.dispatch({
      changes: { from: range.from, insert: chars + chars },
      selection: { anchor: range.from + chars.length },
    });
    return true;
  }
  view.dispatch({
    changes: [
      { from: range.from, insert: chars },
      { from: range.to, insert: chars },
    ],
    selection: {
      anchor: range.from + chars.length,
      head: range.to + chars.length,
    },
  });
  return true;
};

export const editorCommands: KeyBinding[] = [
  { key: "Enter", run: smartEnter },
  { key: "Tab", run: smartTab, shift: indentLess },
  { key: "Mod-b", run: wrap("**") },
  { key: "Mod-i", run: wrap("*") },
  { key: "Mod-e", run: wrap("`") },
  { key: "Mod-d", run: copyLineDown },
  { key: "Alt-ArrowUp", run: moveLineUp },
  { key: "Alt-ArrowDown", run: moveLineDown },
  { key: "Mod-/", run: toggleComment },
];