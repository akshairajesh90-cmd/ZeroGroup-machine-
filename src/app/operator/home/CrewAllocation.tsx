"use client";

import { useState, useEffect, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Users, X, GripVertical, Check } from "lucide-react";
import { getAvailableCrew, assignCrewToDispatch, removeCrewFromDispatch } from "@/actions/allocation";
import Avatar from "@/components/shared/Avatar";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CrewMember {
  id: string;
  name: string;
  role: string;
  profilePhotoUrl?: string | null;
  baseDailyWage?: any;
}

// ─── Draggable Worker Card ─────────────────────────────────────────────────────
function DraggableWorkerCard({ member, isDragging }: { member: CrewMember; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: member.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : { opacity: isDragging ? 0.3 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-3 cursor-grab active:cursor-grabbing select-none touch-none transition-colors"
    >
      <GripVertical className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
      <Avatar name={member.name} photoUrl={member.profilePhotoUrl} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{member.name}</p>
        {member.baseDailyWage && (
          <p className="text-[10px] text-zinc-500 font-medium">₹{Number(member.baseDailyWage).toLocaleString()}/day</p>
        )}
      </div>
    </div>
  );
}

// ─── Static card (for overlay & assigned list) ─────────────────────────────────
function WorkerCard({ member }: { member: CrewMember }) {
  return (
    <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl p-3 select-none">
      <Avatar name={member.name} photoUrl={member.profilePhotoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{member.name}</p>
        {member.baseDailyWage && (
          <p className="text-[10px] text-zinc-500 font-medium">₹{Number(member.baseDailyWage).toLocaleString()}/day</p>
        )}
      </div>
    </div>
  );
}

// ─── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ id, children, count }: { id: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-xl border-2 border-dashed p-3 transition-all duration-200 ${
        isOver
          ? "border-blue-500 bg-blue-500/10"
          : count > 0
          ? "border-emerald-700/50 bg-emerald-900/10"
          : "border-zinc-700 bg-zinc-800/30"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function CrewAllocation({ dispatchId }: { dispatchId: string }) {
  const [allWorkers, setAllWorkers] = useState<CrewMember[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Available = all workers minus those already in the register
  const availableWorkers = allWorkers.filter(
    (w) => !assignedMembers.find((a) => a.id === w.id)
  );

  const activeMember = allWorkers.find((w) => w.id === activeId) ?? null;

  // Sensors — supports both mouse and touch (mobile)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    getAvailableCrew(dispatchId).then((res) => {
      if (res && res.success && res.crew) {
        setAllWorkers(res.crew as CrewMember[]);
        if (res.assignedIds && res.assignedIds.length > 0) {
          const assigned = res.crew.filter((c) =>
            res.assignedIds!.includes(c.id)
          ) as CrewMember[];
          setAssignedMembers(assigned);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dispatchId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // Dropped into the register zone
    if (over.id === "register-drop-zone") {
      const worker = allWorkers.find((w) => w.id === active.id);
      if (worker && !assignedMembers.find((a) => a.id === worker.id)) {
        const newAssigned = [...assignedMembers, worker];
        setAssignedMembers(newAssigned);
        setSaved(false);

        // Immediately persist to DB
        startTransition(async () => {
          const res = await assignCrewToDispatch(dispatchId, [worker.id]);
          if (!res.success) {
            setError(res.error ?? "Failed to assign");
            // Rollback
            setAssignedMembers(assignedMembers);
          }
        });
      }
    }
  }

  const handleRemove = (memberId: string) => {
    const prev = [...assignedMembers];
    setAssignedMembers(assignedMembers.filter((m) => m.id !== memberId));
    setSaved(false);

    startTransition(async () => {
      const res = await removeCrewFromDispatch(dispatchId, memberId);
      if (!res.success) {
        setError(res.error ?? "Failed to remove");
        setAssignedMembers(prev); // rollback
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-500 animate-pulse" />
          <span className="text-sm font-black text-zinc-400 uppercase tracking-widest">Loading workers…</span>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Daily Register</h2>
        </div>
        <p className="text-[11px] text-zinc-500 font-medium mb-5">
          Drag workers from the list below into today's register to mark their attendance.
        </p>

        {error && (
          <p className="text-xs font-bold text-red-400 mb-3 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* ── Today's Active Register (Drop Zone) ─────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
              Today's Register
            </p>
            {assignedMembers.length > 0 && (
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
                {assignedMembers.length} worker{assignedMembers.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <DropZone id="register-drop-zone" count={assignedMembers.length}>
            {assignedMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 gap-1">
                <p className="text-xs font-bold text-zinc-600">Drop workers here</p>
                <p className="text-[10px] text-zinc-700">Drag a card from below ↓</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-2.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <Avatar name={member.name} photoUrl={member.profilePhotoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{member.name}</p>
                        {member.baseDailyWage && (
                          <p className="text-[10px] text-emerald-500/80 font-medium">
                            ₹{Number(member.baseDailyWage).toLocaleString()}/day — Marked Present
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={isPending}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-700 flex items-center justify-center transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DropZone>
        </div>

        {/* ── Available Workers Pool ───────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">
            Available Workers
          </p>
          {availableWorkers.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4 font-medium">
              {allWorkers.length === 0 ? "No company workers found." : "All workers are on today's register. ✓"}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {availableWorkers.map((member) => (
                <DraggableWorkerCard
                  key={member.id}
                  member={member}
                  isDragging={activeId === member.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay — what follows the cursor */}
      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeMember && (
          <div className="rotate-2 scale-105 shadow-2xl opacity-95">
            <WorkerCard member={activeMember} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
