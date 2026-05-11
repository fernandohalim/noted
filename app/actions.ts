"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ItemType } from "@/types";

export async function createItem(
  parentId: string | null,
  name: string,
  type: ItemType,
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
      content: "",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/");
  return { data };
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
  revalidatePath("/");
  return { ok: true };
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
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
  revalidatePath("/");
  return { ok: true };
}

export async function updateFileContent(id: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { error } = await supabase
    .from("items")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("type", "file");

  if (error) return { error: error.message };
  // No revalidate — tree didn't change, and content is loaded fresh on next nav.
  return { ok: true };
}

export async function searchItems(query: string) {
  if (!query.trim()) return { data: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_items", {
    query_text: query,
  });
  if (error) return { error: error.message, data: [] };
  return { data: data ?? [] };
}
