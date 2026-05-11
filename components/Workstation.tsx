import type { Item } from "@/types";
import Editor from "./Editor";

export default function Workstation({ file }: { file: Item | null }) {
  if (!file) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        select a file to start editing
      </main>
    );
  }
  return <Editor key={file.id} file={file} />;
}
