"use client";

import React, { useState } from "react";
import { editTool } from "@/actions/assets";
import { PenTool, X } from "lucide-react";

export function EditToolModal({ tool }: { tool: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tool.name,
    toolId: tool.toolId,
    toolType: tool.toolType || "",
    totalInventory: tool.totalInventory,
    repairCount: tool.repairCount ?? 0,
    dailyRate: Number(tool.dailyRate ?? 0),
    isActive: tool.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await editTool(tool.id, {
        name: formData.name,
        toolId: formData.toolId,
        toolType: formData.toolType,
        totalInventory: parseInt(formData.totalInventory as any),
        repairCount: parseInt(formData.repairCount as any) || 0,
        dailyRate: parseFloat(formData.dailyRate as any) || 0,
        isActive: formData.isActive,
      });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to edit tool");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-500/30 ml-2"
        title="Edit Tool"
      >
        <PenTool className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90dvh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Edit Tool</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tool ID</label>
                <input
                  type="text"
                  required
                  value={formData.toolId}
                  onChange={(e) => setFormData({ ...formData, toolId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={formData.toolType}
                  onChange={(e) => setFormData({ ...formData, toolType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Owned</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.totalInventory}
                    onChange={(e) => setFormData({ ...formData, totalInventory: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">In Repair Units</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.repairCount}
                    onChange={(e) => setFormData({ ...formData, repairCount: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">1-Day Rental Rate (₹/day)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-white uppercase">Active Status</div>
                  <div className="text-[11px] text-slate-500">Disabled tools cannot be dispatched to new jobs</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
