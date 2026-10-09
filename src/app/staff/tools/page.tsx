import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { Wrench, Plus, Archive, Settings2, PackageCheck, Truck, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ToolsInventoryPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  // Fetch tools along with their dispatch tool entries where the dispatch is active
  // Active statuses: ACCEPTED, EN_ROUTE, IN_PROGRESS, DELIVERED
  const tools = await prisma.tool.findMany({
    orderBy: { name: "asc" },
    include: {
      dispatchTools: {
        where: {
          dispatch: {
            status: { in: ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED"] }
          }
        }
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            Tools & Inventory
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Manage small assets, shovels, baskets, and track their active site deployments.</p>
        </div>
      </div>

      {/* Asset Registry Table */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
        <div className="border-b border-zinc-800 px-6 py-4 bg-zinc-900/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-rose-400" />
            Asset Registry
          </h3>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-700/50 font-mono">
            {tools.length} Items
          </span>
        </div>

        {tools.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Archive className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-300">No Inventory Found</h3>
            <p className="text-sm mt-1">Start adding tools to the database to track inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-950/60 text-xs font-bold text-zinc-500 uppercase border-b border-zinc-800/60">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Total Owned</th>
                  <th className="px-6 py-4">Deployed On-Site</th>
                  <th className="px-6 py-4">Available in Yard</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {tools.map((tool) => {
                  const deployedCount = tool.dispatchTools.reduce((acc, dt) => acc + dt.quantity, 0);
                  const availableCount = Math.max(0, tool.totalInventory - deployedCount);
                  
                  return (
                    <tr key={tool.id} className="hover:bg-zinc-800/20 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-white">{tool.name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{tool.toolId}</div>
                      </td>
                      
                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-300">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded uppercase font-bold tracking-wider border border-zinc-750">
                          {tool.toolType || "GENERAL"}
                        </span>
                      </td>
                      
                      {/* Total Owned */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-white font-mono">
                        {tool.totalInventory} Units
                      </td>
                      
                      {/* Deployed On-Site */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {deployedCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-rose-400 font-bold font-mono">
                            <Truck className="h-3.5 w-3.5" />
                            {deployedCount} Deployed
                          </div>
                        ) : (
                          <span className="text-zinc-600 font-medium">0 Deployed</span>
                        )}
                      </td>
                      
                      {/* Available in Yard */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-400 font-mono">
                        {availableCount} Available
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {availableCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                            Out of Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
