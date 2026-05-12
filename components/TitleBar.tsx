"use client";

import { useState } from "react";
import { Menu, HelpCircle, Loader2, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useOnline } from "@/lib/use-online";

export default function TitleBar({
  email,
  onToggleSidebar,
}: {
  email: string;
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const isOnline = useOnline();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="h-9 border-b border-[var(--color-border)] flex items-center justify-between px-3 text-xs flex-shrink-0">
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5"
            title="toggle sidebar"
            aria-label="toggle sidebar"
          >
            <Menu size={14} />
          </button>
        )}
        <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
        <span>noted</span>
        {!isOnline && (
          <span className="flex items-center gap-1 text-yellow-500 ml-2">
            <WifiOff size={10} />
            <span className="hidden sm:inline">offline</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
        <button
          onClick={() => window.dispatchEvent(new Event("toggle-shortcuts"))}
          className="hover:text-[var(--color-text)] flex items-center gap-1"
          title="keyboard shortcuts (?)"
          aria-label="keyboard shortcuts"
        >
          <HelpCircle size={12} />
        </button>
        <span className="hidden sm:inline truncate max-w-[200px]">{email}</span>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="hover:text-[var(--color-text)] flex items-center gap-1.5 disabled:opacity-50"
        >
          {signingOut && <Loader2 size={10} className="animate-spin" />}
          <span className="hidden sm:inline">sign out</span>
          <span className="sm:hidden">out</span>
        </button>
      </div>
    </div>
  );
}
