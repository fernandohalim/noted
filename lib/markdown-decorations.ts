"use client";

import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

/**
 * Live-preview concealment.
 *
 * The markdown markers (** , * , `) and the ``` fences stay in the document —
 * they are only hidden *visually* via decorations. The moment the cursor or a
 * selection touches a formatted span, that span's markers are revealed again
 * so it can be edited raw (Obsidian-style).
 */

type Sel = readonly { from: number; to: number }[];

/** true when any selection range overlaps (or sits flush against) [from, to] */
function touches(sel: Sel, from: number, to: number): boolean {
  for (const r of sel) {
    if (r.from <= to && r.to >= from) return true;
  }
  return false;
}

/** rendered in place of an opening ``` fence line */
class FenceHeaderWidget extends WidgetType {
  constructor(readonly lang: string) {
    super();
  }
  eq(other: FenceHeaderWidget) {
    return other.lang === this.lang;
  }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-cb-header";
    const dot = document.createElement("span");
    dot.className = "cm-cb-dot";
    wrap.appendChild(dot);
    const label = document.createElement("span");
    label.className = "cm-cb-label";
    label.textContent = this.lang || "code";
    wrap.appendChild(label);
    return wrap;
  }
  ignoreEvent() {
    return false;
  }
}

const hide = Decoration.replace({});

const cbBase = Decoration.line({ class: "cm-cb" });
const cbTop = Decoration.line({ class: "cm-cb cm-cb-top" });
const cbBottom = Decoration.line({ class: "cm-cb cm-cb-bottom" });

function fencedCode(
  view: EditorView,
  node: SyntaxNode,
  sel: Sel,
  out: Range<Decoration>[],
) {
  const doc = view.state.doc;
  const marks = node.getChildren("CodeMark");
  if (marks.length === 0) return;

  const openMark = marks[0];
  const closeMark = marks.length > 1 ? marks[marks.length - 1] : null;
  const openLine = doc.lineAt(openMark.from);
  const closeLine = closeMark
    ? doc.lineAt(closeMark.from)
    : doc.lineAt(Math.min(node.to, doc.length));

  // line backgrounds — always applied, so a code block always reads as one
  // contiguous container (even while it is being edited).
  for (let n = openLine.number; n <= closeLine.number; n++) {
    const line = doc.line(n);
    const deco =
      n === openLine.number
        ? cbTop
        : n === closeLine.number
          ? cbBottom
          : cbBase;
    out.push(deco.range(line.from));
  }

  // reveal the raw fences while the cursor is anywhere inside the block
  if (touches(sel, node.from, node.to)) return;

  const info = node.getChildren("CodeInfo")[0];
  const lang = info ? doc.sliceString(info.from, info.to).trim() : "";

  // opening fence line -> a compact header showing the language
  out.push(
    Decoration.replace({ widget: new FenceHeaderWidget(lang) }).range(
      openLine.from,
      openLine.to,
    ),
  );

  // closing fence line -> emptied; the styled line becomes the block's
  // bottom padding
  if (closeMark && closeLine.number !== openLine.number) {
    out.push(hide.range(closeLine.from, closeLine.to));
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
          // revealed while touched — descend so nested spans get their turn
          if (touches(sel, ref.from, ref.to)) return;
          const markName = name === "InlineCode" ? "CodeMark" : "EmphasisMark";
          for (const m of ref.node.getChildren(markName)) {
            if (m.to > m.from) out.push(hide.range(m.from, m.to));
          }
          return;
        }
        if (name === "FencedCode") {
          fencedCode(view, ref.node, sel, out);
        }
      },
    });
  }

  // sort = true: nodes are visited document-first, but nested spans and the
  // per-line code-block decorations are emitted out of positional order.
  return Decoration.set(out, true);
}

export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(u: ViewUpdate) {
      // selectionSet matters: concealment depends on where the cursor is
      if (u.docChanged || u.viewportChanged || u.selectionSet) {
        this.decorations = build(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);