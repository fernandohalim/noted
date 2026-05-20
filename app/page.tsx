import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppShell email={user?.email ?? ""} userId={user?.id ?? ""} />;
}
