import React from "react";
import { prisma } from "@/lib/prisma";
import { FileText, ShieldAlert, Calendar, CheckCircle2, User, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  // Fetch Vehicle Documents
  const vehicleDocs = await prisma.vehicleDocument.findMany({
    include: { vehicle: true },
    orderBy: { expiryDate: "asc" }
  });

  // Fetch Employee Documents
  const employeeDocs = await prisma.employeeDocument.findMany({
    include: { employee: true },
    orderBy: { expiryDate: "asc" }
  });

  const today = new Date();

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            Compliance & Documents
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Track permits, licenses, and insurance for all assets and personnel.</p>
        </div>
      </div>

      {/* Grid for Vehicles & Employees */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Vehicle Documents Table */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
          <div className="border-b border-zinc-800 px-6 py-4 bg-zinc-900/60 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-400" /> Vehicle Documents
            </h2>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-700/50 font-mono">
              {vehicleDocs.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-950/60 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-800/60">
                <tr>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Doc Type</th>
                  <th className="px-6 py-4">Doc Number</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {vehicleDocs.map((doc) => {
                  const isExpired = new Date(doc.expiryDate) < today;
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-white block">
                          {doc.vehicle.licensePlate}
                        </span>
                        <span className="text-xs text-zinc-500 block">
                          {doc.vehicle.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-300">
                        {doc.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-400">
                        {doc.documentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                        {new Date(doc.issueDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-bold ${isExpired ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {new Date(doc.expiryDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                            <ShieldAlert className="h-3 w-3" /> EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> ACTIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {vehicleDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No vehicle documents recorded in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee Documents Table */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
          <div className="border-b border-zinc-800 px-6 py-4 bg-zinc-900/60 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <User className="h-4 w-4 text-violet-400" /> Employee Documents
            </h2>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-700/50 font-mono">
              {employeeDocs.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-950/60 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-800/60">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Doc Type</th>
                  <th className="px-6 py-4">Doc Number</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {employeeDocs.map((doc) => {
                  const isExpired = new Date(doc.expiryDate) < today;
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-white block">
                          {doc.employee.name}
                        </span>
                        <span className="text-xs text-zinc-500 block font-mono">
                          Role: {doc.employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-300">
                        {doc.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-400">
                        {doc.documentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                        {new Date(doc.issueDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-bold ${isExpired ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {new Date(doc.expiryDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                            <ShieldAlert className="h-3 w-3" /> EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> ACTIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {employeeDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No employee documents recorded in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
