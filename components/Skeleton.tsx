export default function AppSkeleton() {
  const rows = Array.from({ length: 7 });
  return (
    <div className="h-dvh flex flex-col">
      <div className="h-9 border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs text-text-muted">noted</span>
        </div>
        <div className="h-3 w-24 bg-bg-elevated rounded animate-pulse" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-border bg-bg hidden md:flex flex-col">
          <div className="h-9 border-b border-border flex items-center px-3">
            <div className="h-3 w-12 bg-bg-elevated rounded animate-pulse" />
          </div>
          <div className="py-2 px-2 space-y-2">
            {rows.map((_, i) => (
              <div
                key={i}
                className="h-5 bg-bg-elevated rounded animate-pulse"
                style={{ width: `${55 + ((i * 13) % 40)}%` }}
              />
            ))}
          </div>
        </aside>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-muted animate-pulse">
            syncing your notes...
          </p>
        </main>
      </div>
    </div>
  );
}