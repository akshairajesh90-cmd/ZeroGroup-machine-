"use client";

import React, { useState } from "react";
import { AlertTriangle, RotateCcw, Trash2, Clock, ShieldAlert, Receipt, UserRound } from "lucide-react";
import { hardDeleteEmployee, restoreEmployee } from "@/actions/employees";
import { hardDeletePaymentReceipt, restorePaymentReceipt } from "@/actions/receipts";

interface TrashItem {
  id: string;
  type: "EMPLOYEE" | "RECEIPT";
  title: string;
  subtitle: string;
  deletedAt: string;
}

interface Props {
  trashItems: TrashItem[];
}

export default function TrashClientPage({ trashItems }: Props) {
  const [items, setItems] = useState(trashItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRestore = async (id: string, type: "EMPLOYEE" | "RECEIPT") => {
    if (!confirm("Are you sure you want to restore this record? It will reappear in all portals instantly.")) return;
    setLoadingId(id);
    const res = type === "EMPLOYEE" ? await restoreEmployee(id) : await restorePaymentReceipt(id);
    if (res.success) {
      setItems(items.filter(item => item.id !== id));
    } else {
      alert(res.error || "Failed to restore");
    }
    setLoadingId(null);
  };

  const handleHardDelete = async (id: string, type: "EMPLOYEE" | "RECEIPT") => {
    if (!confirm("CRITICAL WARNING: This will permanently delete this record from the database. It cannot be undone. Are you absolutely sure?")) return;
    setLoadingId(id);
    const res = type === "EMPLOYEE" ? await hardDeleteEmployee(id) : await hardDeletePaymentReceipt(id);
    if (res.success) {
      setItems(items.filter(item => item.id !== id));
    } else {
      alert(res.error || "Failed to delete");
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-red-500 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8" />
            Trash & Recovery
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Review soft-deleted records. Restore them to active duty, or permanently erase them.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-red-500/20 bg-zinc-900/40 overflow-hidden">
        <div className="flex items-center justify-between border-b border-red-500/20 bg-red-500/5 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {items.length} Pending Deletion{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-800 mb-4">
              <Trash2 className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-semibold">Trash is empty</p>
            <p className="text-zinc-600 text-sm mt-1">
              No records are currently pending deletion.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {items.map((item) => {
              const isLoading = loadingId === item.id;
              const date = new Date(item.deletedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
              });

              return (
                <div key={item.id} className="flex items-center gap-4 px-6 py-5 hover:bg-zinc-800/30 transition-colors">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black text-sm ${
                    item.type === "EMPLOYEE" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {item.type === "EMPLOYEE" ? <UserRound className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{item.title}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        item.type === "EMPLOYEE" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-1.5 text-zinc-500 text-xs shrink-0 mx-4">
                    <Clock className="h-3.5 w-3.5" />
                    Deleted: {date}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(item.id, item.type)}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                    <button
                      onClick={() => handleHardDelete(item.id, item.type)}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 border border-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hard Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
