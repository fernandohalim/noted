import { createClient } from "@/lib/supabase/server";
import { getItems, getItemContent } from "@/lib/items";
import { buildTree } from "@/lib/tree";
import AppShell from "@/components/AppShell";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { file: selectedFileId } = await searchParams;

  const items = await getItems();
  const tree = buildTree(items);
  const selectedFile = selectedFileId
    ? await getItemContent(selectedFileId)
    : null;

  return (
    <AppShell
      email={user?.email ?? ""}
      tree={tree}
      selectedId={selectedFileId}
      selectedFile={selectedFile}
    />
  );
}
