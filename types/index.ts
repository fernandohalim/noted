export type ItemType = "folder" | "file";

export interface ItemMeta {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: ItemType;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Item extends ItemMeta {
  content: string;
}

export interface TreeNode extends ItemMeta {
  children: TreeNode[];
}

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type MutationType =
  | "create"
  | "rename"
  | "move"
  | "delete"
  | "update_content";

export interface PendingMutation {
  id: string; // local uuid for the mutation itself
  itemId: string;
  type: MutationType;
  payload: Record<string, unknown>;
  expectedUpdatedAt?: string;
  enqueuedAt: number;
  attempts: number;
}

export interface SyncMeta {
  userId: string | null;
  lastSyncAt: string | null; // ISO timestamp of newest updated_at we've pulled
  initialSyncDone: boolean;
}

export interface ConflictRecord {
  itemId: string;
  localContent: string;
  localExpectedUpdatedAt: string;
  serverUpdatedAt: string;
  detectedAt: number;
}