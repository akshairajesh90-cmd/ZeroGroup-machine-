"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Shield, Users, Edit2, Plus, AlertTriangle, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { createEmployee, updateEmployee, saveEmployeeRoleRates } from "@/actions/hr";
import { softDeleteEmployee, toggleEmployeeActiveStatus } from "@/actions/employees";
import { Role } from "@prisma/client";

// All system roles with display labels
const SYSTEM_ROLES: { value: Role; label: string; description: string }[] = [
  { value: "DRIVER",   label: "Driver",         description: "Vehicle driver, assigned to dispatch shifts" },
  { value: "OPERATOR", label: "Operator",        description: "Machine operator (mixer, lift, vibrator, etc.)" },
  { value: "WORKER",   label: "Worker / Helper", description: "Site labour, crew helper, general field worker" },
  { value: "STAFF",    label: "Office Staff",    description: "Can access staff portal, manage dispatches & billing" },
  { value: "ADMIN",    label: "System Admin",    description: "Full access except owner-only settings" },
  { value: "OWNER",    label: "Owner",           description: "Full system access including trash & settlements" },
];

// All crew job roles
const CREW_ROLES: { value: string; label: string; group: string }[] = [
  { value: "DRIVER",             label: "Driver",              group: "Transport" },
  { value: "MIXER_OPERATOR",     label: "Mixer Operator",      group: "Machine Ops" },
  { value: "HYDRAULIC_OPERATOR", label: "Hydraulic Operator",  group: "Machine Ops" },
  { value: "VIBRATOR_OPERATOR",  label: "Vibrator Operator",   group: "Machine Ops" },
  { value: "P_VIBRATOR",         label: "Petrol Vibrator Op.", group: "Machine Ops" },
  { value: "LIFT_OPERATOR",      label: "Lift Operator",       group: "Machine Ops" },
  { value: "WORKER_LEADER",      label: "Company Site Leader", group: "Site Labour" },
  { value: "SUB_LEADER",         label: "Sub Leader (Worker Provider)", group: "Site Labour" },
  { value: "HELPER",             label: "General Helper",      group: "Site Labour" },
  { value: "PANI_HELPER",        label: "Pani Helper",         group: "Site Labour" },
  { value: "TROLLY_1_WHEEL",     label: "1-Wheel Trolly Operator (Wheelbarrow / Ramp Handler)", group: "Site Labour" },
  { value: "TROLLY_2_WHEEL",     label: "2-Wheel Trolly Handler (Concrete Cart)", group: "Site Labour" },
];

const CREW_GROUPS = ["Transport", "Machine Ops", "Site Labour"];

