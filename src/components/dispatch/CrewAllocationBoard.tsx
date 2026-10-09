"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Users,
  Search,
  GripVertical,
  Save,
  Loader2,
  HardHat,
  FileEdit,
  Star,
  Wrench,
  Plus,
  Minus,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StaffFieldDiaryOverrideModal } from "./StaffFieldDiaryOverrideModal";

const AVAILABLE_ROLES = [
  "DRIVER",
  "MIXER_OPERATOR",
  "HYDRAULIC_OPERATOR",
  "VIBRATOR_OPERATOR",
  "LIFT_OPERATOR",
  "WORKER_LEADER",
  "SUB_LEADER",
  "HELPER",
  "PANI_HELPER",
  "TROLLY_1_WHEEL",
  "TROLLY_2_WHEEL",
  "P_VIBRATOR",
];

const DEFAULT_EQUIPMENT_MASTER = [
  { id: "cm-01", name: "Concrete Mixer", variant: "10/7 CFT" },
  { id: "vm-petrol", name: "Vibrator Motor", variant: "PETROL" },
  { id: "vm-electric", name: "Vibrator Motor", variant: "ELECTRIC" },
  { id: "tr-1w", name: "Trolly", variant: "1-WHEEL" },
  { id: "tr-2w", name: "Trolly", variant: "2-WHEEL" },
  { id: "spades", name: "Spades", variant: "STANDARD" },
];

