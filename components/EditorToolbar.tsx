"use client";

import { type ReactNode } from "react";
import type { EditorView } from "@codemirror/view";
import {
  openSearchPanel,
  closeSearchPanel,
  searchPanelOpen,
} from "@codemirror/search";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  SquareCode,
  Link,
  List,
  ListOrdered,
  Quote,
  Search,
} from "lucide-react";
import {
  toggleBold,
  toggleItalic,
  toggleInlineCode,
  toggleCodeBlock,
  toggleHeading1,
  toggleHeading2,
  toggleHeading3,
  toggleBulletList,
  toggleOrderedList,
  toggleQuote,
  insertLink,
} from "@/lib/editor-commands";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

type Cmd = (view: EditorView) => boolean;

// always-visible formatting bar — pinned to the bottom of the editor on
// desktop, and (thanks to the visual-viewport sizing in AppShell) sitting
// just above the keyboard on mobile.
export default function EditorToolbar({
  getView,
}: {
  getView: () => EditorView | null;
}) {
  const run = (cmd: Cmd) => {
    const view = getView();
    if (!view) return;
    cmd(view);
    view.focus();
  };

  const toggleSearch = () => {
    const view = getView();
    if (!view) return;
    if (searchPanelOpen(view.state)) closeSearchPanel(view);
    else openSearchPanel(view);
    view.focus();
  };

  const tools: { icon: ReactNode; label: string; onClick: () => void }[] = [
    {
      icon: <Heading1 size={15} />,
      label: "heading 1",
      onClick: () => run(toggleHeading1),
    },
    {
      icon: <Heading2 size={15} />,
      label: "heading 2",
      onClick: () => run(toggleHeading2),
    },
    {
      icon: <Heading3 size={15} />,
      label: "heading 3",
      onClick: () => run(toggleHeading3),
    },
    {
      icon: <Bold size={15} />,
      label: `bold · ${MOD}B`,
      onClick: () => run(toggleBold),
    },
    {
      icon: <Italic size={15} />,
      label: `italic · ${MOD}I`,
      onClick: () => run(toggleItalic),
    },
    {
      icon: <Code size={15} />,
      label: `inline code · ${MOD}E`,
      onClick: () => run(toggleInlineCode),
    },
    {
      icon: <SquareCode size={15} />,
      label: "code block",
      onClick: () => run(toggleCodeBlock),
    },
    {
      icon: <Link size={15} />,
      label: "link",
      onClick: () => run(insertLink),
    },
    {
      icon: <List size={15} />,
      label: "bullet list",
      onClick: () => run(toggleBulletList),
    },
    {
      icon: <ListOrdered size={15} />,
      label: "numbered list",
      onClick: () => run(toggleOrderedList),
    },
    {
      icon: <Quote size={15} />,
      label: "quote",
      onClick: () => run(toggleQuote),
    },
  ];

  const btn =
    "shrink-0 p-2 text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer";

  return (
    <div className="flex items-stretch border-t border-border bg-bg shrink-0">
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar px-1 flex-1">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            aria-label={t.label}
            // keep focus in the editor so the command has a live selection
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.onClick}
            className={btn}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div className="flex items-center border-l border-border px-1">
        <button
          type="button"
          title={`find / replace · ${MOD}F`}
          aria-label="find and replace"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleSearch}
          className={btn}
        >
          <Search size={15} />
        </button>
      </div>
    </div>
  );
}
