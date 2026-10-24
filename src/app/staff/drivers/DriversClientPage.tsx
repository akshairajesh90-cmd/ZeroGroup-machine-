"use client";
import React, { useState } from "react";
import { Plus, Edit2, HardHat, Trash2, UserCheck, UserX } from "lucide-react";
import { createEmployee, updateEmployee } from "@/actions/hr";
import { softDeleteEmployee, toggleEmployeeActiveStatus } from "@/actions/employees";

const CREW_ROLES = [
  { value: "HELPER", label: "Helper" },
  { value: "MASON", label: "Mason" },
  { value: "CARPENTER", label: "Carpenter" },
  { value: "WELDER", label: "Welder" },
];

export default function DriversClientPage({ Drivers }: { Drivers: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"CREATE"|"EDIT">("CREATE");
  const [selectedId, setSelectedId] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", baseDailyWage: "", capableRoles: [] as string[] });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const openCreate = () => { setMode("CREATE"); setFormData({ name: "", phone: "", baseDailyWage: "", capableRoles: [] }); setIsModalOpen(true); };
  const openEdit = (w: any) => { setMode("EDIT"); setSelectedId(w.id); setFormData({ name: w.name, phone: w.phone || "", baseDailyWage: w.baseDailyWage?.toString() || "", capableRoles: w.capableRoles || [] }); setIsModalOpen(true); };

  const handleToggleStatus = async (driver: any) => {
    const nextStatus = driver.isActive === false;
    const actionWord = nextStatus ? "enable" : "disable";
    if (!confirm(`Are you sure you want to ${actionWord} driver ${driver.name}? ${!nextStatus ? "This will revoke active sessions and prevent login." : ""}`)) return;
    setIsToggling(driver.id);
    const res = await toggleEmployeeActiveStatus(driver.id, nextStatus);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || `Failed to ${actionWord} driver.`);
      setIsToggling(null);
    }
  };

  const handleDelete = async (driver: any) => {
    if (!confirm(`Are you sure you want to deactivate driver ${driver.name}? Their profile will be moved to the Trash Hub.`)) return;
    setIsDeleting(driver.id);
    const res = await softDeleteEmployee(driver.id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete driver.");
      setIsDeleting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name, email: `driver_${Date.now()}@zerogroup.in`, password: "password123", phone: formData.phone,
      role: "Driver" as any, baseDailyWage: formData.baseDailyWage ? Number(formData.baseDailyWage) : undefined, capableRoles: formData.capableRoles
    };
    if (mode === "CREATE") await createEmployee(data);
    else await updateEmployee(selectedId, data);
    setIsModalOpen(false);
  };

  const toggleRole = (role: string) => setFormData(prev => ({ ...prev, capableRoles: prev.capableRoles.includes(role) ? prev.capableRoles.filter(r => r !== role) : [...prev.capableRoles, role] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><HardHat className="w-6 h-6 text-amber-400"/> Field Drivers</h1>
          <p className="text-sm text-slate-400">Manage daily wage laborers, helpers, and tradesmen.</p>
        </div>
        <button onClick={openCreate} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Add Driver</button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Trades & Fares</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4 text-right">Default Wage (INR)</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {(Drivers || []).map(w => (
              <tr key={w.id} className="hover:bg-slate-800/50">
                <td className="px-6 py-4 font-medium text-white">{w.name}</td>
                <td className="px-6 py-4">
                  {w.isActive === false ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      Disabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(w.capableRoles || []).map((cr: string) => (
                      <span key={cr} className="px-2 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded text-[11px] font-semibold">{CREW_ROLES.find(r => r.value === cr)?.label || cr}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{w.phone || "—"}</td>
                <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">{w.baseDailyWage}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => openEdit(w)} className="text-slate-400 hover:text-white" title="Edit">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(w)}
                      disabled={isToggling === w.id}
                      className={w.isActive === false ? "text-emerald-400 hover:text-emerald-300 disabled:opacity-50" : "text-amber-400 hover:text-amber-300 disabled:opacity-50"}
                      title={w.isActive === false ? "Enable Driver" : "Disable Driver"}
                    >
                      {w.isActive === false ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(w)} 
                      disabled={isDeleting === w.id}
                      className="text-rose-400 hover:text-rose-300 disabled:opacity-50" 
                      title="Deactivate and move to Trash"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <h2 className="text-xl font-bold text-white mb-4">{mode === "CREATE" ? "Add Field Driver" : "Edit Driver"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500"/></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Phone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500"/></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Base Daily Wage (INR)</label><input required type="number" value={formData.baseDailyWage} onChange={e => setFormData({...formData, baseDailyWage: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500"/></div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Capable Trades</label>
                <div className="flex flex-wrap gap-2">
                  {CREW_ROLES.map(role => (
                    <button type="button" key={role.value} onClick={() => toggleRole(role.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors`}>{role.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800">Cancel</button><button type="submit" className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold">Save Driver</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
