"use client";

import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { StateField, type EditorState, type Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

/**
 * Live-preview concealment + collapsible fenced code blocks.
 *
 * Inline marker concealment and the expanded code-block container come from a
 * ViewPlugin. The collapsed code card is a *block* decoration, which CodeMirror
 * only permits from a StateField — hence collapsedCodeField below.
 */

type Sel = readonly { from: number; to: number }[];

/** true when any selection range overlaps (or sits flush against) [from, to] */
function touches(sel: Sel, from: number, to: number): boolean {
  for (const r of sel) {
    if (r.from <= to && r.to >= from) return true;
  }
  return false;
}

/** like touches(), but a bare cursor sitting exactly on the start boundary
    does NOT count — so clicking the line above can't yank the block open */
function touchesInterior(sel: Sel, from: number, to: number): boolean {
  for (const r of sel) {
    if (r.from === r.to && r.from === from) continue;
    if (r.from <= to && r.to >= from) return true;
  }
  return false;
}

/** collapsed representation of a fenced code block — a compact one-line card */
class CollapsedCodeWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly lineCount: number,
    readonly code: string,
  ) {
    super();
  }
  eq(other: CollapsedCodeWidget) {
    return (
      other.lang === this.lang &&
      other.lineCount === this.lineCount &&
      other.code === this.code
    );
  }
  toDOM(view: EditorView) {
    const card = document.createElement("div");
    card.className = "cm-cb-collapsed";

    const dot = document.createElement("span");
    dot.className = "cm-cb-dot";
    card.appendChild(dot);

    const label = document.createElement("span");
    label.className = "cm-cb-label";
    label.textContent = this.lang || "code";
    card.appendChild(label);

    const count = document.createElement("span");
    count.className = "cm-cb-count";
    count.textContent = `${this.lineCount} ${
      this.lineCount === 1 ? "line" : "lines"
    }`;
    card.appendChild(count);

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
    card.appendChild(copy);

    // clicking the card (anywhere but the copy button) drops the cursor
    // inside the block, which expands it via the touch-to-reveal pass
    card.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = view.posAtDOM(card);
      const line = view.state.doc.lineAt(pos);
      const bodyPos =
        line.number < view.state.doc.lines
          ? view.state.doc.line(line.number + 1).from
          : pos;
      view.dispatch({ selection: { anchor: bodyPos } });
      view.focus();
    });

    return card;
  }
  ignoreEvent() {
    return true;
  }
}

const hide = Decoration.replace({});
const cbBase = Decoration.line({ class: "cm-cb" });
const cbTop = Decoration.line({ class: "cm-cb cm-cb-top" });
const cbBottom = Decoration.line({ class: "cm-cb cm-cb-bottom" });

// ---------- collapsed code blocks (StateField — block decos can't come from a plugin) ----------

function buildCollapsed(state: EditorState): DecorationSet {
  const out: Range<Decoration>[] = [];
  const sel = state.selection.ranges;
  const doc = state.doc;
  const tree = syntaxTree(state);

  tree.iterate({
    enter: (ref) => {
      if (ref.name !== "FencedCode") return;
      const node = ref.node;
      const marks = node.getChildren("CodeMark");
      if (marks.length === 0) return false;

      const openMark = marks[0];
      const closeMark = marks.length > 1 ? marks[marks.length - 1] : null;
      const openLine = doc.lineAt(openMark.from);
      const closeLine = closeMark
        ? doc.lineAt(closeMark.from)
        : doc.lineAt(Math.min(node.to, doc.length));

      // cursor inside (or flush against) the block -> leave it expanded
      if (touchesInterior(sel, node.from, node.to)) return false;
      // needs a real closing fence — unterminated blocks stay expanded
      if (!closeMark || closeLine.number <= openLine.number) return false;

      const info = node.getChildren("CodeInfo")[0];
      const lang = info ? doc.sliceString(info.from, info.to).trim() : "";
      const body: string[] = [];
      for (let n = openLine.number + 1; n <= closeLine.number - 1; n++) {
        body.push(doc.line(n).text);
      }
      out.push(
        Decoration.replace({
          widget: new CollapsedCodeWidget(lang, body.length, body.join("\n")),
          block: true,
        }).range(openLine.from, closeLine.to),
      );
      return false;
    },
  });

  return Decoration.set(out, true);
}

export const collapsedCodeField = StateField.define<DecorationSet>({
  create(state) {
    return buildCollapsed(state);
  },
  update(value, tr) {
    // recompute on edits, cursor moves, and as the parser advances
    if (
      tr.docChanged ||
      tr.selection ||
      syntaxTree(tr.startState) !== syntaxTree(tr.state)
    ) {
      return buildCollapsed(tr.state);
    }
    return value.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---------- inline concealment + expanded code container (view plugin) ----------

/** the styled background lines, so an *expanded* block still reads as one unit */
function expandedFence(
  view: EditorView,
  node: SyntaxNode,
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
          // collapsed blocks are handled by collapsedCodeField; only the
          // expanded (cursor-inside) state needs the styled container here
          if (touchesInterior(sel, ref.from, ref.to)) {
            expandedFence(view, ref.node, out);
          }
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