"use client";

import { HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TitleBar({ email }: { email: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="h-9 border-b border-[var(--color-border)] flex items-center justify-between px-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
        <span>noted</span>
      </div>
      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
        <button
          onClick={() => window.dispatchEvent(new Event("toggle-shortcuts"))}
          className="hover:text-[var(--color-text)] flex items-center gap-1"
          title="keyboard shortcuts (⌘/)"
        >
          <HelpCircle size={12} />
        </button>
        <span>{email}</span>
        <button
          onClick={handleSignOut}
          className="hover:text-[var(--color-text)]"
        >
          sign out
        </button>
      </div>
    </div>
  );
}
