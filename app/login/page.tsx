"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );

  const busy = submitting || oauthLoading !== null;

  const handleOAuth = async (provider: "google" | "github") => {
    if (busy) return;
    setError(null);
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
    // On success the browser navigates away; we leave the loading state on.
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSubmitting(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword
        : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      router.push("/");
    }
  };

  const btnBase =
    "w-full px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl mb-1">noted</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          notes for programmers, everywhere.
        </p>

        <div className="space-y-2 mb-6">
          <button
            onClick={() => handleOAuth("google")}
            disabled={busy}
            className={`${btnBase} border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]`}
          >
            {oauthLoading === "google" && (
              <Loader2 size={12} className="animate-spin" />
            )}
            continue with google
          </button>
          <button
            onClick={() => handleOAuth("github")}
            disabled={busy}
            className={`${btnBase} border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]`}
          >
            {oauthLoading === "github" && (
              <Loader2 size={12} className="animate-spin" />
            )}
            continue with github
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            placeholder="email"
            required
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="password"
            required
            minLength={6}
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm disabled:opacity-50"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className={`${btnBase} bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)]`}
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {mode === "signin" ? "sign in" : "sign up"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          disabled={busy}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-4 disabled:opacity-50"
        >
          {mode === "signin"
            ? "need an account? sign up"
            : "have an account? sign in"}
        </button>
      </div>
    </div>
  );
}
