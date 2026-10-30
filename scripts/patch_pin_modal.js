const fs = require('fs');

const modalPath = 'src/components/dispatch/SiteLocationPinModal.tsx';
let content = fs.readFileSync(modalPath, 'utf8');

const targetStr = `        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-white tracking-tight">
                Site Location & GPS Pin
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {customerName ? \`Client: \${customerName}\` : "Dispatch Destination Overview"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {hasCoords && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-sm">
                    🟢 GPS Locked
                  </span>
                )}
                {isCentroidVerified && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap shadow-sm">
                    🎯 Centroid Verified ({Math.round((dwellConfidence || 0.95) * 100)}%)
                  </span>
                )}
                {isOffRoad && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-sm">
                    🌲 Off-Road Track
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>`;

const replacementStr = `        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white tracking-tight truncate">
                Site Location & GPS Pin
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {customerName ? \`Client: \${customerName}\` : "Dispatch Destination Overview"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badges Row */}
        {(hasCoords || isCentroidVerified || isOffRoad) && (
          <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {hasCoords && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-sm shrink-0">
                🟢 GPS Locked
              </span>
            )}
            {isCentroidVerified && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap shadow-sm shrink-0">
                🎯 Centroid Verified ({Math.round((dwellConfidence || 0.95) * 100)}%)
              </span>
            )}
            {isOffRoad && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-sm shrink-0">
                🌲 Off-Road Track
              </span>
            )}
          </div>
        )}`;

content = content.split(/\r?\n/).join('\n');
const targetNorm = targetStr.split(/\r?\n/).join('\n');
const replacementNorm = replacementStr.split(/\r?\n/).join('\n');

if (content.includes(targetNorm)) {
  content = content.replace(targetNorm, replacementNorm);
  fs.writeFileSync(modalPath, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('SiteLocationPinModal.tsx updated successfully');
} else {
  console.log('Target string not found in SiteLocationPinModal.tsx');
}
