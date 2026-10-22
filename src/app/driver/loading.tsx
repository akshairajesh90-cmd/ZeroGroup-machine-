export default function DriverLoading() {
  return (
    <div className="space-y-4 animate-pulse max-w-lg mx-auto w-full">
      {/* Driver Header Card Skeleton */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="h-6 w-40 rounded bg-cyan-950/60 border border-cyan-800/30" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-800" />
        </div>
        <div className="h-3 w-48 rounded bg-slate-800/60" />
      </div>

      {/* Primary Action / Shift Card Skeleton */}
      <div className="h-32 rounded-2xl bg-slate-900/80 border-2 border-cyan-500/30 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 rounded bg-cyan-900/40" />
          <div className="h-5 w-24 rounded bg-slate-800" />
        </div>
        <div className="h-12 w-full rounded-xl bg-cyan-500/20" />
      </div>

      {/* Dispatches / Orders List Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="h-4 w-32 rounded bg-slate-800" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-5 w-36 rounded bg-slate-800" />
              <div className="h-5 w-16 rounded-full bg-slate-800/80" />
            </div>
            <div className="h-4 w-48 rounded bg-slate-800/50" />
            <div className="h-9 w-full rounded-xl bg-slate-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
