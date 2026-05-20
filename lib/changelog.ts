export const releases = [
  {
    version: "1.3",
    date: "may 2026",
    title: "three-way merge for conflicts",
    badge: "feature",
    features: [
      "editing the same note on two devices no longer forces an all-or-nothing choice — non-overlapping changes now merge automatically",
      "genuine overlaps open a side-by-side merge view: resolve each conflict by editing directly or pulling in the other version, then save",
      "the last synced version of every note is kept on-device as a merge base, giving conflict resolution a true common ancestor",
    ],
  },
  {
    version: "1.2.2",
    date: "may 2026",
    title: "mobile fix",
    badge: "patch",
    features: [
      "removed formatting toolbar behind native menu in mobile",
      "fix mobile scroll jumps"
    ],
  },
  {
    version: "1.2.1",
    date: "may 2026",
    title: "instant note switching",
    badge: "patch",
    features: [
      "fixed note switching triggering a server round-trip on every click — opening a note is now fully client-side and instant, matching the offline experience",
    ],
  },
  {
    version: "1.2",
    date: "may 2026",
    title: "local-first storage",
    badge: "feature",
    features: [
      "notes are now cached on-device — opening any note is instant, with no loading spinner or network wait",
      "edits save locally first and sync to the server in the background; nothing is lost if you drop offline mid-edit",
      "fresh devices show a brief loading screen on first launch while notes sync down",
      "edits made on another device are picked up automatically; genuine conflicts still prompt you to choose which version to keep",
      "deletions now propagate reliably across devices",
    ],
  },
  {
    version: "1.1.1",
    date: "may 2026",
    title: "performance & mobile polish",
    badge: "patch",
    features: [
      "removed the sluggish refresh after sidebar operations — rename, move, delete, and create now finish as soon as the server responds",
      "fixed a tab key bug where selecting text within a single line and pressing tab would replace the selection; it now indents the line instead",
      "disabled the custom formatting toolbar on touch devices — it was overlapping the native selection menu",
      "tuned mobile scroll behavior so tapping and selecting text no longer triggers unexpected page jumps",
    ],
  },
  {
    version: "1.1",
    date: "may 2026",
    title: "editor power-ups & ux polish",
    badge: "feature",
    features: [
      "auto-indent on enter — new lines inherit the previous line's indentation",
      "tab now jumps to the next tab stop when typing; still indents the whole block when multiple lines are selected",
      "new integrated shortcut, click (?) icon",
      "inline loading indicators on rename, delete, move, and create — affected items dim and show a spinner",
      "fixed mobile bug where the title bar could scroll off-screen after opening the keyboard on a long note",
    ],
  },
  {
    version: "1.0.3",
    date: "may 2026",
    title: "editor polish & mobile optimization",
    badge: "patch",
    features: [
      "added a floating formatting toolbar for quick styling and code block insertion",
      "improved mobile typing experience with centered cursor and dynamic viewport sizing",
    ],
  },
  {
    version: "1.0.2",
    date: "may 2026",
    title: "editor enhancements & ui polish",
    badge: "patch",
    features: [
      "added collapsible paragraphs and functions in editor",
      "improved tab and indentation spacing",
      "differentiated file and folder visuals in sidebar",
      "added social links in about menu",
    ],
  },
  {
    version: "1.0.1",
    date: "may 2026",
    title: "minor bug fixing",
    badge: "patch",
    features: ["fix minor bugs", "fix manifest.json"],
  },
  {
    version: "1.0",
    date: "may 2026",
    title: "initial release",
    badge: "launch",
    features: [
      "minimalist markdown editor",
      "pwa support for mobile installs",
      "offline-first architecture",
    ],
  },
];
