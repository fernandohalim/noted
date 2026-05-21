import { EditorView, KeyBinding } from "@codemirror/view";
import {
  copyLineDown,
  indentLess,
  indentMore,
  moveLineDown,
  moveLineUp,
  toggleComment,
} from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

// ---------- smart enter / tab ----------

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

    const nextMarker = orderedNum ? `${parseInt(orderedNum, 10) + 1}.` : marker;
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

  // Single-line non-empty selection — indent that line, keep selection
  if (!range.empty) {
    return indentMore(view);
  }

  // Empty selection (cursor) — insert spaces to next tab stop
  const tabSize = state.tabSize;
  const col = range.from - startLine.from;
  const spacesNeeded = tabSize - (col % tabSize);
  const spaces = " ".repeat(spacesNeeded);

  view.dispatch({
    changes: { from: range.from, insert: spaces },
    selection: { anchor: range.from + spaces.length },
  });
  return true;
};

// ---------- inline formatting toggles ----------

/** innermost ancestor of `nodeName` that fully contains the current selection */
function findEnclosing(view: EditorView, nodeName: string): SyntaxNode | null {
  const { state } = view;
  const range = state.selection.main;
  const tree = syntaxTree(state);
  const starts: SyntaxNode[] = [
    tree.resolveInner(range.from, 1),
    tree.resolveInner(range.to, -1),
  ];
  for (const start of starts) {
    for (let n: SyntaxNode | null = start; n; n = n.parent) {
      if (n.name === nodeName && n.from <= range.from && n.to >= range.to) {
        return n;
      }
    }
  }
  return null;
}

/** wrap the selection in `mark`, or strip `mark` if it is already applied */
function makeToggle(nodeName: string, markName: string, mark: string) {
  return (view: EditorView): boolean => {
    const range = view.state.selection.main;
    const target = findEnclosing(view, nodeName);

    if (target) {
      const marks = target.getChildren(markName);
      if (marks.length >= 2) {
        const first = marks[0];
        const last = marks[marks.length - 1];
        const markLen = first.to - first.from;
        view.dispatch({
          changes: [
            { from: first.from, to: first.to },
            { from: last.from, to: last.to },
          ],
          selection: { anchor: first.from, head: last.from - markLen },
        });
        return true;
      }
    }

    if (range.empty) {
      view.dispatch({
        changes: { from: range.from, insert: mark + mark },
        selection: { anchor: range.from + mark.length },
      });
    } else {
      view.dispatch({
        changes: [
          { from: range.from, insert: mark },
          { from: range.to, insert: mark },
        ],
        selection: {
          anchor: range.from + mark.length,
          head: range.to + mark.length,
        },
      });
    }
    return true;
  };
}

export const toggleBold = makeToggle("StrongEmphasis", "EmphasisMark", "**");
export const toggleItalic = makeToggle("Emphasis", "EmphasisMark", "*");
export const toggleInlineCode = makeToggle("InlineCode", "CodeMark", "`");

// ---------- fenced code block ----------

/** wrap the selected lines in a ``` fence, or unwrap an enclosing one */
export function toggleCodeBlock(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const doc = state.doc;

  let fenced: SyntaxNode | null = null;
  for (
    let n: SyntaxNode | null = syntaxTree(state).resolveInner(range.from, 1);
    n;
    n = n.parent
  ) {
    if (n.name === "FencedCode") {
      fenced = n;
      break;
    }
  }

  if (fenced) {
    const marks = fenced.getChildren("CodeMark");
    if (marks.length > 0) {
      const openLine = doc.lineAt(marks[0].from);
      const closeMark = marks.length > 1 ? marks[marks.length - 1] : null;
      const closeLine = closeMark
        ? doc.lineAt(closeMark.from)
        : doc.lineAt(Math.min(fenced.to, doc.length));
      const lastBody = closeMark ? closeLine.number - 1 : closeLine.number;
      const body: string[] = [];
      for (let n = openLine.number + 1; n <= lastBody; n++) {
        body.push(doc.line(n).text);
      }
      view.dispatch({
        changes: {
          from: openLine.from,
          to: closeLine.to,
          insert: body.join("\n"),
        },
        selection: { anchor: openLine.from },
      });
      return true;
    }
  }

  const startLine = doc.lineAt(range.from);
  const endLine = doc.lineAt(range.to);
  const bodyText = doc.sliceString(startLine.from, endLine.to);
  view.dispatch({
    changes: {
      from: startLine.from,
      to: endLine.to,
      insert: "```\n" + bodyText + "\n```",
    },
    // park the cursor right after the opening fence to type a language
    selection: { anchor: startLine.from + 3 },
  });
  return true;
}

