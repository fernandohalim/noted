"use server";

import { createClient } from "@/lib/supabase/server";
import type { ItemType } from "@/types";

export async function createItem(
  parentId: string | null,
  name: string,
  type: ItemType,
  content: string = "",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "name required" };

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      parent_id: parentId,
      name: trimmed,
      type,
      content,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getFolderTree(folderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", data: [] };

  const { data, error } = await supabase.rpc("get_folder_tree", {
    folder_id: folderId,
  });
  if (error) return { error: error.message, data: [] };
  return { data: data ?? [] };
}

export async function renameItem(id: string, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed) return { error: "name required" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function moveItem(id: string, newParentId: string | null) {
  if (id === newParentId) return { error: "cannot move into itself" };
  const supabase = await createClient();

  // Prevent moving a folder into its own descendant
  if (newParentId) {
    const { data: all } = await supabase.from("items").select("id, parent_id");
    if (all) {
      let cursor: string | null = newParentId;
      while (cursor) {
        if (cursor === id) return { error: "cannot move into a descendant" };
        const parent = all.find((i) => i.id === cursor);
        cursor = parent?.parent_id ?? null;
      }
    }
  }

  const { error } = await supabase
    .from("items")
    .update({ parent_id: newParentId })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateFileContent(
  id: string,
  content: string,
  expectedUpdatedAt?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };

  // Conflict detection: if caller provided the timestamp they loaded with,
  // check it still matches before overwriting
  if (expectedUpdatedAt) {
    const { data: current } = await supabase
      .from("items")
      .select("updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (current && current.updated_at !== expectedUpdatedAt) {
      return {
        error: "conflict" as const,
        currentUpdatedAt: current.updated_at as string,
      };
    }
  }

  const { data: updated, error } = await supabase
    .from("items")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("type", "file")
    .select("updated_at")
    .single();

  if (error) return { error: error.message };
  return { ok: true, updatedAt: updated.updated_at as string };
}

export async function refreshFileContent(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { data, error } = await supabase
    .from("items")
    .select("content, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  return {
    content: data.content as string,
    updatedAt: data.updated_at as string,
  };
}
