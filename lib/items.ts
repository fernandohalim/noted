import { createClient } from "@/lib/supabase/server";
import type { Item, ItemMeta } from "@/types";

export async function getItems(): Promise<ItemMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, user_id, parent_id, name, type, created_at, updated_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItemMeta[];
}

export async function getItemContent(id: string): Promise<Item | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .eq("type", "file")
    .single();
  if (error) return null;
  return data as Item;
}
