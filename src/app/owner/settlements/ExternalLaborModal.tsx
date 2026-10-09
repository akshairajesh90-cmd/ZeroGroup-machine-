'use client';
import React, { useState, useTransition } from 'react';
import { logSiteLaborDisbursement } from '@/actions/externalLabor';
import { X, Users } from 'lucide-react';

export default function ExternalLaborModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contractorName, setContractorName] = useState('');
  const [dispatchId, setDispatchId] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [workerCount, setWorkerCount] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("dispatchId", dispatchId);
      fd.append("subLeaderId", contractorName);
      fd.append("totalCashHandedOut", amount.toString());
      fd.append("externalWorkerNames", `Count: ${workerCount}`);
      const res = await logSiteLaborDisbursement(null, fd);

      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Failed to log');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500"/> Log External Labor
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 p-3 rounded text-red-400 text-xs">{error}</div>}
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">Contractor / Sub-Leader Name</label>
            <input required value={contractorName} onChange={e=>setContractorName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Dispatch / Job ID</label>
            <input required value={dispatchId} onChange={e=>setDispatchId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Date</label>
            <input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount (?)</label>
              <input required type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Worker Count</label>
              <input required type="number" min="1" value={workerCount} onChange={e=>setWorkerCount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl mt-4">
            {isPending ? 'Logging...' : 'Log Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
