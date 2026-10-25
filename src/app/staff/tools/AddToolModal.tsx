"use client";

import React, { useState, useTransition } from "react";
import { addTool } from "@/actions/assets";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";

export function AddToolModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [toolId, setToolId] = useState("");
  const [toolType, setToolType] = useState("GENERAL");
  const [totalInventory, setTotalInventory] = useState<number>(1);
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [repairCount, setRepairCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setToolId("");
    setToolType("GENERAL");
    setTotalInventory(1);
    setDailyRate(0);
    setRepairCount(0);
    setErrorMessage(null);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await addTool({ name, toolId, toolType, totalInventory, dailyRate, repairCount });
        if (res.success) {
          handleClose();
          window.location.reload();
        } else {
          setErrorMessage(res.error || "Failed to add asset. Please check the values and try again.");
        }
      } catch (error: any) {
        console.error("AddTool error:", error);
        setErrorMessage(error?.message || "Failed to add asset. Please try again.");
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-900/20"
      >
        <Plus className="w-4 h-4" />
        Add Tool
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" /> Add New Asset
              </h3>
              <button onClick={handleClose} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-4 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div className="font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. 2 Wheel Trolly"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">ID / Barcode</label>
                  <input
                    type="text"
                    required
                    value={toolId}
                    onChange={(e) => {
                      setToolId(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. TL-007"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={toolType}
                    onChange={(e) => {
                      setToolType(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. TROLLY"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Total Stock Owned</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={totalInventory}
                    onChange={(e) => setTotalInventory(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">In Repair Units</label>
                  <input
                    type="number"
                    min="0"
                    value={repairCount}
                    onChange={(e) => setRepairCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">1-Day Rental Rate (₹/day)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 150"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
