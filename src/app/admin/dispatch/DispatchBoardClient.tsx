"use client";

import React, { useState, useTransition } from "react";
import { 
  createDailyDispatch, 
  updateDispatchStatus, 
  resolveDispatchConflict, 
  finalizeDispatchScope,
  createQuickCustomer
} from "@/actions/dispatch";
// import { generateBillFromBooking } from "@/actions/billing";

import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { startOfMonth, endOfMonth, endOfWeek, startOfDay, endOfDay, parseISO, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { useEffect } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { fetchDispatchesByRange, updateDailyDispatch } from "@/actions/dispatch";

import { 
  Truck, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Wrench, 
  ShieldAlert,
  Loader2,
  X,
  Users,
  FileText,
  Table,
  LayoutGrid,
  Phone,
  Navigation,
  DollarSign,
  UserPlus,
  AlertCircle,
  Layers,
  HardHat,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface DispatchClientProps {
  initialDispatches: any[];
  customers: any[];
  machines: any[];
  employees: any[];
  tools: any[];
  userRole: string;
}

export default function DispatchBoardClient({
  initialDispatches,
  customers: initialCustomers,
  machines,
  employees,
  tools,
  userRole,
}: DispatchClientProps) {
  const router = useRouter();
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [customersList, setCustomersList] = useState(initialCustomers);
  const [isPending, startTransition] = useTransition();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");

  const searchParams = useSearchParams();
  const urlView = (searchParams.get("view") || "month") as "month" | "week" | "day";
  const urlDateStr = searchParams.get("date");
  const currentDate = urlDateStr ? parseISO(urlDateStr) : new Date();
  const [editingDispatch, setEditingDispatch] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { "en-US": enUS },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state for creating dispatch
  const [workCategory, setWorkCategory] = useState<"MACHINE" | "INDEPENDENT">("MACHINE");
  const [activeModes, setActiveModes] = useState<string[]>(["LIFT"]);
  const [showSetupTools, setShowSetupTools] = useState<boolean>(false);
  const toggleMode = (mode: string) => {
    let newModes: string[];
    if (activeModes.includes(mode)) {
      newModes = activeModes.filter(m => m !== mode);
    } else {
      newModes = [...activeModes, mode];
    }
    setActiveModes(newModes);

    // Enforce Rule: "lift cant be given without operator | machine can be reduced upto 0 mean they need machine not operator | dual-operation allowed"
    const hasLift = newModes.includes("LIFT");
    const hasMixer = newModes.includes("MIXER");

    if (hasLift) {
      // Lift requires at least 1 operator (`or 2 if mixer also selected unless dual-operated`)
      if (operatorCountNeeded < 1) {
        const targetCount = hasMixer ? 2 : 1;
        setOperatorCountNeeded(targetCount);
        if (operatorSlots.length < targetCount) {
          setOperatorSlots([...operatorSlots, ...Array(targetCount - operatorSlots.length).fill("")]);
        }
      }
    } else if (hasMixer || newModes.some(m => ["VIBRATOR", "TROLLY"].includes(m))) {
      // If no Lift, Machine/Vibrator/Trolly can be reduced down to 0!
      // If currently 0 and newly clicking Mixer, initialize to 1 for convenience, but can be reduced to 0 anytime.
      if (operatorCountNeeded === 0 && mode === "MIXER" && !activeModes.includes("MIXER")) {
        setOperatorCountNeeded(1);
        if (operatorSlots.length < 1) {
          setOperatorSlots([...operatorSlots, ""]);
        }
      }
    } else {
      setOperatorCountNeeded(0);
      setOperatorSlots([]);
    }
  };
  const [siteBundleId, setSiteBundleId] = useState("");
  const [customerId, setCustomerId] = useState(customersList[0]?.id || "");
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>(machines[0]?.id ? [machines[0].id] : []);
  
  // V15.0 Equipment specifics
  const [liftFloors, setLiftFloors] = useState<number>(1);
  const [mixerCategory, setMixerCategory] = useState<"STANDARD" | "HYDRAULIC">("STANDARD");
  const [vibratorType, setVibratorType] = useState<"PETROL" | "ELECTRIC" | "NONE">("NONE");
  const [hasTrollyBench, setHasTrollyBench] = useState<boolean>(false);
  const [trollyWorkerCount, setTrollyWorkerCount] = useState<number>(0);

  // Labor Crew (Mestri / Main Helper + Helper Count)
  const driversOnly = employees.filter(e => e.role === "DRIVER" || e.role === "OWNER" || e.role === "STAFF");
  const operatorsOnly = employees.filter(e => e.role === "OPERATOR");
  const workersOnly = employees.filter(e => e.role === "WORKER");

  const [driverId, setDriverId] = useState(driversOnly[0]?.id || "");
  const [publicTransportUsed, setPublicTransportUsed] = useState<boolean>(false);
  const [operatorId, setOperatorId] = useState("");
  
  // Structured Leader Allocation (`Multiple leaders each bringing X helpers -> Total helpers + skill & rate customization`)
  const [leaderAllocations, setLeaderAllocations] = useState<{ id: string; leaderId: string; leaderName: string; helperCount: number; skillCategory?: string; dailyWage?: string | number }[]>([
    { id: "1", leaderId: "", leaderName: "", helperCount: 0, skillCategory: "General Pani Crew", dailyWage: "" }
  ]);
  
  // Structured Operator Allocation (`Default 0 needed for Machine/Vibrator Petrol unless requested`)
  const [operatorCountNeeded, setOperatorCountNeeded] = useState<number>(0);
  const [operatorSlots, setOperatorSlots] = useState<string[]>([]);
  const [customOperators, setCustomOperators] = useState<{ [slotIdx: number]: { name: string; phone?: string; wage?: string | number } }>({});

  // Custom / External Driver details when driverId === "CUSTOM"
  const [customDriverDetails, setCustomDriverDetails] = useState<{ name: string; phone: string; vehicleNo: string }>({ name: "", phone: "", vehicleNo: "" });

  // Custom / External Machines and Equipment items added on the fly
  const [customMachines, setCustomMachines] = useState<{ id: string; name: string; qty: number; rate?: string | number }[]>([]);

  // Custom / External Setup Tools added on the fly
  const [customToolsList, setCustomToolsList] = useState<{ id: string; name: string; malayalamName?: string; qty: number }[]>([]);

  // Main helper / Caller model (legacy / fallback)
  const [mainHelperId, setMainHelperId] = useState<string>("");
  const [mainHelperName, setMainHelperName] = useState<string>("");
  const [helperCount, setHelperCount] = useState<number>(0);
  const [multiOperatorIds, setMultiOperatorIds] = useState<string[]>([]);
  const [multiWorkerIds, setMultiWorkerIds] = useState<string[]>([]);
  
  const [location, setLocation] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [dateOfService, setDateOfService] = useState(new Date().toISOString().split("T")[0]);
  const [workType, setWorkType] = useState("NORMAL");
  const [toolQuantities, setToolQuantities] = useState<Record<string, number>>({});
  const [twoWheelTrollyQty, setTwoWheelTrollyQty] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // New Customer quick modal state
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  // Post-work scope discovery modal state
  const [finalizingDispatch, setFinalizingDispatch] = useState<any | null>(null);
  const [finalWorkType, setFinalWorkType] = useState("NORMAL");
  const [closingNotes, setClosingNotes] = useState("");
  const [adjustedOperatorRate, setAdjustedOperatorRate] = useState<number | string>("");
  const [adjustedCustomerCharge, setAdjustedCustomerCharge] = useState<number | string>("");

  // Resolve conflict state
  const [resolvingDispatchId, setResolvingDispatchId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const handleToolQuantityChange = (tId: string, qty: number) => {
    if (qty <= 0) {
      const next = { ...toolQuantities };
      delete next[tId];
      setToolQuantities(next);
    } else {
      setToolQuantities({ ...toolQuantities, [tId]: qty });
    }
  };

  const handleToolQtyChange = (tId: string, delta: number) => {
    const current = toolQuantities[tId] || 0;
    handleToolQuantityChange(tId, current + delta);
  };

  const handleAddLeaderRow = () => {
    setLeaderAllocations([
      ...leaderAllocations,
      { id: Date.now().toString(), leaderId: "", leaderName: "", helperCount: 0, skillCategory: "General Pani Crew", dailyWage: "" }
    ]);
  };

  const handleRemoveLeaderRow = (index: number) => {
    setLeaderAllocations(leaderAllocations.filter((_, i) => i !== index));
  };

  const handleLeaderRowChange = (index: number, field: string, value: any) => {
    const next = [...leaderAllocations];
    next[index] = { ...next[index], [field]: value };
    if (field === "leaderId" && value) {
      next[index].leaderName = "";
    }
    setLeaderAllocations(next);
  };

  // Custom Machine Manipulation
  const handleAddCustomMachine = () => {
    setCustomMachines([
      ...customMachines,
      { id: `custom_m_${Date.now()}`, name: "", qty: 1, rate: "" }
    ]);
  };

  const handleRemoveCustomMachine = (id: string) => {
    setCustomMachines(customMachines.filter(m => m.id !== id));
  };

  const handleCustomMachineChange = (id: string, field: string, value: any) => {
    setCustomMachines(customMachines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Custom Setup Tool Manipulation
  const handleAddCustomTool = () => {
    setCustomToolsList([
      ...customToolsList,
      { id: `custom_t_${Date.now()}`, name: "", malayalamName: "", qty: 1 }
    ]);
  };

  const handleRemoveCustomTool = (id: string) => {
    setCustomToolsList(customToolsList.filter(t => t.id !== id));
  };

  const handleCustomToolChange = (id: string, field: string, value: any) => {
    setCustomToolsList(customToolsList.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleCustomToolQtyDelta = (id: string, delta: number) => {
    setCustomToolsList(customToolsList.map(t => {
      if (t.id === id) {
        return { ...t, qty: Math.max(0, t.qty + delta) };
      }
      return t;
    }));
  };

  const handleToggleMachine = (id: string) => {
    if (selectedMachineIds.includes(id)) {
      setSelectedMachineIds(selectedMachineIds.filter(x => x !== id));
    } else {
      setSelectedMachineIds([...selectedMachineIds, id]);
    }
  };

  const handleToggleMultiOperator = (id: string) => {
    if (multiOperatorIds.includes(id)) {
      setMultiOperatorIds(multiOperatorIds.filter(x => x !== id));
    } else {
      setMultiOperatorIds([...multiOperatorIds, id]);
    }
  };

  const handleToggleMultiWorker = (id: string) => {
    if (multiWorkerIds.includes(id)) {
      setMultiWorkerIds(multiWorkerIds.filter(x => x !== id));
    } else {
      setMultiWorkerIds([...multiWorkerIds, id]);
    }
  };

  // Quick Customer Creation
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createQuickCustomer({
        name: newCustName,
        phone: newCustPhone,
        address: newCustAddress,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to add customer.");
      } else if (res.customer) {
        setSuccessMsg(`Customer "${res.customer.name}" added!`);
        setCustomersList([...customersList, res.customer]);
        setCustomerId(res.customer.id);
        setShowNewCustomerModal(false);
        setNewCustName("");
        setNewCustPhone("");
        setNewCustAddress("");
      }
    });
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const isMachineRental = workCategory === "MACHINE";
    const chosenMachineIds = isMachineRental ? selectedMachineIds : [];

    const toolItems = Object.entries(toolQuantities).map(([toolId, quantity]) => ({
      toolId,
      quantity,
    }));

    // Process Structured Leader Allocations
    let finalHelperCount = Number(helperCount || 0);
    let finalMainLeaderId = mainHelperId || undefined;
    let finalMainLeaderName = mainHelperName || undefined;
    let finalMultiWorkerIds = [...multiWorkerIds];
    let breakdownNotes: string[] = [];

    if (twoWheelTrollyQty > 0) {
      const trollyTool = tools.find(t => t.name.toLowerCase().includes("2-wheel") || t.name.toLowerCase().includes("trolly") || t.toolId.toLowerCase().includes("trolly"));
      if (trollyTool) {
        toolItems.push({ toolId: trollyTool.id, quantity: twoWheelTrollyQty });
      } else {
        breakdownNotes.push(`Setup Tools: ${twoWheelTrollyQty}x 2-Wheel Trolly / Cart`);
      }
    }

    const activeLeaders = leaderAllocations.filter(l => l.helperCount > 0 || l.leaderId || l.leaderName);
    if (activeLeaders.length > 0) {
      finalHelperCount = activeLeaders.reduce((sum, l) => sum + Number(l.helperCount || 0), 0);
      const first = activeLeaders[0];
      if (first.leaderId) {
        finalMainLeaderId = first.leaderId;
        const emp = employees.find(x => x.id === first.leaderId);
        finalMainLeaderName = emp ? `${emp.name} (${first.helperCount} helpers)` : `${first.leaderName} (${first.helperCount} helpers)`;
      } else if (first.leaderName) {
        finalMainLeaderName = `${first.leaderName} (${first.helperCount} helpers)`;
      }
      activeLeaders.forEach((l, i) => {
        const name = l.leaderId ? (employees.find(x => x.id === l.leaderId)?.name || "Leader") : (l.leaderName || "Leader");
        const skillInfo = l.skillCategory && l.skillCategory !== "General Pani Crew" ? ` [${l.skillCategory}]` : "";
        const wageInfo = l.dailyWage ? ` (@ ₹${l.dailyWage}/helper)` : "";
        breakdownNotes.push(`${name}${skillInfo}: ${l.helperCount} helpers${wageInfo}`);
        if (i > 0 && l.leaderId && !finalMultiWorkerIds.includes(l.leaderId)) {
          finalMultiWorkerIds.push(l.leaderId);
        }
      });
    } else if (mainHelperId) {
      const empRow = employees.find(x => x.id === mainHelperId);
      if (empRow) finalMainLeaderName = empRow.name;
    }

    // Process Custom Machines & Setup Tools
    customMachines.filter(m => m.name.trim() && m.qty > 0).forEach(m => {
      breakdownNotes.push(`Custom Machine: ${m.qty}x ${m.name}${m.rate ? ` (@ ₹${m.rate})` : ""}`);
    });

    customToolsList.filter(t => t.name.trim() && t.qty > 0).forEach(t => {
      breakdownNotes.push(`Custom Tool: ${t.qty}x ${t.name}${t.malayalamName ? ` (${t.malayalamName})` : ""}`);
    });

    // Process Structured Operator Slots (`0 for no operator needed by default`)
    let finalOperatorId = operatorId || undefined;
    let finalMultiOpIds = [...multiOperatorIds];

    if (operatorCountNeeded === 0 && !activeModes.includes("LABOR")) {
      finalOperatorId = undefined;
      finalMultiOpIds = [];
    } else if (operatorCountNeeded > 0) {
      const filledSlots = operatorSlots.filter(Boolean);
      if (filledSlots.length > 0) {
        finalOperatorId = filledSlots[0];
        filledSlots.slice(1).forEach(opId => {
          if (!finalMultiOpIds.includes(opId) && opId !== "CUSTOM") finalMultiOpIds.push(opId);
        });
      }
      Object.entries(customOperators).forEach(([slotIdx, op]) => {
        if (op && op.name.trim()) {
          breakdownNotes.push(`Custom Operator (Slot #${Number(slotIdx) + 1}): ${op.name}${op.phone ? ` (${op.phone})` : ""}${op.wage ? ` [@ ₹${op.wage}]` : ""}`);
        }
      });
    }

    if (driverId === "CUSTOM" && customDriverDetails.name.trim()) {
      breakdownNotes.push(`Custom Driver: ${customDriverDetails.name}${customDriverDetails.phone ? ` (${customDriverDetails.phone})` : ""}${customDriverDetails.vehicleNo ? ` [Vehicle: ${customDriverDetails.vehicleNo}]` : ""}`);
    }

    const combinedNotes = [breakdownNotes.length > 0 ? `[Leaders Breakdown: ${breakdownNotes.join(", ")}]` : "", notes].filter(Boolean).join(" | ");

    startTransition(async () => {
      const payload: any = {
        customerId,
        machineId: chosenMachineIds[0] || "INDEPENDENT",
        machineIds: chosenMachineIds.length > 0 ? chosenMachineIds : ["INDEPENDENT"],
        driverId: publicTransportUsed ? undefined : (driverId || undefined),
        operatorId: finalOperatorId,
        mainHelperId: finalMainLeaderId,
        mainHelperName: finalMainLeaderName,
        helperCount: finalHelperCount,
        trollyWorkerCount: Number(trollyWorkerCount || 0),
        multiOperatorIds: finalMultiOpIds,
        multiWorkerIds: finalMultiWorkerIds,
        siteBundleId: siteBundleId.trim() || undefined,
        location,
        mapLink: mapLink.trim() || undefined,
        dateOfService,
        workType,
        liftFloors: Number(liftFloors || 1),
        mixerCategory: mixerCategory,
        vibratorType: vibratorType === "NONE" ? undefined : vibratorType,
        hasTrollyBench: hasTrollyBench,
        publicTransportUsed: publicTransportUsed,
        toolItems,
        notes: combinedNotes || undefined,
      };

      let res;
      if (editingDispatch) {
        res = await updateDailyDispatch({ ...payload, id: editingDispatch.id, version: editingDispatch.version });
        if (!res.success) {
          setErrorMsg(res.error || "Failed to update daily dispatch.");
        } else {
          setSuccessMsg("Dispatch updated successfully!");
          setShowNewModal(false);
          setEditingDispatch(null);
          window.location.reload();
        }
      } else {
        res = await createDailyDispatch(payload);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to create daily dispatch.");
        } else {
          setSuccessMsg("V15.0 Daily Dispatch & Setup created successfully!");
          setShowNewModal(false);
          window.location.reload();
        }
      }
    });
  };

  const handleEditDispatch = (dispatch: any) => {
    setEditingDispatch(dispatch);
    setSelectedEvent(null);
    setCustomerId(dispatch.customerId);
    setLocation(dispatch.location);
    setDateOfService(new Date(dispatch.dateOfService).toISOString().split("T")[0]);
    setWorkType(dispatch.workType);
    setLiftFloors(dispatch.liftFloors);
    setMixerCategory(dispatch.mixerCategory);
    setVibratorType(dispatch.vibratorType || "NONE");
    setHasTrollyBench(dispatch.hasTrollyBench);
    setPublicTransportUsed(dispatch.publicTransportUsed);
    setNotes(dispatch.notes || "");
    
    // Machine logic
    const mIds = dispatch.dispatchMachines?.map((m: any) => m.machineId) || [];
    if (dispatch.machineId && dispatch.machineId !== "INDEPENDENT" && !mIds.includes(dispatch.machineId)) mIds.push(dispatch.machineId);
    setSelectedMachineIds(mIds);
    setWorkCategory(mIds.length > 0 ? "MACHINE" : "INDEPENDENT");
    
    // Modes
    const newActive = [];
    if (mIds.length > 0) {
      if (dispatch.liftFloors > 1 || dispatch.machine?.type === "LIFT") newActive.push("LIFT");
      if (dispatch.mixerCategory === "HYDRAULIC" || dispatch.machine?.type === "MIXER") newActive.push("MIXER");
    }
    if (dispatch.vibratorType) newActive.push("VIBRATOR");
    if (dispatch.hasTrollyBench) newActive.push("TROLLY");
    setActiveModes(newActive);

    setOperatorId(dispatch.operatorId || "");
    setDriverId(dispatch.driverId || "");
    
    if (dispatch.dispatchTools) {
      const toolQs: Record<string, number> = {};
      dispatch.dispatchTools.forEach((t: any) => {
        toolQs[t.toolId] = t.quantity;
      });
      setToolQuantities(toolQs);
    }
    
    setShowNewModal(true);
  };

  useEffect(() => {
    let start: Date;
    let end: Date;

    if (urlView === "month") {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (urlView === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }

    startTransition(async () => {
      const res = await fetchDispatchesByRange(start.toISOString(), end.toISOString());
      if (res.success && res.data) {
        setDispatches(res.data);
      }
    });
  }, [urlView, urlDateStr]); // Re-fetch when URL changes

  const handleNavigate = (newDate: Date) => {
    const params = new URLSearchParams(window.location.search);
    params.set("date", format(newDate, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleViewChange = (newView: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", newView);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDrillDown = (date: Date, newView: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("date", format(date, "yyyy-MM-dd"));
    params.set("view", newView);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const navigateLedger = (direction: 'PREV' | 'NEXT') => {
    const params = new URLSearchParams(window.location.search);
    let newDate = currentDate;
    
    if (urlView === 'week') {
      newDate = direction === 'PREV' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
    } else {
      newDate = direction === 'PREV' ? subDays(currentDate, 1) : addDays(currentDate, 1);
    }
    
    params.set("date", format(newDate, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleStatusChange = async (id: string, status: string) => {
    let reason = undefined;
    if (status === "CANCELLED" || status === "POSTPONED") {
      const promptRes = window.prompt(`Mandatory Audit Reason to ${status} this job:`);
      if (!promptRes || promptRes.trim().length < 3) {
        alert("Action aborted: You must enter a valid reason (at least 3 characters).");
        return;
      }
      reason = promptRes.trim();
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateDispatchStatus({ dispatchId: id, status, reason });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update status.");
      } else {
        window.location.reload();
      }
    });
  };

  const handleGenerateBill = async (dId: string) => {
    alert("Billing module has been upgraded to Bulk Invoicing. Please go to the Billing ledger to generate invoices.");
  };

  const handleResolveConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispatchId) return;
    startTransition(async () => {
      const res = await resolveDispatchConflict(resolvingDispatchId, resolutionNotes);
      if (!res.success) {
        alert(res.error || "Failed to resolve conflict.");
      } else {
        setResolvingDispatchId(null);
        window.location.reload();
      }
    });
  };

  const handleFinalizeScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizingDispatch) return;
    startTransition(async () => {
      const payload: any = {
        dispatchId: finalizingDispatch.id,
        finalWorkType,
        closingNotes,
      };
      if (adjustedOperatorRate !== "") payload.adjustedOperatorRate = Number(adjustedOperatorRate);
      if (adjustedCustomerCharge !== "") payload.adjustedCustomerCharge = Number(adjustedCustomerCharge);

      const res = await finalizeDispatchScope(payload);
      if (!res.success) {
        alert(res.error || "Failed to finalize scope.");
      } else {
        setFinalizingDispatch(null);
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Active Daily Bookings & Dispatch Orders ({dispatches.length})
          </h2>
          <p className="text-xs text-slate-400">
            Office Booking Page — Staff books Site, Category & Crew. Exact field setting & setup logging are done by the Operator and Driver via their Field Apps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "TABLE" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Ledger Grid (3-Col)
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "GRID" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>

          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Dispatch
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* CALENDAR DISPLAY (ONLY IN MONTH VIEW) */}
      {urlView === "month" && (
        <div className="bg-white rounded-2xl p-4 shadow-xl text-slate-900 h-[650px] overflow-hidden mb-6">
          <BigCalendar
            localizer={localizer}
            events={dispatches.map(d => ({
              title: `${d.customer?.name} - ${d.machine?.category || 'Labor'}`,
              start: new Date(d.dateOfService),
              end: new Date(d.dateOfService),
              resource: d
            }))}
            startAccessor="start"
            endAccessor="end"
            views={['month', 'week', 'day']}
            
            view={urlView}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleViewChange as any}
            onDrillDown={handleDrillDown as any}

            onSelectEvent={(event: any) => setSelectedEvent(event.resource)}
            className="font-sans"
            popup
          />
        </div>
      )}

      {/* LEDGER DISPLAY (ONLY IN WEEK/DAY VIEW) */}
      {urlView !== "month" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 overflow-hidden shadow">
                <button 
                  onClick={() => navigateLedger('PREV')} 
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-r border-slate-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-3 py-2 bg-slate-900 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-500" />
                </div>
                <button 
                  onClick={() => navigateLedger('NEXT')} 
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-l border-slate-700"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-white">
                {urlView === "day" 
                  ? `Dispatches for ${format(currentDate, "MMMM do, yyyy")}` 
                  : `Week of ${format(startOfWeek(currentDate), "MMM do")} - ${format(endOfWeek(currentDate), "MMM do, yyyy")}`}
              </h2>
            </div>
            <button 
              onClick={() => handleViewChange("month")}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors border border-slate-700 shadow flex items-center justify-center"
            >
              &larr; Back to Full Calendar
            </button>
          </div>

          {dispatches.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-bold text-white">No dispatches recorded for this date range</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto text-slate-500">
                Click &quot;Create New Dispatch&quot; to log equipment, storeys, main caller helper + helper headcount, and setup tools.
              </p>
            </div>
          ) : viewMode === "TABLE" ? (
        /* V15.0 PAPERGRID 3-COLUMN TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-300 text-xs font-bold tracking-wide">
                  <th className="p-4 w-[28%] border-r border-slate-800/60">
                    Customer & Contact Details
                  </th>
                  <th className="p-4 w-[34%] border-r border-slate-800/60">
                    Assigned Labor & Crew Breakdown
                  </th>
                  <th className="p-4 w-[38%]">
                    Assigned Equipment, Setup Tools & Billing
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {dispatches.map((d) => {
                  const hasLift = d.machine?.type === "LIFT" || (d.dispatchMachines?.some((dm: any) => dm.machine?.type === "LIFT")) || d.liftFloors > 1;
                  const hasMixer = d.machine?.type === "MIXER" || (d.dispatchMachines?.some((dm: any) => dm.machine?.type === "MIXER")) || d.mixerCategory === "HYDRAULIC";
                  const hasVib = d.vibratorType || (d.dispatchTools?.some((t: any) => t.tool?.toolType?.includes("VIBRATOR")));

                  return (
                    <tr key={d.id} className={`hover:bg-slate-800/30 transition-colors ${d.isFlagged ? "bg-red-950/20" : ""}`}>
                      {/* COLUMN 1: Customer & Location */}
                      <td className="p-4 align-top border-r border-slate-800/60 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-extrabold text-white text-sm block">{d.customer?.name}</span>
                            <span className="text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                              <Phone className="w-3 h-3 text-amber-400" />
                              {d.customer?.phone || "No phone listed"}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            d.status === "DELIVERED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                            d.status === "CANCELLED" || d.status === "POSTPONED" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {d.status}
                          </span>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-200">{d.location}</span>
                          </div>
                          {d.mapLink && (
                            <a
                              href={d.mapLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 pt-1 font-mono"
                            >
                              <Navigation className="w-3 h-3" />
                              Driver GPS Map Pin Link ↗
                            </a>
                          )}
                          <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                            <span>Date: {new Date(d.dateOfService).toISOString().split("T")[0]}</span>
                            {d.siteBundleId && <span className="font-mono text-amber-400 uppercase">[{d.siteBundleId}]</span>}
                          </div>
                        </div>

                        {d.isFlagged && (
                          <div className="p-2 bg-red-950/60 border border-red-500/50 rounded-lg text-[11px] text-red-300">
                            <strong className="text-red-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Dispute:
                            </strong>
                            {d.conflictReport}
                            {userRole === "OWNER" && (
                              <button
                                onClick={() => setResolvingDispatchId(d.id)}
                                className="mt-1.5 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1 rounded text-[10px]"
                              >
                                Resolve Dispute
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* COLUMN 2: Assigned Labor Crew */}
                      <td className="p-4 align-top border-r border-slate-800/60 space-y-3">
                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                            <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> Caller / Main Helper Leader
                            </span>
                            <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
                              {d.helperCount > 0 ? `${d.helperCount} Helpers only` : "Direct Labor"}
                            </span>
                          </div>
                          
                          <div className="text-slate-200 font-bold text-sm">
                            {d.mainHelperName || d.mainHelper?.name || "No Main Helper / Caller specified"}
                          </div>
                          
                          {d.helperCount > 0 && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Total Helper Crew count represented by this caller leader: <strong className="text-white">{d.helperCount} Workers</strong>
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Operator</span>
                            <span className="font-bold text-amber-400 text-xs block truncate">
                              {d.operator?.name || "Optional / None"}
                            </span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Conveyance / Driver</span>
                            <span className="font-bold text-slate-300 text-xs block truncate">
                              {d.publicTransportUsed ? "Public Transport / Outside" : (d.driver?.name || "Company Driver")}
                            </span>
                          </div>
                        </div>

                        {(d.multiOperators?.length > 0 || d.multiWorkers?.length > 0) && (
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-[11px] space-y-1">
                            <span className="text-slate-500 font-bold uppercase block text-[10px]">Additional Crew:</span>
                            {d.multiOperators?.map((mo: any) => (
                              <div key={mo.id} className="flex justify-between text-slate-300">
                                <span>Op: {mo.employee?.name}</span>
                              </div>
                            ))}
                            {d.multiWorkers?.map((mw: any) => (
                              <div key={mw.id} className="flex justify-between text-slate-300">
                                <span>Helper: {mw.employee?.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* COLUMN 3: Equipment, Setup & Bill Slip Action */}
                      <td className="p-4 align-top space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {hasLift && (
                            <span className="bg-blue-950/80 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-blue-400" />
                              Lift ({d.liftFloors ?? 1} Floored used)
                            </span>
                          )}
                          {hasMixer && (
                            <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                              <Wrench className="w-3.5 h-3.5 text-amber-400" />
                              Mixer ({d.mixerCategory === "HYDRAULIC" ? "Hydraulic Machine" : "Standard Machine"})
                            </span>
                          )}
                          {hasVib && (
                            <span className="bg-purple-950/80 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                              <span>Vibrator ({d.vibratorType || "PETROL"})</span>
                            </span>
                          )}
                          {d.hasTrollyBench && (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                              <span>Trolly + Bench Stand</span>
                            </span>
                          )}
                        </div>

                        {/* Setup tools */}
                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                          <span className="text-xs font-bold text-slate-400 block">
                            Setup Tools Used (Auxiliary items & wire):
                          </span>
                          {d.dispatchTools && d.dispatchTools.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {d.dispatchTools.map((dt: any) => (
                                <span key={dt.toolId} className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[11px] font-bold border border-slate-700">
                                  {dt.tool?.name} ×{dt.quantity}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No specific setup tools logged</span>
                          )}
                        </div>

                        {/* BILLING ACTION LINK OR GENERATE BUTTON */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                          {d.invoice ? (
                            <button
                              onClick={() => router.push(`/admin/billing/${d.invoice.id}`)}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                            >
                              <FileText className="w-4 h-4" />
                              View Bill #{d.invoice.billNumber} (₹{Number(d.invoice.totalAmount).toLocaleString()}) →
                            </button>
                          ) : (
                            <button
                              disabled={isPending}
                              onClick={() => handleGenerateBill(d.id)}
                              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                            >
                              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                              Generate Bill Slip (Auto-Pull Ledger)
                            </button>
                          )}
                        </div>

                        {/* Status updates */}
                        {d.status !== "CANCELLED" && d.status !== "POSTPONED" && d.status !== "COMPLETED" && (
                          <div className="flex items-center gap-1.5 pt-1">
                            {d.status === "PENDING" && (
                              <button
                                disabled={isPending}
                                onClick={() => handleStatusChange(d.id, "DELIVERED")}
                                className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all"
                              >
                                Mark Delivered
                              </button>
                            )}
                            {d.status === "DELIVERED" && (
                              <button
                                disabled={isPending}
                                onClick={() => handleStatusChange(d.id, "COMPLETED")}
                                className="flex-1 bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all"
                              >
                                Mark Completed
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(d.id, "CANCELLED")}
                              className="px-2 py-1.5 bg-slate-800 hover:bg-red-900/40 text-red-400 font-bold rounded-lg text-[11px] border border-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CLASSIC GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dispatches.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-base">{d.customer?.name}</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> {d.location}
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div><strong>Main Caller:</strong> {d.mainHelperName || d.mainHelper?.name || "Direct"}</div>
                  <div><strong>Helper Count:</strong> {d.helperCount || 0} Workers</div>
                  <div><strong>Lift Storeys:</strong> {d.liftFloors || 1} Floored</div>
                  <div><strong>Mixer:</strong> {d.mixerCategory || "STANDARD"}</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                {d.invoice ? (
                  <button
                    onClick={() => router.push(`/admin/billing/${d.invoice.id}`)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    View Bill #{d.invoice.billNumber}
                  </button>
                ) : (
                  <button
                    onClick={() => handleGenerateBill(d.id)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    Generate Bill Slip #1583
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}

      {/* CREATE DISPATCH / SITE BUNDLE MODAL (SPACIOUS ENTERPRISE COMMAND CENTER) */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-6 h-6 text-amber-400" />
                  {editingDispatch ? "Edit Dispatch Booking Order" : "Create New Site Booking Order"}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Log customer, equipment selection, leader allocations, and initial setup items. Exact field tags and setup confirmation are completed via Operator and Driver field apps.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="mt-6 space-y-8">
              {/* Section 1: Customer & Site Details */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80">
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Customer & Site Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-300">Customer / Contractor *</label>
                      <button
                        type="button"
                        onClick={() => setShowNewCustomerModal(true)}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> + Add New
                      </button>
                    </div>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none transition-colors"
                      required
                    >
                      <option value="" disabled>Select customer from ledger...</option>
                      {customersList.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || "No phone"})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Site Location / Landmark *</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Kakkanad Pillar 42 / Aluva Site"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Service Date *</label>
                    <input
                      type="date"
                      value={dateOfService}
                      onChange={(e) => setDateOfService(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Equipment Categories & Options */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Equipment Categories & Options
                  </h4>
                  <p className="text-sm text-slate-400 mt-0.5">Select active service lines for this dispatch order.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { mode: "LIFT", label: "Lift Machine", icon: <Truck className="w-4 h-4 text-blue-400" /> },
                    { mode: "MIXER", label: "Concrete Mixer", icon: <Wrench className="w-4 h-4 text-amber-400" /> },
                    { mode: "VIBRATOR", label: "Vibrator Machine", icon: <Layers className="w-4 h-4 text-purple-400" /> },
                    { mode: "TROLLY", label: "Trolly & Bench Stand", icon: <HardHat className="w-4 h-4 text-emerald-400" /> },
                    { mode: "LABOR", label: "Pani Crew Only", icon: <Users className="w-4 h-4 text-rose-400" /> },
                    { mode: "CUSTOM", label: "Custom Equipment", icon: <PlusCircle className="w-4 h-4 text-cyan-400" /> },
                  ].map((cat) => {
                    const active = activeModes.includes(cat.mode);
                    return (
                      <button
                        key={cat.mode}
                        type="button"
                        onClick={() => toggleMode(cat.mode)}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          active
                            ? "bg-amber-500/10 border-amber-500/60 text-white shadow-lg shadow-amber-500/5"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {cat.icon}
                          <span className={`w-2 h-2 rounded-full ${active ? "bg-amber-400" : "bg-slate-700"}`}></span>
                        </div>
                        <span className="font-bold text-sm">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Inline Options Strip if any category selected */}
                {(activeModes.includes("LIFT") || activeModes.includes("MIXER") || activeModes.includes("VIBRATOR") || activeModes.includes("TROLLY")) && (
                  <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {activeModes.includes("LIFT") && (
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1.5">Lift Storeys / Floors</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={liftFloors}
                          onChange={(e) => setLiftFloors(Number(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-bold focus:border-amber-500 outline-none"
                        />
                      </div>
                    )}

                    {activeModes.includes("MIXER") && (
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1.5">Mixer Category</label>
                        <select
                          value={mixerCategory}
                          onChange={(e) => setMixerCategory(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-bold focus:border-amber-500 outline-none"
                        >
                          <option value="STANDARD">Standard Mixer</option>
                          <option value="HYDRAULIC">Hydraulic Machine</option>
                        </select>
                      </div>
                    )}

                    {activeModes.includes("VIBRATOR") && (
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1.5">Vibrator Type</label>
                        <select
                          value={vibratorType}
                          onChange={(e) => setVibratorType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-bold focus:border-amber-500 outline-none"
                        >
                          <option value="PETROL">Petrol Vibrator</option>
                          <option value="ELECTRIC">Electric Vibrator</option>
                          <option value="BOTH">Petrol + Electric</option>
                          <option value="NONE">No Vibrator Needed</option>
                        </select>
                      </div>
                    )}

                    {activeModes.includes("TROLLY") && (
                      <div className="flex items-center h-full pt-6">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-xl border border-slate-800 w-full">
                          <input
                            type="checkbox"
                            checked={hasTrollyBench}
                            onChange={(e) => setHasTrollyBench(e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded"
                          />
                          <span className="text-sm font-bold text-white">Include Bench Stand</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Machine Selection & Custom Machines List */}
                {(activeModes.includes("LIFT") || activeModes.includes("MIXER") || activeModes.includes("VIBRATOR") || activeModes.includes("CUSTOM")) && (
                  <div className="pt-6 border-t border-slate-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-300 block">Specific Machine Unit Assignment & Custom Equipment</label>
                        <span className="text-xs text-slate-500">Select physical equipment fleet units or define custom rental machinery below.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomMachine}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all w-fit shadow-sm"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + Add Custom / External Machine
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {machines.map((m) => {
                        const selected = selectedMachineIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMachine(m.id)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              selected ? "bg-amber-500/20 border-amber-500 text-amber-200 font-bold" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div>
                              <div className="text-white font-semibold">{m.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{m.category} • {m.serialNumber || "No SN"}</div>
                            </div>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? "border-amber-400 bg-amber-400/20 text-amber-400 font-black" : "border-slate-700"}`}>
                              {selected && "✓"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {customMachines.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Custom / External Machinery Items:</span>
                        {customMachines.map((m) => (
                          <div key={m.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-900/90 p-3 rounded-xl border border-cyan-500/30">
                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) => handleCustomMachineChange(m.id, "name", e.target.value)}
                                placeholder="Custom Machine Name / Specification (e.g. 15HP Diesel Generator)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-white outline-none focus:border-cyan-400"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <input
                                type="number"
                                min="1"
                                value={m.qty}
                                onChange={(e) => handleCustomMachineChange(m.id, "qty", Number(e.target.value) || 1)}
                                placeholder="Qty"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-center text-cyan-400 font-bold outline-none"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={m.rate || ""}
                                onChange={(e) => handleCustomMachineChange(m.id, "rate", e.target.value)}
                                placeholder="Rate / Daily Charge (₹)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-emerald-400 outline-none"
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomMachine(m.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Personnel Allocation (Leaders & Helpers) */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      Leaders & Pani Helpers Allocation
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">Assign internal or external leaders and specify exact worker counts per crew.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 flex items-center gap-2 shadow-sm">
                      <span>Total Helpers:</span>
                      <span className="font-black text-amber-400 text-base">
                        {leaderAllocations.reduce((sum, l) => sum + Number(l.helperCount || 0), 0)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLeaderRow}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" />
                      + Add Another Leader
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {leaderAllocations.map((row, idx) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80"
                    >
                      <div className="sm:col-span-1 text-center font-bold text-slate-500 text-sm">
                        #{idx + 1}
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Select Internal Leader</label>
                        <select
                          value={row.leaderId || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "leaderId", e.target.value || undefined)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-medium focus:border-amber-500 outline-none"
                        >
                          <option value="">-- External / Direct Caller --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.phone || "No Phone"})</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">External Leader Name</label>
                        <input
                          type="text"
                          value={row.leaderName || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "leaderName", e.target.value)}
                          placeholder="e.g. Raju Mestri"
                          disabled={!!row.leaderId}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-medium disabled:opacity-40 focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Workers</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.helperCount}
                          onChange={(e) => handleLeaderRowChange(idx, "helperCount", Number(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-2 text-sm text-amber-400 font-bold text-center focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Skill Category</label>
                        <input
                          type="text"
                          value={row.skillCategory || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "skillCategory", e.target.value)}
                          placeholder="e.g. Mason / Bar Bender"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-2.5 text-xs text-white font-medium focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Rate (₹)</label>
                        <input
                          type="text"
                          value={row.dailyWage || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "dailyWage", e.target.value)}
                          placeholder="₹/day"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-2 text-xs text-emerald-400 font-bold focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        {leaderAllocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLeaderRow(idx)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Remove leader row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Equipment Operators & Conveyance */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-400" />
                      Equipment Operators & Conveyance
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">Assign operator slots or designate public conveyance.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-300">Operators Required:</span>
                    <select
                      value={operatorCountNeeded}
                      onChange={(e) => {
                        const target = Number(e.target.value);
                        setOperatorCountNeeded(target);
                        if (operatorSlots.length < target) {
                          setOperatorSlots([...operatorSlots, ...Array(target - operatorSlots.length).fill("")]);
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-xl py-1.5 px-3 text-sm font-bold text-amber-400 outline-none focus:border-amber-500"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <option key={num} value={num}>{num} {num === 1 ? "Operator" : "Operators"}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const target = operatorCountNeeded + 1;
                        setOperatorCountNeeded(target);
                        if (operatorSlots.length < target) {
                          setOperatorSlots([...operatorSlots, ""]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1 transition-all shadow-sm whitespace-nowrap"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Add Slot
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Operator Slots */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 block">Operator Slot Assignments (`Internal or Custom`)</label>
                    {operatorCountNeeded === 0 ? (
                      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-sm text-slate-400 flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>No operators requested (`e.g. direct rental`). Click '+ Add Slot' to assign any operator.</span>
                      </div>
                    ) : (
                      operatorSlots.slice(0, operatorCountNeeded).map((slotId, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-amber-400 w-16">Slot #{idx + 1}</span>
                            <select
                              value={slotId}
                              onChange={(e) => {
                                const next = [...operatorSlots];
                                next[idx] = e.target.value;
                                setOperatorSlots(next);
                                if (idx === 0) setOperatorId(e.target.value);
                              }}
                              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-medium focus:border-amber-500 outline-none"
                            >
                              <option value="">-- Assign Operator... --</option>
                              <option value="CUSTOM">-- Custom / External Operator --</option>
                              {employees
                                .filter((emp) => {
                                  const hasOpSkill = emp.skills?.includes("OPERATOR") || emp.role?.includes("OPERATOR");
                                  const canDualOperate = emp.canOperateLift && emp.canOperateMixer;
                                  if (workCategory === "MACHINE" || activeModes.includes("LIFT") || activeModes.includes("MIXER")) {
                                    return hasOpSkill || canDualOperate;
                                  }
                                  return true;
                                })
                                .map((emp) => {
                                  const badges: string[] = [];
                                  if (emp.canOperateLift && emp.canOperateMixer) badges.push("Lift+Mixer Dual");
                                  else if (emp.canOperateLift) badges.push("Lift");
                                  else if (emp.canOperateMixer) badges.push("Mixer");

                                  return (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} {emp.phone ? `(${emp.phone})` : ""} {badges.length > 0 ? `[${badges.join(" | ")}]` : ""}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>

                          {slotId === "CUSTOM" && (
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-800/80">
                              <div className="sm:col-span-6">
                                <input
                                  type="text"
                                  value={customOperators[idx]?.name || ""}
                                  onChange={(e) => setCustomOperators({ ...customOperators, [idx]: { ...customOperators[idx], name: e.target.value } })}
                                  placeholder="Custom Operator Name *"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="text"
                                  value={customOperators[idx]?.phone || ""}
                                  onChange={(e) => setCustomOperators({ ...customOperators, [idx]: { ...customOperators[idx], phone: e.target.value } })}
                                  placeholder="Phone No."
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="text"
                                  value={customOperators[idx]?.wage || ""}
                                  onChange={(e) => setCustomOperators({ ...customOperators, [idx]: { ...customOperators[idx], wage: e.target.value } })}
                                  placeholder="Wage (₹/day)"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-emerald-400 font-bold outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Conveyance / Driver */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 block">Transport & Conveyance Method</label>
                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800/80 space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publicTransportUsed}
                          onChange={(e) => setPublicTransportUsed(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                        <div>
                          <span className="text-sm font-bold text-white block">Public Transport / Auto / Client Pick-Up</span>
                          <span className="text-xs text-slate-400">Driver not required from internal pool</span>
                        </div>
                      </label>

                      {!publicTransportUsed && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Assign Company / Custom Driver</label>
                            <select
                              value={driverId}
                              onChange={(e) => setDriverId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none"
                            >
                              <option value="">-- Select Company Driver --</option>
                              <option value="CUSTOM">-- Custom / External Driver --</option>
                              {employees
                                .filter((e) => e.skills?.includes("DRIVER") || e.role?.includes("DRIVER") || e.name.toLowerCase().includes("driver"))
                                .map((driver) => (
                                  <option key={driver.id} value={driver.id}>{driver.name} ({driver.phone || "No phone"})</option>
                                ))}
                            </select>
                          </div>

                          {driverId === "CUSTOM" && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-950 rounded-xl border border-amber-500/30">
                              <input
                                type="text"
                                value={customDriverDetails.name}
                                onChange={(e) => setCustomDriverDetails({ ...customDriverDetails, name: e.target.value })}
                                placeholder="Custom Driver Name *"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                              />
                              <input
                                type="text"
                                value={customDriverDetails.phone}
                                onChange={(e) => setCustomDriverDetails({ ...customDriverDetails, phone: e.target.value })}
                                placeholder="Driver Phone No."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                              />
                              <input
                                type="text"
                                value={customDriverDetails.vehicleNo}
                                onChange={(e) => setCustomDriverDetails({ ...customDriverDetails, vehicleNo: e.target.value })}
                                placeholder="Vehicle / Pickup No."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-amber-400 font-mono outline-none focus:border-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Auxiliary Setup Tools Grid & Custom Items */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-amber-400" />
                      Auxiliary Setup Tools & Custom Items
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">Adjust database tool estimates or add custom site equipment below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomTool}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all w-fit shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + Add Custom Tool / Item
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tools
                    .filter((t) => {
                      const name = t.name.toLowerCase();
                      return !name.includes("cement") && !name.includes("bag");
                    })
                    .map((tool) => {
                      const qty = toolQuantities[tool.id] || 0;
                      return (
                        <div
                          key={tool.id}
                          className="h-full flex flex-col justify-between p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all"
                        >
                          <div>
                            <span className="font-bold text-sm text-slate-200 block">{tool.name}</span>
                            {tool.malayalamName && (
                              <span className="text-xs text-slate-400 font-normal block mt-0.5">{tool.malayalamName}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() => handleToolQtyChange(tool.id, -1)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm transition-colors"
                            >
                              -
                            </button>
                            <span className="font-black text-amber-400 text-sm">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleToolQtyChange(tool.id, 1)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {customToolsList.map((tool) => (
                    <div
                      key={tool.id}
                      className="h-full flex flex-col justify-between p-4 bg-purple-950/20 border border-purple-500/40 rounded-2xl transition-all space-y-2"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">Custom Tool</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomTool(tool.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={tool.name}
                          onChange={(e) => handleCustomToolChange(tool.id, "name", e.target.value)}
                          placeholder="Tool Name *"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white font-bold outline-none focus:border-purple-400"
                        />
                        <input
                          type="text"
                          value={tool.malayalamName || ""}
                          onChange={(e) => handleCustomToolChange(tool.id, "malayalamName", e.target.value)}
                          placeholder="Malayalam Name (`Optional`)"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-[11px] text-slate-300 outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-500/20">
                        <button
                          type="button"
                          onClick={() => handleCustomToolQtyDelta(tool.id, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-sm transition-colors border border-slate-700"
                        >
                          -
                        </button>
                        <span className="font-black text-purple-300 text-sm">{tool.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleCustomToolQtyDelta(tool.id, 1)}
                          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-sm transition-colors border border-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: Notes & Final Confirmation Strip */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Special Booking Notes / Site Instructions</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Gate pass required, narrow alleyway approach..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white font-medium focus:border-amber-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Driver GPS Map Pin Link (`Optional`)</label>
                    <input
                      type="url"
                      value={mapLink}
                      onChange={(e) => setMapLink(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-mono focus:border-amber-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Provides turn-by-turn navigation directly inside driver field apps.</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    Confirm & Create Booking Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK INLINE ADD CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Quick Add Contractor / Customer
              </h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCustomerSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Contractor / Customer Name *</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Jose Contractors / Thomas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9847012345"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Default Site Address / City (Optional)</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Kakkanad, Kochi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Add Contractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFLICT RESOLUTION MODAL */}
      {resolvingDispatchId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertCircle className="w-5 h-5" />
              Resolve Field Dispute
            </h3>
            <form onSubmit={handleResolveConflict} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Owner Resolution Summary *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Agreed to ₹500 discount on hydraulic charge..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingDispatchId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow"
                >
                  Clear Dispute Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">Dispatch Details</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-4">
              <div>
                <strong className="text-slate-400 text-xs uppercase block">Customer</strong>
                <span className="text-white text-base">{selectedEvent.customer?.name}</span>
              </div>
              <div>
                <strong className="text-slate-400 text-xs uppercase block">Location</strong>
                <span className="text-white text-base">{selectedEvent.location}</span>
              </div>
              <div>
                <strong className="text-slate-400 text-xs uppercase block">Status</strong>
                <span className="text-amber-400 font-bold">{selectedEvent.status}</span>
              </div>
              <div>
                <strong className="text-slate-400 text-xs uppercase block">Machine</strong>
                <span className="text-slate-200">{selectedEvent.machine?.name || "Labor Only"}</span>
              </div>
              <div>
                <strong className="text-slate-400 text-xs uppercase block">Date of Service</strong>
                <span className="text-slate-200">{new Date(selectedEvent.dateOfService).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              {selectedEvent.status === "PENDING" && (
                <button
                  onClick={() => handleEditDispatch(selectedEvent)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" /> Edit Dispatch
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
