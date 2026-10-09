'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculateWorkerLedgerBalances } from '@/actions/settlement';
import { createSalaryAdvance } from '@/actions/advances';
import { Calendar, TrendingUp, IndianRupee, ShieldAlert, CheckCircle2, AlertTriangle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffLedgerClient({ logs }: { logs: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'DIARY' | 'LEDGER'>('DIARY');
  
  // Ledger State
  const [startDate, setStartDate] = useState(
    format(new Date(Date.now() - 6 * 86400000), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [breakdown, setBreakdown] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Advance Modal State
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjPlayerId, setAdjPlayerId] = useState('');
  const [adjAmount, setAdjAmount] = useState<number | string>('');
  const [adjReason, setAdjReason] = useState('');
  
  useEffect(() => {
    if (viewMode === 'LEDGER') {
      fetchLedger();
    }
  }, [viewMode, startDate, endDate]);

  const fetchLedger = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await calculateWorkerLedgerBalances({ startDate, endDate });
      if (!res.success || !res.data) {
        setErrorMsg(res.error || 'Failed to fetch worker ledger.');
      } else {
        setBreakdown(res.data);
      }
    });
  };

  const handleIssueAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || Number(adjAmount) <= 0) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await createSalaryAdvance({
          employeeId: adjPlayerId,
          amount: Number(adjAmount),
          reason: adjReason,
        });

        if (!res.success) {
          setErrorMsg('Failed to issue advance.');
        } else {
          setShowAdjModal(false);
          setAdjAmount('');
          setAdjReason('');
          fetchLedger(); // Refresh balances
          router.refresh();
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred while issuing advance.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <button
          onClick={() => setViewMode('DIARY')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            viewMode === 'DIARY' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Diary 1 (Field Logs)
        </button>
        <button
          onClick={() => setViewMode('LEDGER')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            viewMode === 'LEDGER' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Worker Ledger (Balances)
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {viewMode === 'DIARY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                 <tr>
                   <th className="p-4 border-b border-slate-800">Date / Job</th>
                   <th className="p-4 border-b border-slate-800">Status & Time</th>
                   <th className="p-4 border-b border-slate-800">Crew Attendance</th>
                   <th className="p-4 border-b border-slate-800">External Labor</th>
                   <th className="p-4 border-b border-slate-800">Notes</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                       <td className="p-4 align-top">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1.5 font-bold text-white">
                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                {format(new Date(log.date), "MMM d, yyyy")}
                             </div>
                             <span className="text-xs text-slate-400">{log.dispatch?.customer?.name}</span>
                             <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded w-max">{log.dispatch?.location}</span>
                          </div>
                       </td>
                       <td className="p-4 align-top">
                           <div className="flex flex-col gap-1.5">
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-max ${log.siteStatus === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                   {log.siteStatus}
                               </span>
                           </div>
                       </td>
                       <td className="p-4 align-top">
                          {log.attendanceLogs.length > 0 ? (
                             <ul className="space-y-1">
                                {log.attendanceLogs.map((att: any) => (
                                   <li key={att.id} className="flex items-center gap-2 text-xs">
                                      <span className={att.isPresent ? "text-slate-200" : "text-slate-500 line-through"}>{att.employee?.name}</span>
                                   </li>
                                ))}
                             </ul>
                          ) : (
                             <span className="text-xs text-slate-500 italic">No attendance logged</span>
                          )}
                       </td>
                       <td className="p-4 align-top">
                          {log.externalLabor.length > 0 ? (
                             <ul className="space-y-2">
                                {log.externalLabor.map((ext: any) => (
                                   <li key={ext.id} className="text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
                                      <div className="font-bold text-amber-400 mb-1">{ext.subLeaderName}</div>
                                      <div className="flex justify-between text-slate-300">
                                         <span>{ext.workerCount} Workers</span>
                                         <span className="text-emerald-400 flex items-center gap-0.5">₹{Number(ext.cashPaid)}</span>
                                      </div>
                                   </li>
                                ))}
                             </ul>
                          ) : (
                             <span className="text-xs text-slate-500 italic">None</span>
                          )}
                       </td>
                       <td className="p-4 align-top text-xs text-slate-400 max-w-[200px] truncate">
                          {log.notes || "-"}
                       </td>
                    </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {viewMode === 'LEDGER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-emerald-400" /> Worker Balances
              </h2>
              <p className="text-xs text-slate-400">View net payout balances and issue mid-week advances.</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white" />
            </div>
          </div>

          {isPending ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
              Loading balances...
            </div>
          ) : breakdown ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {breakdown.players.map((p: any) => {
                const earned = p.laborEarned || 0;
                const bonuses = p.approvedBonuses || 0;
                const advances = (p.advances || 0) + (p.cashHeld || 0) + (p.penalties || 0);
                const net = (earned + bonuses) - advances;
                const isNegative = net < 0;

                return (
                  <div key={p.playerId} className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-md flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-white truncate">{p.playerName}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded font-black bg-slate-800 text-slate-300">{p.playerRole}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Earned</span>
                          <span className="font-mono text-emerald-400">₹{earned}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Advances</span>
                          <span className="font-mono text-amber-400">₹{advances}</span>
                        </div>
                      </div>
                      <div className={`mt-3 pt-3 border-t border-slate-800 flex items-center justify-between`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Net Balance</span>
                        <span className={`text-lg font-black font-mono ${isNegative ? 'text-red-500' : 'text-emerald-400'}`}>
                          {isNegative ? '-' : ''}₹{Math.abs(net)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAdjPlayerId(p.playerId);
                        setShowAdjModal(true);
                      }}
                      className="mt-4 w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" /> Issue Advance/Payout
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* ADVANCE MODAL */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 bg-slate-950">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" /> Issue Salary Advance / Payout
              </h3>
              <p className="text-xs text-slate-400 mt-1">Maximum limit for STAFF is ₹5,000.</p>
            </div>
            <form onSubmit={handleIssueAdvance} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100000"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="e.g. 1500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Notes / Reason</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Mid-week cash requirement"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdjModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-colors flex justify-center items-center">
                  {isPending ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
