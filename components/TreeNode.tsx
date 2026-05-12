"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, File, Folder, MoreHorizontal } from "lucide-react";
import type { TreeNode } from "@/types";
import {
  createItem,
  renameItem,
  deleteItem,
  moveItem,
  getFolderTree,
  refreshFileContent,
} from "@/app/actions";
import ContextMenu, { type MenuItem } from "./ContextMenu";
import MoveDialog from "./MoveDialog";
import { useConfirm } from "./ConfirmDialog";
import { usePending } from "./PendingProvider";
import { downloadTextFile, downloadFolderAsZip } from "@/lib/export";

interface Props {
  node: TreeNode;
  selectedId?: string;
  depth: number;
  expandedSet: Set<string>;
  onToggle: (id: string) => void;
}

export default function TreeNodeComponent({
  node,
  selectedId,
  depth,
  expandedSet,
  onToggle,
}: Props) {
  const router = useRouter();
  const isExpanded = expandedSet.has(node.id);
  const isSelected = selectedId === node.id;

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const [moving, setMoving] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const confirm = useConfirm();
  const { run } = usePending();
  const inFlight = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (node.type === "folder") onToggle(node.id);
    else router.push(`/?file=${node.id}`);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const submitRename = async () => {
    if (inFlight.current) return;
    if (name.trim() && name !== node.name) {
      const res = await run(() => renameItem(node.id, name));
      if (res.error) {
        alert(res.error);
        setName(node.name);
      }
    } else {
      setName(node.name);
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    if (inFlight.current) return;
    const ok = await confirm({
      title: `delete "${node.name}"?`,
      message:
        node.type === "folder"
          ? "this will delete the folder and everything inside."
          : undefined,
      confirmText: "delete",
      danger: true,
    });
    if (!ok) return;
    const res = await run(() => deleteItem(node.id));
    if (res.error) alert(res.error);
    else if (isSelected) router.push("/");
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-noted-id", node.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (node.type !== "folder") return;
    if (!e.dataTransfer.types.includes("application/x-noted-id")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = async (e: React.DragEvent) => {
    if (node.type !== "folder") return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData("application/x-noted-id");
    if (!draggedId || draggedId === node.id) return;
    const res = await run(() => moveItem(draggedId, node.id));
    if (res.error) alert(res.error);
  };

  const handleExport = async () => {
    if (node.type === "file") {
      const res = await run(() => refreshFileContent(node.id));
      if ("content" in res && res.content !== undefined) {
        downloadTextFile(node.name, res.content);
      }
    } else {
      const res = await run(() => getFolderTree(node.id));
      if (res.data && res.data.length > 0) {
        await downloadFolderAsZip(node.name, res.data);
      }
    }
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".txt")) continue;
      const content = await file.text();
      await run(() => createItem(node.id, file.name, "file", content));
    }
    if (!expandedSet.has(node.id)) onToggle(node.id);
    e.target.value = "";
  };

  const submitCreateChild = async () => {
    if (inFlight.current) return;
    if (!newName.trim() || !creating) {
      setCreating(null);
      setNewName("");
      return;
    }
    const res = await run(() => createItem(node.id, newName, creating));
    if (res.error) {
      alert(res.error);
    } else {
      if (!expandedSet.has(node.id)) onToggle(node.id);
      if (res.data && creating === "file") {
        router.push(`/?file=${res.data.id}`);
      }
    }
    setCreating(null);
    setNewName("");
  };

  const menuItems: MenuItem[] = [
    ...(node.type === "folder"
      ? [
          {
            label: "new file",
            onClick: () => {
              setCreating("file");
              setNewName("");
            },
          },
          {
            label: "new folder",
            onClick: () => {
              setCreating("folder");
              setNewName("");
            },
          },
          {
            label: "import .txt files",
            onClick: () => fileInputRef.current?.click(),
          },
          { type: "divider" as const },
        ]
      : []),
    {
      label: "rename",
      onClick: () => {
        setName(node.name);
        setRenaming(true);
      },
    },
    { label: "move to...", onClick: () => setMoving(true) },
    {
      label: node.type === "folder" ? "export as zip" : "export as .txt",
      onClick: handleExport,
    },
    { type: "divider" as const },
    { label: "delete", onClick: handleDelete, danger: true },
  ];

  return (
    <li>
      <div
        draggable={!renaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`group flex items-center gap-1 px-2 py-1 cursor-pointer text-sm hover:bg-[var(--color-bg-hover)] ${
          isSelected
            ? "bg-[var(--color-bg-elevated)] text-[var(--color-accent)]"
            : ""
        } ${
          isDragOver
            ? "outline outline-1 outline-[var(--color-accent)] -outline-offset-1"
            : ""
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === "folder" ? (
          <>
            <ChevronRight
              size={12}
              className={`flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
            <Folder
              size={14}
              className="flex-shrink-0 text-[var(--color-text-muted)]"
            />
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <File
              size={14}
              className="flex-shrink-0 text-[var(--color-text-muted)]"
            />
          </>
        )}
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") {
                setName(node.name);
                setRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[var(--color-bg-elevated)] border border-[var(--color-accent)] outline-none px-1 text-sm min-w-0"
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}

        {!renaming && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenu({ x: rect.left - 140, y: rect.bottom + 4 });
            }}
            className="ml-auto p-0.5 hover:bg-[var(--color-bg-elevated)] flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            aria-label="more actions"
          >
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>

      {creating && (
        <div
          style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
          className="pr-2 py-1"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitCreateChild}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreateChild();
              if (e.key === "Escape") {
                setCreating(null);
                setNewName("");
              }
            }}
            placeholder={creating === "file" ? "filename.txt" : "folder name"}
            className="w-full px-1 py-0.5 bg-[var(--color-bg-elevated)] border border-[var(--color-accent)] outline-none text-sm"
          />
        </div>
      )}

      {node.type === "folder" && isExpanded && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              selectedId={selectedId}
              depth={depth + 1}
              expandedSet={expandedSet}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}

      {moving && (
        <MoveDialog
          itemId={node.id}
          itemName={node.name}
          currentParentId={node.parent_id}
          onClose={() => setMoving(false)}
        />
      )}

      {node.type === "folder" && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          multiple
          onChange={handleImportFiles}
          className="hidden"
        />
      )}
    </li>
  );
}
