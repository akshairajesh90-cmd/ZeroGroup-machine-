export default function StaffLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2 sm:p-4">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 rounded-xl bg-zinc-800/70" />
        <div className="h-9 w-28 rounded-xl bg-emerald-950/40 border border-emerald-800/30" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-zinc-800" />
            <div className="h-7 w-24 rounded bg-zinc-800/80" />
          </div>
        ))}
      </div>

      {/* Primary Table / Cards Skeleton */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-5 space-y-4">
        <div className="h-6 w-32 rounded bg-zinc-800" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 w-full rounded-xl bg-zinc-800/40 border border-zinc-800/30 flex items-center px-4 justify-between">
              <div className="h-4 w-32 rounded bg-zinc-800" />
              <div className="h-4 w-20 rounded bg-zinc-800" />
              <div className="h-6 w-16 rounded-full bg-zinc-800/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
