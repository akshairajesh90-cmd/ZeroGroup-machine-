"use client";
/**
 * Page 1: Dispatch Board — Interactive OCC Kanban
 * Drag-and-drop powered by @dnd-kit.
 * Each card carries its `version` field; status moves are OCC-guarded.
 */

import { useEffect, useState, useTransition } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { updateDispatchStatus, ALLOWED_TRANSITIONS } from "@/actions/dispatch-actions";
import { DispatchStatus } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

type CardData = {
    id: string;
    status: DispatchStatus;
    version: number;
    location: string;
    dateOfService: Date;
    workType: string;
    customer: { name: string } | null;
    machine: { machineId: string; type: string } | null;
    operator: { name: string } | null;
    driver: { name: string } | null;
    notes: string | null;
};

const COLUMNS: DispatchStatus[] = [
    DispatchStatus.PENDING,
    DispatchStatus.IN_PROGRESS,
    DispatchStatus.COMPLETED,
    DispatchStatus.CANCELLED,
];

const COLUMN_LABELS: Partial<Record<DispatchStatus, string>> = {
    PENDING: "🕐 Pending",
    IN_PROGRESS: "⚡ In Progress",
    COMPLETED: "✅ Completed",
    CANCELLED: "❌ Cancelled",
};

const COLUMN_COLORS: Partial<Record<DispatchStatus, string>> = {
    PENDING: "border-yellow-600 bg-yellow-900/10",
    IN_PROGRESS: "border-blue-500 bg-blue-900/10",
    COMPLETED: "border-green-500 bg-green-900/10",
    CANCELLED: "border-red-600 bg-red-900/10",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function DispatchCard({ card, isDragging }: { card: CardData; isDragging?: boolean }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: card.id,
        data: { card },
    });
    const style = transform
        ? { transform: `translate(${transform.x}px,${transform.y}px)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`rounded-xl border border-slate-700 bg-slate-800 p-3 shadow cursor-grab active:cursor-grabbing select-none transition-opacity ${isDragging ? "opacity-40" : "hover:border-amber-500"
                }`}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-amber-400 truncate">
                    {card.machine?.machineId ?? "—"}
                </span>
                <span className="text-xs text-slate-500">v{card.version}</span>
            </div>
            <p className="font-semibold text-sm text-slate-100 truncate">
                {card.customer?.name ?? "Unknown Customer"}
            </p>
            <p className="text-xs text-slate-400 truncate">{card.location}</p>
            <div className="mt-2 flex flex-wrap gap-1">
                {card.operator && (
                    <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded-full">
                        Op: {card.operator.name}
                    </span>
                )}
                {card.driver && (
                    <span className="text-[10px] bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded-full">
                        Drv: {card.driver.name}
                    </span>
                )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
                {new Date(card.dateOfService).toLocaleDateString("en-IN")}
            </p>
        </div>
    );
}

function KanbanColumn({
    status,
    cards,
    activeId,
}: {
    status: DispatchStatus;
    cards: CardData[];
    activeId: string | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col rounded-2xl border-2 p-3 gap-3 min-h-[300px] transition-colors ${COLUMN_COLORS[status]
                } ${isOver ? "ring-2 ring-amber-400" : ""}`}
        >
            <h3 className="font-bold text-sm tracking-wide text-slate-300 px-1">
                {COLUMN_LABELS[status]}{" "}
                <span className="text-slate-500 font-normal">({cards.length})</span>
            </h3>
            <div className="flex flex-col gap-2">
                {cards.map((c) => (
                    <DispatchCard key={c.id} card={c} isDragging={c.id === activeId} />
                ))}
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DispatchBoardPage() {
    const [cards, setCards] = useState<CardData[]>([]);
    const [activeCard, setActiveCard] = useState<CardData | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        fetch("/api/dispatch-board")
            .then((r) => r.json())
            .then((d) => setCards(d.dispatches ?? []))
            .catch(() => setToast({ msg: "Failed to load board", ok: false }));
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    function showToast(msg: string, ok: boolean) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }

    function handleDragStart(event: DragStartEvent) {
        const card = (event.active.data.current as { card: CardData }).card;
        setActiveCard(card);
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveCard(null);
        const over = event.over;
        if (!over) return;

        const card = (event.active.data.current as { card: CardData }).card;
        const newStatus = over.id as DispatchStatus;

        if (card.status === newStatus) return;

        const allowed = ALLOWED_TRANSITIONS[card.status] ?? [];
        if (!allowed.includes(newStatus)) {
            showToast(`Cannot move from ${card.status} → ${newStatus}`, false);
            return;
        }

        // Optimistic UI update
        setCards((prev) =>
            prev.map((c) =>
                c.id === card.id ? { ...c, status: newStatus, version: c.version + 1 } : c
            )
        );

        startTransition(async () => {
            const result = await updateDispatchStatus({
                dispatchId: card.id,
                newStatus,
                knownVersion: card.version,
                actorEmployeeId: "system", // replace with real session employee id
                reason: "Kanban drag-and-drop",
            });

            if (!result.success) {
                // Rollback
                setCards((prev) =>
                    prev.map((c) =>
                        c.id === card.id ? { ...c, status: card.status, version: card.version } : c
                    )
                );
                showToast(
                    result.conflict
                        ? "⚠ Conflict: Someone else moved this card. Refreshing…"
                        : result.error ?? "Error",
                    false
                );
                if (result.conflict) {
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else {
                showToast(`Moved to ${newStatus}`, true);
            }
        });
    }

    const byStatus = (s: DispatchStatus) => cards.filter((c) => c.status === s);

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-amber-400">Dispatch Board</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Drag cards between columns · OCC version-lock active
                    </p>
                </div>
                {isPending && (
                    <span className="text-xs text-amber-300 animate-pulse">Saving…</span>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg shadow-xl text-sm font-medium transition-all ${toast.ok
                        ? "bg-green-700 text-white"
                        : "bg-red-700 text-white"
                        }`}
                >
                    {toast.msg}
                </div>
            )}

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-4 gap-4">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col}
                            status={col}
                            cards={byStatus(col)}
                            activeId={activeCard?.id ?? null}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeCard ? (
                        <div className="rotate-2 opacity-90">
                            <DispatchCard card={activeCard} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
