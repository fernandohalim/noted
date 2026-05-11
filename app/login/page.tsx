"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword
        : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/");
  };

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
            disabled={loading}
            className="w-full px-4 py-2 border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-sm transition-colors"
          >
            continue with google
          </button>
          <button
            onClick={() => handleOAuth("github")}
            disabled={loading}
            className="w-full px-4 py-2 border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-sm transition-colors"
          >
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)] text-sm transition-colors"
          >
            {mode === "signin" ? "sign in" : "sign up"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-4"
        >
          {mode === "signin"
            ? "need an account? sign up"
            : "have an account? sign in"}
        </button>
      </div>
    </div>
  );
}
