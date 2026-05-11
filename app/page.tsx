import { createClient } from "@/lib/supabase/server";
import { getItems, getItemContent } from "@/lib/items";
import { buildTree } from "@/lib/tree";
import TitleBar from "@/components/TitleBar";
import Sidebar from "@/components/Sidebar";
import Workstation from "@/components/Workstation";

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
    <div className="h-screen flex flex-col">
      <TitleBar email={user?.email ?? ""} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar tree={tree} selectedId={selectedFileId} />
        <Workstation file={selectedFile} />
      </div>
    </div>
  );
}
