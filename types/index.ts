export type ItemType = "folder" | "file";

export interface ItemMeta {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: ItemType;
  created_at: string;
  updated_at: string;
}

export interface Item extends ItemMeta {
  content: string;
}

export interface TreeNode extends ItemMeta {
  children: TreeNode[];
}