// Draggable Employee Item
const SortableEmployee = ({
  employee,
  dispatchId,
  onToggleLeader,
}: {
  employee: any;
  dispatchId?: string;
  onToggleLeader?: (empId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: employee.id, data: employee });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const isLeader = employee.isLeader;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col p-2 bg-slate-800 border border-slate-700 rounded-xl mb-2 group hover:border-blue-500 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab text-slate-500 hover:text-blue-400 p-1">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold text-white truncate">{employee.name}</h5>
            {dispatchId && onToggleLeader && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLeader(employee.id);
                }}
                className={`p-1 rounded ${isLeader ? "text-yellow-400 bg-yellow-400/10" : "text-slate-500 hover:text-yellow-400"
                  }`}
                title="Designate Crew Leader"
              >
                <Star className={`w-4 h-4 ${isLeader ? "fill-current" : ""}`} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {(employee.capableRoles || [employee.role]).map((r: string) => (
              <span
                key={r}
                className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700"
              >
                {r.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleDropZone = ({
  dispatchId,
  role,
  assignedEmployees,
  onToggleLeader,
}: {
  dispatchId: string;
  role: string;
  assignedEmployees: any[];
  onToggleLeader: (id: string) => void;
}) => {
  const zoneId = `${dispatchId}::${role}`;
  const { setNodeRef } = useSortable({
    id: zoneId,
    data: { isZone: true, dispatchId, role },
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800 border-dashed mb-2 min-h-[60px]"
    >
      <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
        {role.replace(/_/g, " ")}
        <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300 text-[10px]">
          {assignedEmployees.length}
        </span>
      </h6>
      <SortableContext id={zoneId} items={assignedEmployees.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[20px]">
          {assignedEmployees.map((emp) => (
            <SortableEmployee
              key={emp.id}
              employee={emp}
              dispatchId={dispatchId}
              onToggleLeader={onToggleLeader}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export function CrewAllocationBoard({
  employees = [],
  initialDispatches = [],
  availableTools = DEFAULT_EQUIPMENT_MASTER,
}: {
  employees?: any[];
  initialDispatches?: any[];
  availableTools?: any[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal State
  const [activeOverrideDispatch, setActiveOverrideDispatch] = useState<any | null>(null);

  // Initialize pool and dispatch assignments
  const [pool, setPool] = useState<any[]>(() => {
    const assignedIds = new Set();
    initialDispatches.forEach((d) => {
      d.crewAssignments?.forEach((a: any) => assignedIds.add(a.employeeId));
    });
    return employees.filter((e) => !assignedIds.has(e.id));
  });

  const [dispatches, setDispatches] = useState<any[]>(() => {
    return initialDispatches.map((d) => {
      const assignments = d.crewAssignments || [];
      const tools = (d.dispatchTools || []).map((dt: any) => ({
        toolId: dt.toolId || dt.tool?.id || dt.id,
        name: dt.tool?.name || dt.name || "Tool",
        quantity: dt.quantity || 1,
        variant: dt.variant,
      }));

      return {
        ...d,
        crew: assignments.map((a: any) => {
          const emp = employees.find((e) => e.id === a.employeeId) || {
            id: a.employeeId,
            name: "Unknown",
          };
          return {
            ...emp,
            assignedRole: a.assignedRole,
            isLeader: d.siteLeaderEmployeeId === a.employeeId,
          };
        }),
        assignedTools: tools,
      };
    });
  });

  const [activeItem, setActiveItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Role Filtering for Available Pool
  const filteredPool = pool.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.capableRoles || []).some((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      selectedRoleFilter === "ALL" ||
      emp.role === selectedRoleFilter ||
      (emp.capableRoles || []).includes(selectedRoleFilter);

    return matchesSearch && matchesRole;
  });

  const handleDragStart = (event: any) => {
    setActiveItem(event.active.data.current);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    let sourceContainer: string | null = null;
    let sourceRole: string | null = null;

    if (pool.find((p) => p.id === activeId)) {
      sourceContainer = "pool";
    } else {
      dispatches.forEach((d) => {
        const emp = d.crew.find((c: any) => c.id === activeId);
        if (emp) {
          sourceContainer = d.id;
          sourceRole = emp.assignedRole;
        }
      });
    }

    let destContainer: string | null = null;
    let destRole: string | null = null;

    if (overId === "pool" || pool.find((p) => p.id === overId)) {
      destContainer = "pool";
    } else if (String(overId).includes("::")) {
      const [dId, rId] = String(overId).split("::");
      destContainer = dId;
      destRole = rId;
    } else {
      dispatches.forEach((d) => {
        const emp = d.crew.find((c: any) => c.id === overId);
        if (emp) {
          destContainer = d.id;
          destRole = emp.assignedRole;
        }
      });
    }

    if (!sourceContainer || !destContainer) return;
    if (sourceContainer === destContainer && sourceRole === destRole) return;

    let movedItem: any;
    let newPool = [...pool];
    let newDispatches = [...dispatches];

    if (sourceContainer === "pool") {
      movedItem = pool.find((p) => p.id === activeId);
      newPool = newPool.filter((p) => p.id !== activeId);
    } else {
      const dIndex = newDispatches.findIndex((d) => d.id === sourceContainer);
      movedItem = newDispatches[dIndex].crew.find((c: any) => c.id === activeId);
      newDispatches[dIndex].crew = newDispatches[dIndex].crew.filter((c: any) => c.id !== activeId);
      if (movedItem.isLeader) {
        movedItem.isLeader = false;
        newDispatches[dIndex].siteLeaderEmployeeId = null;
      }
    }

    if (destContainer === "pool") {
      delete movedItem.assignedRole;
      newPool.push(movedItem);
    } else {
      const dIndex = newDispatches.findIndex((d) => d.id === destContainer);
      movedItem.assignedRole = destRole;
      newDispatches[dIndex].crew.push(movedItem);
    }

    setPool(newPool);
    setDispatches(newDispatches);
  };

  const handleToggleLeader = (dispatchId: string, employeeId: string) => {
    setDispatches((prev) =>
      prev.map((d) => {
        if (d.id !== dispatchId) return d;
        const isCurrentLeader = d.siteLeaderEmployeeId === employeeId;
        return {
          ...d,
          siteLeaderEmployeeId: isCurrentLeader ? null : employeeId,
          crew: d.crew.map((c: any) => ({
            ...c,
            isLeader: c.id === employeeId ? !isCurrentLeader : false,
          })),
        };
      })
    );
  };

  // Quick Equipment Tool Assignment per site
  const handleUpdateToolQuantity = (dispatchId: string, tool: any, delta: number) => {
    setDispatches((prev) =>
      prev.map((d) => {
        if (d.id !== dispatchId) return d;

        const existingTools = [...(d.assignedTools || [])];
        const matchIdx = existingTools.findIndex((t) => t.toolId === tool.id || t.toolId === tool.toolId);

        if (matchIdx >= 0) {
          const newQty = existingTools[matchIdx].quantity + delta;
          if (newQty <= 0) {
            existingTools.splice(matchIdx, 1);
          } else {
            existingTools[matchIdx].quantity = newQty;
          }
        } else if (delta > 0) {
          existingTools.push({
            toolId: tool.id || tool.toolId,
            name: tool.name,
            variant: tool.variant,
            quantity: delta,
          });
        }

        return { ...d, assignedTools: existingTools };
      })
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const batchPayload = dispatches.map((d) => ({
        dispatchId: d.id,
        siteLeaderEmployeeId: d.siteLeaderEmployeeId || null,
        crewAssignments: d.crew.map((c: any) => {
          const customRate = c.roleRates?.find((r: any) => r.crewRole === c.assignedRole)?.wagePerDay;
          return {
            employeeId: c.id,
            assignedRole: c.assignedRole,
            lockedWageRate: customRate || c.baseDailyWage || 0,
          };
        }),
        dispatchTools: (d.assignedTools || []).map((t: any) => ({
          toolId: t.toolId,
          quantity: t.quantity,
          variant: t.variant || null,
        })),
      }));

      const res = await fetch("/api/staff/dispatch/batch-crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatches: batchPayload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save batch allocation");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to save assignments.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl h-[88vh] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="text-amber-400 w-7 h-7" /> Crew & Equipment Allocation Board
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Strict PUSH Model: Drag personnel to jobsite buckets, assign equipment tools, and override Field Diary 2.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" /> Batch Saved!
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Batch Assignments
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 overflow-hidden">
          {/* Left Column: Staff Pool & Filters */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full overflow-hidden">
            <div className="mb-4 space-y-3 shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Available Pool ({filteredPool.length})
                </h3>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter Role
                </label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSelectedRoleFilter("ALL")}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${selectedRoleFilter === "ALL"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    ALL
                  </button>
                  {AVAILABLE_ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRoleFilter(r)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${selectedRoleFilter === r
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                    >
                      {r.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <SortableContext id="pool" items={filteredPool.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="min-h-[200px]">
                  {filteredPool.map((emp) => (
                    <SortableEmployee key={emp.id} employee={emp} />
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>

          {/* Right Column: Dispatch Jobsite Buckets */}
          <div className="lg:col-span-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dispatches.map((dispatch) => (
                <div
                  key={dispatch.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        {dispatch.customer?.name || "Unknown Customer"}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <HardHat className="w-3.5 h-3.5 text-blue-400" />
                        {dispatch.location}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="bg-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 border border-slate-800">
                        {dispatch.crew.length} Assigned
                      </div>
                      <button
                        onClick={() => setActiveOverrideDispatch(dispatch)}
                        className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-colors"
                      >
                        <FileEdit className="w-3.5 h-3.5" /> Staff Override Diary 2
                      </button>
                    </div>
                  </div>

                  {/* Dispatched Crew Drop Zones */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_ROLES.map((role) => (
                      <RoleDropZone
                        key={role}
                        dispatchId={dispatch.id}
                        role={role}
                        assignedEmployees={dispatch.crew.filter((c: any) => c.assignedRole === role)}
                        onToggleLeader={(empId) => handleToggleLeader(dispatch.id, empId)}
                      />
                    ))}
                  </div>

                  {/* Quick Equipment & Tools Assignment per Site */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Dispatched Equipment & Tools
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {availableTools.map((tool) => {
                        const assigned = (dispatch.assignedTools || []).find(
                          (t: any) => t.toolId === tool.id || t.toolId === tool.toolId
                        );
                        const qty = assigned?.quantity || 0;

                        return (
                          <div
                            key={tool.id || tool.toolId}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-white truncate">{tool.name}</p>
                              {tool.variant && (
                                <span className="text-[9px] text-slate-400 block">{tool.variant}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateToolQuantity(dispatch.id, tool, -1)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                                disabled={qty <= 0}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold px-1.5 text-amber-300">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateToolQuantity(dispatch.id, tool, 1)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="p-3 bg-blue-900/90 border border-blue-500 rounded-xl shadow-2xl rotate-2 opacity-90 w-64">
              <h5 className="text-sm font-bold text-white">{activeItem.name}</h5>
              <div className="flex gap-1 mt-1">
                {(activeItem.capableRoles || [activeItem.role]).map((r: string) => (
                  <span key={r} className="text-[9px] bg-slate-900 px-1 py-0.5 rounded text-slate-300">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Staff Override Modal */}
      {activeOverrideDispatch && (
        <StaffFieldDiaryOverrideModal
          isOpen={!!activeOverrideDispatch}
          onClose={() => setActiveOverrideDispatch(null)}
          dispatch={activeOverrideDispatch}
          onSaved={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
