import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SharedView from "@/components/SharedView";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase
    .from("items")
    .select("id, name, content, type, updated_at, user_id, is_public")
    .eq("id", id)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (!item || item.type !== "file") {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 font-mono text-sm text-text-muted px-4 text-center">
        <p>this note isn&apos;t shared, or the link is no longer valid.</p>
        <Link
          href="/"
          className="px-3 py-1 border border-border hover:bg-bg-hover text-text"
        >
          go to noted
        </Link>
      </div>
    );
  }

  const isOwner = !!user && user.id === item.user_id;

  return (
    <SharedView
      id={item.id}
      name={item.name}
      content={item.content}
      isOwner={isOwner}
    />
  );
}