export default function StaffPortalClient({
  currentUserRole,
  employees,
  auditLogs,
}: {
  currentUserRole: Role;
  employees: any[];
  auditLogs: any[];
}) {
  const [activeTab, setActiveTab] = useState<"DIRECTORY" | "AUDIT">("DIRECTORY");
  const [directoryFilter, setDirectoryFilter] = useState<"ALL" | "STAFF" | "WORKERS" | "OPERATORS">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedId, setSelectedId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "WORKER" as Role,
    baseDailyWage: "", fixedSalary: "",
    capableRoles: [] as string[],
    roleRates: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const router = useRouter();

  const canManageAdmins = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleToggleStatus = async (emp: any) => {
    const nextStatus = emp.isActive === false;
    const actionWord = nextStatus ? "enable" : "disable";
    if (!confirm(`Are you sure you want to ${actionWord} ${emp.name}? ${!nextStatus ? "This will revoke active sessions and prevent login." : ""}`)) return;
    setIsToggling(emp.id);
    const res = await toggleEmployeeActiveStatus(emp.id, nextStatus);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || `Failed to ${actionWord} employee.`);
      setIsToggling(null);
    }
  };

  const handleDelete = async (emp: any) => {
    if (!confirm(`Are you sure you want to deactivate ${emp.name}? This account will be moved to the Trash Hub.`)) return;
    setIsDeleting(emp.id);
    const res = await softDeleteEmployee(emp.id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete employee.");
      setIsDeleting(null);
    }
  };

  const visibleSystemRoles = SYSTEM_ROLES.filter(r =>
    canManageAdmins ? true : !["STAFF", "ADMIN", "OWNER"].includes(r.value)
  );

  const openCreateModal = () => {
    setModalMode("CREATE");
    setFormData({ 
      name: "", email: "", phone: "", role: "WORKER", 
      baseDailyWage: "", fixedSalary: "", capableRoles: [], roleRates: {} 
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setModalMode("EDIT");
    setSelectedId(emp.id);
    
    // Load per-role rates
    const initialRoleRates: Record<string, string> = {};
    if (emp.roleRates) {
      emp.roleRates.forEach((rr: any) => {
        initialRoleRates[rr.crewRole] = rr.wagePerDay.toString();
      });
    }

    setFormData({
      name: emp.name,
      email: "N/A (Hidden)",
      phone: emp.phone || "",
      role: emp.role,
      baseDailyWage: emp.baseDailyWage ? String(emp.baseDailyWage) : "", fixedSalary: emp.fixedSalary ? String(emp.fixedSalary) : "",
      capableRoles: emp.capableRoles || [],
      roleRates: initialRoleRates,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const toggleCrewRole = (val: string) => {
    setFormData(prev => ({
      ...prev,
      capableRoles: prev.capableRoles.includes(val)
        ? prev.capableRoles.filter(r => r !== val)
        : [...prev.capableRoles, val],
    }));
  };

  const updateRoleRate = (crewRole: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      roleRates: { ...prev.roleRates, [crewRole]: val }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const wage = formData.baseDailyWage ? Number(formData.baseDailyWage) : 0;
    const fSalary = formData.fixedSalary ? Number(formData.fixedSalary) : undefined;
    
    let res;
    if (modalMode === "CREATE") {
      res = await createEmployee({ 
        name: formData.name, email: formData.email, phone: formData.phone, role: formData.role, baseDailyWage: wage, fixedSalary: fSalary 
      });
    } else {
      res = await updateEmployee(selectedId, {
        role: formData.role,
        phone: formData.phone,
        baseDailyWage: wage,
        fixedSalary: fSalary,
        capableRoles: formData.capableRoles,
      });
    }
    
    if ((res as any).success) {
      const empId = modalMode === "CREATE" ? (res as any).data?.id : selectedId;
      
      // Save per-role rates
      if (formData.capableRoles.length > 0) {
        const ratesPayload = formData.capableRoles.map(cr => ({
          crewRole: cr,
          wagePerDay: Number(formData.roleRates[cr] || wage || 0)
        }));
        await saveEmployeeRoleRates(empId, ratesPayload);
      }

      setIsModalOpen(false);
      router.refresh();
    } else {
      setError(res.error || "An error occurred");
    }
    setLoading(false);
  };

  const getRoleBadge = (role: Role) => {
    const map: Record<string, { cls: string; label: string }> = {
      OWNER:    { cls: "bg-purple-500/20 text-purple-300 border-purple-500/30",  label: "Owner" },
      ADMIN:    { cls: "bg-red-500/20 text-red-300 border-red-500/30",           label: "Admin" },
      STAFF:    { cls: "bg-blue-500/20 text-blue-300 border-blue-500/30",        label: "Staff" },
      DRIVER:   { cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",     label: "Driver" },
      OPERATOR: { cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Operator" },
      WORKER:   { cls: "bg-slate-600/40 text-slate-300 border-slate-600",        label: "Worker" },
    };
    const d = map[role] || { cls: "bg-slate-800 text-slate-300 border-slate-700", label: role };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold border ${d.cls}`}>{d.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 pb-2">
        <button className={`pb-2 px-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === "DIRECTORY" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-slate-400 hover:text-slate-200"}`} onClick={() => setActiveTab("DIRECTORY")}>
          <Users className="w-4 h-4" /> Staff Directory
        </button>
        {canManageAdmins && (
          <button className={`pb-2 px-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === "AUDIT" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-slate-400 hover:text-slate-200"}`} onClick={() => setActiveTab("AUDIT")}>
            <ShieldCheck className="w-4 h-4" /> Security Audit Log
          </button>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-h-[500px]">

        {/* DIRECTORY */}
        {activeTab === "DIRECTORY" && (
          <div>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-lg font-bold text-white">Personnel List</h2>
              <button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Employee
              </button>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex px-4 py-2 bg-slate-900 border-b border-slate-800 gap-2">
              {(["ALL", "STAFF", "WORKERS", "OPERATORS"] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setDirectoryFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${directoryFilter === f ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950/50 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}
                >
                  {f === "ALL" ? "All Personnel" : f === "STAFF" ? "Office Employees" : f === "WORKERS" ? "Field Workers" : "Operators & Drivers"}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Employee Name</th>
                    <th className="px-6 py-4 font-semibold">System Role</th>
                    <th className="px-6 py-4 font-semibold">Jobs & Fares</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold text-right">Default Base (₹)</th>
                    <th className="px-6 py-4 font-semibold text-right">Fixed Salary (₹)</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {employees.filter(emp => {
                    if (directoryFilter === "STAFF") return emp.role === "STAFF" || emp.role === "OWNER" || emp.fixedSalary > 0;
                    if (directoryFilter === "WORKERS") return emp.role === "WORKER";
                    if (directoryFilter === "OPERATORS") return emp.role === "OPERATOR" || emp.role === "DRIVER";
                    return true;
                  }).map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">{emp.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getRoleBadge(emp.role)}
                          {emp.isActive === false ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Disabled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(emp.capableRoles || []).map((cr: string) => {
                            const customRate = emp.roleRates?.find((rr: any) => rr.crewRole === cr);
                            return (
                              <span key={cr} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[11px] font-semibold flex items-center gap-1.5">
                                {CREW_ROLES.find(r => r.value === cr)?.label || cr}
                                {customRate && <span className="text-emerald-400">₹{customRate.wagePerDay}</span>}
                              </span>
                            );
                          })}
                          {(!emp.capableRoles || emp.capableRoles.length === 0) && <span className="text-slate-600 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{emp.phone || "—"}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-300 font-bold">{emp.baseDailyWage ? emp.baseDailyWage.toString() : "—"}</td>
                      <td className="px-6 py-4 text-right font-mono text-cyan-400 font-bold">{emp.fixedSalary ? emp.fixedSalary.toString() : "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(emp)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors border border-slate-700">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(emp)} 
                            disabled={isToggling === emp.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border disabled:opacity-50 ${
                              emp.isActive === false
                                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }`}
                            title={emp.isActive === false ? "Enable Account" : "Disable Account"}
                          >
                            {emp.isActive === false ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" /> Enable
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" /> Disable
                              </>
                            )}
                          </button>
                          <button 
                            onClick={() => handleDelete(emp)} 
                            disabled={isDeleting === emp.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-md transition-colors border border-rose-500/30 disabled:opacity-50"
                            title="Deactivate and move to Trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {activeTab === "AUDIT" && canManageAdmins && (
          <div>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" /> System Audit Trail</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th><th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Action</th><th className="px-6 py-4">Target</th><th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">{format(new Date(log.timestamp), "MMM dd, HH:mm")}</td>
                      <td className="px-6 py-4"><div className="font-bold text-slate-300">{log.actor?.name || "System"}</div><div className="text-[10px] text-slate-500 uppercase">{log.actorRole}</div></td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-800 text-amber-400 text-[10px] font-bold rounded font-mono">{log.actionType}</span></td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">{log.modelName} {log.entity ? `#${log.entity.slice(-6)}` : ""}</td>
                      <td className="px-6 py-4">
                        <details className="text-xs text-slate-400 cursor-pointer">
                          <summary className="font-medium hover:text-white">View</summary>
                          <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800">
                            {log.oldPayload && <><div className="text-rose-400 mb-1">Before:</div><pre>{JSON.stringify(log.oldPayload, null, 2)}</pre></>}
                            {log.newPayload && <><div className="text-emerald-400 mb-1 mt-2">After:</div><pre>{JSON.stringify(log.newPayload, null, 2)}</pre></>}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No audit logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-800 shrink-0">
              <h2 className="text-xl font-bold text-white">{modalMode === "CREATE" ? "Add New Employee" : "Edit Employee Profile & Fares"}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input type="text" required disabled={modalMode === "EDIT"} value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50" />
              </div>

              {/* Email */}
              {modalMode === "CREATE" && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email (Login ID)</label>
                  <input type="email" required value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  <p className="text-[10px] text-amber-500 mt-1">Default password: <span className="font-mono font-bold">zero123</span></p>
                </div>
              )}

              {/* Phone + Wage + Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Base Wage (₹/day)</label>
                  <input type="number" value={formData.baseDailyWage} onChange={e => setFormData({ ...formData, baseDailyWage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fixed Salary (₹/mo)</label>
                  <input type="number" value={formData.fixedSalary} onChange={e => setFormData({ ...formData, fixedSalary: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* System Role — radio buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  System Role <span className="text-slate-600 normal-case font-normal">(controls portal access)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {visibleSystemRoles.map(r => (
                    <label key={r.value} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${formData.role === r.value ? "border-emerald-500/60 bg-emerald-500/10" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"}`}>
                      <input type="radio" name="systemRole" value={r.value} checked={formData.role === r.value}
                        onChange={() => setFormData({ ...formData, role: r.value })} className="mt-1 accent-emerald-500 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">{r.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{r.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Capable Roles & specific wages */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-sm font-bold text-white mb-1">
                  Jobs & Specific Fares
                </label>
                <p className="text-xs text-slate-400 mb-4">Select the jobs this person can do, and assign specific wages if they differ from the default base.</p>
                
                {CREW_GROUPS.map(group => (
                  <div key={group} className="mb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">{group}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CREW_ROLES.filter(r => r.group === group).map(r => {
                        const isSelected = formData.capableRoles.includes(r.value);
                        return (
                          <div key={r.value} className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-all ${isSelected ? "border-indigo-500/60 bg-indigo-500/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"}`}>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
                              <input type="checkbox" checked={isSelected}
                                onChange={() => toggleCrewRole(r.value)} className="accent-indigo-500 w-3.5 h-3.5 rounded" />
                              {r.label}
                            </label>
                            
                            {isSelected && (
                              <div className="pl-6 flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-semibold text-slate-500">FARE (₹)</span>
                                <input 
                                  type="number" 
                                  value={formData.roleRates[r.value] || ""} 
                                  onChange={(e) => updateRoleRate(r.value, e.target.value)}
                                  placeholder={formData.baseDailyWage ? String(formData.baseDailyWage) : "0"}
                                  className="w-full max-w-[120px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500" 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  {loading ? "Saving..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
