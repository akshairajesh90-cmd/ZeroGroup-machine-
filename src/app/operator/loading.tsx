export default function OperatorLoading() {
  return (
    <div className="space-y-4 animate-pulse max-w-lg mx-auto w-full">
      {/* Operator Status Header Skeleton */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-zinc-800" />
            <div className="h-6 w-44 rounded bg-orange-950/50 border border-orange-800/30" />
          </div>
          <div className="h-12 w-12 rounded-full bg-zinc-800" />
        </div>
      </div>

      {/* Main Checklist / Job Card Skeleton */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-4">
        <div className="h-5 w-40 rounded bg-zinc-800" />
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-800/40 border border-zinc-800/30 flex items-center px-4 justify-between">
              <div className="h-4 w-48 rounded bg-zinc-800" />
              <div className="h-5 w-5 rounded-md bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 rounded-xl bg-zinc-800/50 border border-zinc-800/40" />
        <div className="h-14 rounded-xl bg-orange-500/20 border border-orange-500/30" />
      </div>
    </div>
  );
}
