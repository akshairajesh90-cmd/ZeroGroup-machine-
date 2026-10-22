export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2 sm:p-4">
      {/* Top Banner Skeleton */}
      <div className="h-10 w-48 rounded-xl bg-slate-800/60" />
      
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800/60 p-4 space-y-3">
            <div className="h-4 w-20 rounded bg-slate-800" />
            <div className="h-8 w-28 rounded bg-slate-800/80" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-slate-900/80 border border-slate-800/60 p-6 space-y-4">
          <div className="h-6 w-36 rounded bg-slate-800" />
          <div className="h-48 w-full rounded-xl bg-slate-800/40" />
        </div>
        <div className="h-72 rounded-2xl bg-slate-900/80 border border-slate-800/60 p-6 space-y-4">
          <div className="h-6 w-28 rounded bg-slate-800" />
          <div className="space-y-3">
            <div className="h-10 rounded-lg bg-slate-800/50" />
            <div className="h-10 rounded-lg bg-slate-800/50" />
            <div className="h-10 rounded-lg bg-slate-800/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
