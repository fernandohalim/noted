"use client";

import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { type Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

type Sel = readonly { from: number; to: number }[];

/** true when any selection range overlaps (or sits flush against) [from, to] */
function touches(sel: Sel, from: number, to: number): boolean {
  for (const r of sel) {
    if (r.from <= to && r.to >= from) return true;
  }
  return false;
}

/** header bar shown in place of the opening fence line */
class CodeHeaderWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly code: string,
  ) {
    super();
  }
  eq(other: CodeHeaderWidget) {
    return other.lang === this.lang && other.code === this.code;
  }
  toDOM(view: EditorView) {
    const bar = document.createElement("div");
    bar.className = "cm-cb-header";

    const left = document.createElement("span");
    left.className = "cm-cb-header-left";
    const dot = document.createElement("span");
    dot.className = "cm-cb-dot";
    const label = document.createElement("span");
    label.className = "cm-cb-label";
    label.textContent = this.lang || "code";
    left.appendChild(dot);
    left.appendChild(label);
    bar.appendChild(left);

    const copy = document.createElement("button");
    copy.className = "cm-cb-copy";
    copy.type = "button";
    copy.textContent = "copy";
    copy.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    copy.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void navigator.clipboard?.writeText(this.code).then(() => {
        copy.textContent = "copied";
        copy.classList.add("cm-cb-copied");
        setTimeout(() => {
          copy.textContent = "copy";
          copy.classList.remove("cm-cb-copied");
        }, 1500);
      });
    });
    bar.appendChild(copy);

    // clicking the bar (but not copy) drops the cursor onto the fence line,
    // revealing the raw ``` so the language can be edited
    bar.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = view.posAtDOM(bar);
      const line = view.state.doc.lineAt(pos);
      view.dispatch({ selection: { anchor: line.to } });
      view.focus();
    });

    return bar;
  }
  ignoreEvent() {
    return true;
  }
}

const hide = Decoration.replace({});
const cbBase = Decoration.line({ class: "cm-cb" });
const cbTop = Decoration.line({ class: "cm-cb cm-cb-top" });
const cbBottom = Decoration.line({ class: "cm-cb cm-cb-bottom" });
const cbTopHead = Decoration.line({ class: "cm-cb cm-cb-top cm-cb-headed" });


/**
 * Render a fenced code block as an always-open, rendered-style card: styled
 * container, a header bar (language + copy) in place of the opening fence,
 * and a concealed closing fence — unless the cursor is on a fence line, in
 * which case that line stays raw so it can be edited.
 */
function decorateFence(
  view: EditorView,
  node: SyntaxNode,
  out: Range<Decoration>[],
) {
  const { state } = view;
  const doc = state.doc;
  const sel = state.selection.ranges;
  const readOnly = state.readOnly;

  const marks = node.getChildren("CodeMark");
  if (marks.length === 0) return;

  const openMark = marks[0];
  const closeMark = marks.length > 1 ? marks[marks.length - 1] : null;
  const openLine = doc.lineAt(openMark.from);
  const closeLine = closeMark
    ? doc.lineAt(closeMark.from)
    : doc.lineAt(Math.min(node.to, doc.length));

  const editingOpen = !readOnly && touches(sel, openLine.from, openLine.to);
  const showHeader = !editingOpen && openLine.to > openLine.from;

  // container background + borders on every line of the block
  for (let n = openLine.number; n <= closeLine.number; n++) {
    const line = doc.line(n);
    const deco =
      n === openLine.number
        ? showHeader
          ? cbTopHead
          : cbTop
        : n === closeLine.number
          ? cbBottom
          : cbBase;
    out.push(deco.range(line.from));
  }

  // opening fence -> header bar
  if (showHeader) {
    const info = node.getChildren("CodeInfo")[0];
    const lang = info ? doc.sliceString(info.from, info.to).trim() : "";
    const bodyFrom =
      openLine.number < doc.lines
        ? doc.line(openLine.number + 1).from
        : openLine.to;
    const bodyTo =
      closeMark && closeLine.number > openLine.number
        ? doc.line(closeLine.number - 1).to
        : node.to;
    const code = bodyTo > bodyFrom ? doc.sliceString(bodyFrom, bodyTo) : "";
    out.push(
      Decoration.replace({
        widget: new CodeHeaderWidget(lang, code),
      }).range(openLine.from, openLine.to),
    );
  }

  // closing fence -> concealed
  if (closeMark && closeLine.number > openLine.number) {
    const editingClose =
      !readOnly && touches(sel, closeLine.from, closeLine.to);
    if (!editingClose && closeLine.to > closeLine.from) {
      out.push(hide.range(closeLine.from, closeLine.to));
    }
  }
}

function build(view: EditorView): DecorationSet {
  const out: Range<Decoration>[] = [];
  const sel = view.state.selection.ranges;
  const tree = syntaxTree(view.state);

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (ref) => {
        const name = ref.name;
        if (
          name === "StrongEmphasis" ||
          name === "Emphasis" ||
          name === "InlineCode"
        ) {
          if (touches(sel, ref.from, ref.to)) return;
          const markName = name === "InlineCode" ? "CodeMark" : "EmphasisMark";
          for (const m of ref.node.getChildren(markName)) {
            if (m.to > m.from) out.push(hide.range(m.from, m.to));
          }
          return;
        }
        if (name === "FencedCode") {
          decorateFence(view, ref.node, out);
          return false;
        }
      },
    });
  }

  return Decoration.set(out, true);
}

export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet) {
        this.decorations = build(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);