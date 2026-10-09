"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DispatchActionHeader } from "./DispatchActionHeader";
import { DispatchCalendarView } from "./DispatchCalendarView";
import { DispatchTableLedger } from "./DispatchTableLedger";
import { DispatchGridCards } from "./DispatchGridCards";
import { CreateDispatchModal } from "./CreateDispatchModal";
import { CreateDispatchModalV2 } from "./CreateDispatchModalV2";
import { CrewAllocationBoard } from "./CrewAllocationBoard";

interface DispatchClientProps {
  initialDispatches: any[];
  customers: any[];
  machines: any[];
  employees: any[];
  tools: any[];
  userRole: string;
  basePath: string;
}

export function DispatchBoardClient({
  initialDispatches,
  customers,
  machines,
  employees,
  tools,
  userRole,
  basePath,
}: DispatchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlView = (searchParams.get("view") as "month" | "week" | "day") || "month";
  const urlDateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const currentDate = new Date(urlDateStr);

  const [viewMode, setViewMode] = useState<"TABLE" | "GRID" | "CREW">("TABLE");
  const [showNewModal, setShowNewModal] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [resolvingDispatchId, setResolvingDispatchId] = useState<string | null>(null);

  const initialFormState = {
    customerId: "",
    dateOfService: new Date().toISOString().split("T")[0],
    location: "",
    mapLink: "",
    status: "PENDING",
    operatorId: "",
    driverId: "",
    mainHelperId: "",
    mainHelperName: "",
    helperCount: 0,
    machineId: "",
    mixerCategory: "STANDARD",
    liftFloors: 1,
    vibratorType: "PETROL",
    hasTrollyBench: false,
    publicTransportUsed: false,
    setupPhotoUrls: [] as string[],
    selectedTools: [] as { toolId: string; quantity: number }[],
    siteBundleId: "",
    crewAssignments: [] as string[],
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  const handleNavigate = (newDate: Date) => {
    const dateStr = newDate.toISOString().split("T")[0];
    router.push(`${basePath}?view=${urlView}&date=${dateStr}`);
  };

  const handleViewChange = (newView: string) => {
    router.push(`${basePath}?view=${newView}&date=${urlDateStr}`);
  };

  const handleDrillDown = (date: Date, newView: string) => {
    router.push(`${basePath}?view=${newView}&date=${date.toISOString().split("T")[0]}`);
  };

  const handleGenerateBill = async (id: string) => {
    // Generate bill API call here, omitted for brevity, but kept structure
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/billing/generate-from-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/admin/billing/${data.invoice.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setIsPending(true);
    try {
      await fetch(`/api/admin/dispatch/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      alert("Error updating status");
    } finally {
      setIsPending(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setDispatchError("");
    try {
      const endpoint = formData.id
        ? `/api/admin/dispatch/${formData.id}`
        : "/api/admin/dispatch";
      const method = formData.id ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save dispatch");
      }

      setShowNewModal(false);
      setFormData(initialFormState);
      router.refresh();
    } catch (error: any) {
      setDispatchError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <DispatchActionHeader
        dispatchesCount={initialDispatches.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNewDispatch={() => {
          setFormData(initialFormState);
          setShowNewModal(true);
        }}
      />

      {urlView === "month" && (
        <DispatchCalendarView
          dispatches={initialDispatches}
          urlView={urlView}
          currentDate={currentDate}
          onNavigate={handleNavigate}
          onViewChange={handleViewChange}
          onDrillDown={handleDrillDown}
          onSelectEvent={(resource: any) => {
            setFormData(resource);
            setShowNewModal(true);
          }}
        />
      )}

      {(urlView === "week" || urlView === "day") && (
        viewMode === "CREW" ? (
          <CrewAllocationBoard 
             employees={employees}
             initialDispatches={initialDispatches}
          />
        ) : viewMode === "TABLE" ? (
          <DispatchTableLedger
            dispatches={initialDispatches}
            userRole={userRole}
            isPending={isPending}
            onGenerateBill={handleGenerateBill}
            onStatusChange={handleStatusChange}
            setResolvingDispatchId={setResolvingDispatchId}
          />
        ) : (
          <DispatchGridCards
            dispatches={initialDispatches}
            onGenerateBill={handleGenerateBill}
            isPending={isPending}
          />
        )
      )}

      {showNewModal && (
        <CreateDispatchModalV2
          onClose={() => setShowNewModal(false)}
          machines={machines}
          employees={employees}
          tools={tools}
        />
      )}
    </div>
  );
}
