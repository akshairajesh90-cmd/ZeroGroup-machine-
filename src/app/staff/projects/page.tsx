import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { FolderKanban, MapPin, Calendar, HardHat, Truck, Wrench, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  // Fetch all projects and their dispatches, including operator, driver, shiftLogs (with vehicle), and tools
  const projects = await prisma.project.findMany({
    include: {
      dispatches: {
        include: {
          operator: true,
          driver: {
            include: {
              shiftLogs: {
                include: {
                  vehicle: true
                }
              }
            }
          },
          dispatchTools: {
            include: {
              tool: true
            }
          }
        },
        orderBy: { dateOfService: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <FolderKanban className="h-5 w-5" />
            </div>
            Projects & Active Sites
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Track long-term construction projects, deployments, and site logistics.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500 max-w-xl mx-auto shadow-xl">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
          <h2 className="text-lg font-bold text-white mb-2">No Projects Found</h2>
          <p className="text-sm">Seeded data doesn't contain any projects. Try running the database seeder again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl hover:border-zinc-700/50 transition-all flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/60">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{project.name}</h2>
                    <span className="flex items-center gap-1 text-zinc-400 text-xs mt-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      {project.location}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    project.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                  }`}>
                    {project.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 text-xs font-medium text-zinc-500">
                  <Calendar className="h-4 w-4" />
                  <span>Started: {new Date(project.startDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}</span>
                  {project.endDate && (
                    <span> - Ended: {new Date(project.endDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}</span>
                  )}
                </div>
              </div>

              {/* Card Content - Deployed Dispatches */}
              <div className="p-6 space-y-4 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Active Site Deployments ({project.dispatches.length})
                </h3>

                {project.dispatches.length === 0 ? (
                  <p className="text-zinc-600 text-sm italic">No dispatches currently assigned to this project.</p>
                ) : (
                  <div className="space-y-4">
                    {project.dispatches.map((dispatch) => {
                      // Find active vehicle via driver shift logs matching the service date
                      const serviceDateStr = new Date(dispatch.dateOfService).toDateString();
                      const shiftLog = dispatch.driver?.shiftLogs?.find(
                        (log) => new Date(log.date).toDateString() === serviceDateStr
                      );
                      const vehicleInfo = shiftLog?.vehicle
                        ? `${shiftLog.vehicle.licensePlate} (${shiftLog.vehicle.type})`
                        : "No Vehicle Assigned";

                      return (
                        <div
                          key={dispatch.id}
                          className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-850/80 space-y-3"
                        >
                          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                            <span className="text-xs font-bold text-white">
                              {new Date(dispatch.dateOfService).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                	month: "short",
                                	year: "numeric"
                              })}
                            </span>
                            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {dispatch.status}
                            </span>
                          </div>

                          {/* Operator */}
                          <div className="flex items-center gap-3 text-xs">
                            <HardHat className="h-4 w-4 text-violet-400 shrink-0" />
                            <div>
                              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">Assigned Operator</span>
                              <span className="text-zinc-300 font-medium">
                                {dispatch.operator?.name || "No Operator Assigned"}
                              </span>
                            </div>
                          </div>

                          {/* Vehicle / Driver */}
                          <div className="flex items-center gap-3 text-xs">
                            <Truck className="h-4 w-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">Vehicle & Driver</span>
                              <span className="text-zinc-300 font-medium">
                                {vehicleInfo}
                                {dispatch.driver && <span className="text-zinc-500 text-[10px] block font-mono">Driver: {dispatch.driver.name}</span>}
                              </span>
                            </div>
                          </div>

                          {/* Tools */}
                          <div className="flex items-center gap-3 text-xs">
                            <Wrench className="h-4 w-4 text-rose-400 shrink-0" />
                            <div>
                              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">Deployed Tools</span>
                              <span className="text-zinc-300 font-medium">
                                {dispatch.dispatchTools.length > 0
                                  ? dispatch.dispatchTools.map((dt) => `${dt.tool.name} (x${dt.quantity})`).join(", ")
                                  : "No tools deployed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
