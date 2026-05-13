export const releases = [  
  {
    version: "1.1.1",
    date: "may 2026",
    title: "instant sidebar & editor fixes",
    badge: "patch",
    features: [
      "rename, move, delete, and create now apply instantly in the sidebar — the server still confirms in the background, but you no longer wait for it",
      "fixed tab key inside a selection: pressing tab with text selected no longer deletes the selection",
      "tab now indents single-line selections (matches vscode-like behaviour, with the extra nicety that selecting one line and pressing tab indents the whole line)",
      "fixed a stray 'tsx' string that was leaking into the page when the providers tree rendered",
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
    features: [
      "fix minor bugs",
      "fix manifest.json",
    ],
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