// ---------- headings ----------

function makeHeading(level: number) {
  return (view: EditorView): boolean => {
    const { state } = view;
    const line = state.doc.lineAt(state.selection.main.from);
    const m = line.text.match(/^(#{1,6})(\s+)/);
    const hashes = "#".repeat(level);
    if (m && m[1].length === level) {
      // same level — strip it
      view.dispatch({
        changes: { from: line.from, to: line.from + m[0].length },
      });
    } else if (m) {
      // different level — swap the hashes
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from + m[1].length,
          insert: hashes,
        },
      });
    } else {
      view.dispatch({ changes: { from: line.from, insert: hashes + " " } });
    }
    return true;
  };
}

export const toggleHeading1 = makeHeading(1);
export const toggleHeading2 = makeHeading(2);
export const toggleHeading3 = makeHeading(3);

// ---------- line prefixes (lists, quotes) ----------

/** capture group 1 in every regex is the leading whitespace to preserve */
function makeLinePrefix(test: RegExp, prefix: (index: number) => string) {
  return (view: EditorView): boolean => {
    const { state } = view;
    const r = state.selection.main;
    const startNum = state.doc.lineAt(r.from).number;
    const endNum = state.doc.lineAt(r.to).number;

    let allMarked = true;
    for (let n = startNum; n <= endNum; n++) {
      if (!test.test(state.doc.line(n).text)) {
        allMarked = false;
        break;
      }
    }

    const changes: { from: number; to?: number; insert?: string }[] = [];
    let idx = 1;
    for (let n = startNum; n <= endNum; n++) {
      const line = state.doc.line(n);
      if (allMarked) {
        const m = line.text.match(test);
        if (m) {
          changes.push({
            from: line.from,
            to: line.from + m[0].length,
            insert: m[1] ?? "",
          });
        }
      } else {
        changes.push({ from: line.from, insert: prefix(idx) });
        idx++;
      }
    }
    if (changes.length) view.dispatch({ changes });
    return true;
  };
}

export const toggleBulletList = makeLinePrefix(/^(\s*)[-*+] +/, () => "- ");
export const toggleOrderedList = makeLinePrefix(
  /^(\s*)\d+\. +/,
  (i) => `${i}. `,
);
export const toggleQuote = makeLinePrefix(/^(\s*)> ?/, () => "> ");

// ---------- links ----------

export function insertLink(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (range.empty) {
    view.dispatch({
      changes: { from: range.from, insert: "[]()" },
      selection: { anchor: range.from + 1 },
    });
  } else {
    const text = state.doc.sliceString(range.from, range.to);
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `[${text}]()` },
      selection: { anchor: range.from + text.length + 3 },
    });
  }
  return true;
}

// ---------- keymap ----------

export const editorCommands: KeyBinding[] = [
  { key: "Enter", run: smartEnter },
  { key: "Tab", run: smartTab, shift: indentLess },
  { key: "Mod-b", run: toggleBold },
  { key: "Mod-i", run: toggleItalic },
  { key: "Mod-e", run: toggleInlineCode },
  { key: "Mod-d", run: copyLineDown },
  { key: "Alt-ArrowUp", run: moveLineUp },
  { key: "Alt-ArrowDown", run: moveLineDown },
  { key: "Mod-/", run: toggleComment },
];