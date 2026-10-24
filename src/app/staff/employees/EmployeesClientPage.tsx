"use client";
import React, { useState } from "react";
import { Plus, Users, Edit2, Shield, Trash2 } from "lucide-react";
import { createEmployee, updateEmployee } from "@/actions/hr";
import { softDeleteEmployee } from "@/actions/employees";

export default function EmployeesClientPage({ employees }: { employees: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"CREATE"|"EDIT">("CREATE");
  const [selectedId, setSelectedId] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "", fixedSalary: "" });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const openCreate = () => { setMode("CREATE"); setFormData({ name: "", email: "", password: "", phone: "", fixedSalary: "" }); setIsModalOpen(true); };
  const openEdit = (emp: any) => { setMode("EDIT"); setSelectedId(emp.id); setFormData({ name: emp.name, email: emp.email || "", password: "", phone: emp.phone || "", fixedSalary: emp.fixedSalary?.toString() || "" }); setIsModalOpen(true); };

  const handleDelete = async (emp: any) => {
    if (!confirm(`Are you sure you want to deactivate ${emp.name}? This account will be moved to the Trash Hub.`)) return;
    setIsDeleting(emp.id);
    const res = await softDeleteEmployee(emp.id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete employee.");
      setIsDeleting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name, email: formData.email, password: formData.password, phone: formData.phone,
      role: "STAFF" as any, fixedSalary: formData.fixedSalary ? Number(formData.fixedSalary) : undefined
    };
    if (mode === "CREATE") await createEmployee(data);
    else await updateEmployee(selectedId, data);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-400"/> Office Employees</h1>
          <p className="text-sm text-slate-400">Manage salaried office staff and administrators.</p>
        </div>
        <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Add Staff</button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4 text-right">Monthly Salary (INR)</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-800/50">
                <td className="px-6 py-4 font-medium text-white">{emp.name}</td>
                <td className="px-6 py-4 text-indigo-400 font-semibold">{emp.role}</td>
                <td className="px-6 py-4 text-slate-400">{emp.email || "�"}</td>
                <td className="px-6 py-4 text-slate-400">{emp.phone || "�"}</td>
                <td className="px-6 py-4 text-right font-mono text-cyan-400 font-bold">{emp.fixedSalary}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(emp)} className="text-slate-400 hover:text-white" title="Edit">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button 
                      onClick={() => handleDelete(emp)} 
                      disabled={isDeleting === emp.id}
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
            <h2 className="text-xl font-bold text-white mb-4">{mode === "CREATE" ? "Add Office Staff" : "Edit Staff"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"/></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"/></div>
              {mode === "CREATE" && <div><label className="block text-xs font-semibold text-slate-400 mb-1">Password</label><input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"/></div>}
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Phone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"/></div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Fixed Monthly Salary (INR)</label><input type="number" value={formData.fixedSalary} onChange={e => setFormData({...formData, fixedSalary: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"/></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800">Cancel</button><button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

