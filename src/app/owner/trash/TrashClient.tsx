"use client";

import { useState } from "react";
import { restoreItem, deleteItemPermanently, TrashItem } from "@/actions/trash";
import { format } from "date-fns";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";

export default function TrashClient({
  initialItems,
  currentUserRole
}: {
  initialItems: TrashItem[];
  currentUserRole: Role;
}) {
  const router = useRouter();
  const [items, setItems] = useState<TrashItem[]>(initialItems);
  const [loading, setLoading] = useState<string | null>(null);

  const handleRestore = async (id: string, type: string) => {
    if (!confirm("Are you sure you want to restore this item?")) return;
    setLoading(id);
    const res = await restoreItem(id, type);
    if (res.success) {
      setItems(prev => prev.filter(item => item.id !== id));
      router.refresh();
    } else {
      alert(res.error || "Failed to restore item");
    }
    setLoading(null);
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this item? This action cannot be undone.")) return;
    setLoading(id);
    const res = await deleteItemPermanently(id, type);
    if (res.success) {
      setItems(prev => prev.filter(item => item.id !== id));
      router.refresh();
    } else {
      alert(res.error || "Failed to delete item permanently");
    }
    setLoading(null);
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Trash is empty</h3>
        <p className="text-slate-400">There are currently no items in the trash.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title / Name</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Deleted By</th>
              <th className="px-4 py-3">Deleted At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{item.type}</td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{item.details}</td>
                <td className="px-4 py-3 text-xs">
                  {item.deletedBy ? <span className="bg-slate-800 px-2 py-1 rounded text-slate-300">{item.deletedBy}</span> : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.deletedAt ? format(new Date(item.deletedAt), "dd MMM yyyy, HH:mm") : "-"}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleRestore(item.id, item.type)}
                    disabled={loading === item.id}
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors disabled:opacity-50 text-xs font-medium"
                    title="Restore"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Restore
                  </button>
                  {currentUserRole === Role.OWNER && (
                    <button
                      onClick={() => handleDelete(item.id, item.type)}
                      disabled={loading === item.id}
                      className="inline-flex items-center px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors disabled:opacity-50 text-xs font-medium"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
