"use client";

import React, { useState, useTransition } from "react";
import { 
  createDailyDispatch, 
  updateDispatchStatus, 
  resolveDispatchConflict, 
  finalizeDispatchScope,
  createQuickCustomer
} from "@/actions/dispatch";
import { CreateDispatchModalV2 } from "@/components/dispatch/CreateDispatchModalV2";
import DispatchBillingModal from "@/components/admin/DispatchBillingModal";
import { SiteLaborDisbursementReview } from "./SiteLaborDisbursementReview";
import ToolReturnModal from "@/components/ToolReturnModal";
// import { generateBillFromBooking } from "@/actions/billing";

import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { startOfMonth, endOfMonth, endOfWeek, startOfDay, endOfDay, parseISO, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { useEffect } from "react";
import { fetchDispatchesByRange, updateDailyDispatch } from "@/actions/dispatch";
import {
  calculateLiftOperatorWage,
  COMPANY_WORKER_ROLE_WAGES,
  OUTSIDE_WORKER_FLAT_WAGE,
  getDefaultWorkerWage,
} from "@/lib/pricingEngine";

import { 
  Truck, 
  PlusCircle, 
  CheckCircle2, 
  Clock,
  Shield, 
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
  ChevronRight,
  Search,
  Pencil,
  Check,
  UserMinus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface DispatchClientProps {
  initialDispatches: any[];
  customers: any[];
  machines: any[];
  employees: any[];
  tools: any[];
  subLeaders?: any[];
  vehicles?: any[];
  userRole: string;
}

export default function DispatchBoardClient({
  initialDispatches,
  customers: initialCustomers,
  machines,
  employees,
  tools,
  vehicles = [],
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
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDispatches = dispatches.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const loc = (d.location || "").toLowerCase();
    const cust = (d.customer?.name || "").toLowerCase();
    const mach = (d.machine?.machineId || "").toLowerCase();
    const driv = (d.driver?.name || "").toLowerCase();
    const op = (d.operator?.name || "").toLowerCase();
    const idStr = (d.id || "").toLowerCase();
    return loc.includes(term) || cust.includes(term) || mach.includes(term) || driv.includes(term) || op.includes(term) || idStr.includes(term);
  });

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { "en-US": enUS },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Breakdown Hot-Swap state
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownDispatch, setBreakdownDispatch] = useState<any | null>(null);
  const [replacementMachineId, setReplacementMachineId] = useState("");
  const [swapDriverId, setSwapDriverId] = useState("");
  const [downtimeHours, setDowntimeHours] = useState(3);
  const [downtimeCredit, setDowntimeCredit] = useState(1500);

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
  const [adjustedToolRent, setAdjustedToolRent] = useState<number | string>("");

  // State for Billing / Conflict / Scope
  const [resolvingDispatchId, setResolvingDispatchId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [scopingDispatchId, setScopingDispatchId] = useState<string | null>(null);
  
  // State for Staff Logistics Override
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    dispatchId: string;
    type: "OPERATOR" | "DELIVERED_TOOL" | "RETURNED_TOOL";
    itemId: string;
    itemName: string;
    currentStatus: boolean;
    groupId: string;
  } | null>(null);

  // Tool return verification state
  const [toolReturnDispatch, setToolReturnDispatch] = useState<any | null>(null);

  // Billing modal state
  const [billingDispatch, setBillingDispatch] = useState<any | null>(null);

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
        const wageInfo = l.dailyWage ? ` (@ â‚¹${l.dailyWage}/helper)` : "";
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
      breakdownNotes.push(`Custom Machine: ${m.qty}x ${m.name}${m.rate ? ` (@ â‚¹${m.rate})` : ""}`);
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
          breakdownNotes.push(`Custom Operator (Slot #${Number(slotIdx) + 1}): ${op.name}${op.phone ? ` (${op.phone})` : ""}${op.wage ? ` [@ â‚¹${op.wage}]` : ""}`);
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
    handleNavigate(date);
    handleViewChange(newView);
  };
  
  const handleLogisticsOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModal) return;
    
    startTransition(async () => {
      try {
        const dispatch = filteredDispatches.find(d => d.id === overrideModal.dispatchId);
        if (!dispatch) throw new Error("Dispatch not found");
        
        const payload: any = { dispatchId: overrideModal.dispatchId };
        const newStatus = !overrideModal.currentStatus;
        
        if (overrideModal.type === "OPERATOR") {
          let arr = dispatch.arrivedOperatorIds || [];
          if (newStatus) arr = Array.from(new Set([...arr, overrideModal.itemId]));
          else arr = arr.filter((id: string) => id !== overrideModal.itemId);
          payload.arrivedOperatorIds = arr;
        } else if (overrideModal.type === "DELIVERED_TOOL") {
          let arr = dispatch.deliveredToolIds || [];
          if (newStatus) arr = Array.from(new Set([...arr, overrideModal.itemId]));
          else arr = arr.filter((id: string) => id !== overrideModal.itemId);
          payload.deliveredToolIds = arr;
        } else if (overrideModal.type === "RETURNED_TOOL") {
          let arr = dispatch.returnedToolIds || [];
          if (newStatus) arr = Array.from(new Set([...arr, overrideModal.itemId]));
          else arr = arr.filter((id: string) => id !== overrideModal.itemId);
          payload.returnedToolIds = arr;
        }
        
        const res = await updateDispatchStatus(payload);
        if (!res.success) throw new Error(res.error || "Failed update");
        
        setOverrideModal(null);
        window.location.reload();
      } catch (err: any) {
        alert("Override failed: " + err.message);
      }
    });
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

  const handleStatusChange = async (dispatchObj: any, status: string) => {
    const id = dispatchObj.id;
    let reason = undefined;
    if (status === "CANCELLED" || status === "POSTPONED") {
      const promptRes = window.prompt(`Mandatory Audit Reason to ${status} this job:`);
      if (!promptRes || promptRes.trim().length < 3) {
        alert("Action aborted: You must enter a valid reason (at least 3 characters).");
        return;
      }
      reason = promptRes.trim();
    }

    // Intercept COMPLETED status — open the per-tool return checklist
    if (status === "COMPLETED" && dispatchObj.dispatchTools && dispatchObj.dispatchTools.length > 0) {
      setToolReturnDispatch(dispatchObj);
      return;
    }

    submitStatusUpdate(id, status, reason);
  };

  const submitStatusUpdate = async (id: string, status: string, reason?: string) => {
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
      if (adjustedToolRent !== "") payload.adjustedToolRent = Number(adjustedToolRent);

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
            Active Daily Bookings & Dispatch Orders ({filteredDispatches.length})
          </h2>
          <p className="text-xs text-slate-400">
            Office Booking Page â€” Staff books Site, Category & Crew. Exact field setting & setup logging are done by the Operator and Driver via their Field Apps.
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
            events={filteredDispatches.map(d => ({
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

          {/* GLOBAL SEARCH FILTER */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search dispatches by Job Site, Customer, Machine, or Driver name..."
              className="w-full rounded-2xl border border-zinc-800 bg-slate-900 pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all shadow-xl"
            />
          </div>

          {filteredDispatches.length === 0 ? (
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
                {Object.values(filteredDispatches.reduce((acc: any, d: any) => {
                  const key = d.jobGroupId || d.id;
                  if (!acc[key]) acc[key] = { ...d, childDispatches: [d] };
                  else acc[key].childDispatches.push(d);
                  return acc;
                }, {})).map((group: any) => {
                  // Compute flags across all children
                  const hasLift = group.childDispatches.some((d: any) => d.machine?.type === "LIFT" || d.dispatchMachines?.some((dm: any) => dm.machine?.type === "LIFT") || d.liftFloors > 1);
                  const hasMixer = group.childDispatches.some((d: any) => d.machine?.type === "MIXER" || d.dispatchMachines?.some((dm: any) => dm.machine?.type === "MIXER") || d.mixerCategory === "HYDRAULIC");
                  const hasVib = group.childDispatches.some((d: any) => d.vibratorType || d.dispatchTools?.some((t: any) => t.tool?.toolType?.includes("VIBRATOR")));

                  return (
                    <tr key={group.id} className={`hover:bg-slate-800/30 transition-colors ${group.isFlagged ? "bg-red-950/20" : ""}`}>
                      {/* COLUMN 1: Customer & Location */}
                      <td className="p-4 align-top border-r border-slate-800/60 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-extrabold text-white text-sm block">{group.customer?.name}</span>
                            <span className="text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                              <Phone className="w-3 h-3 text-amber-400" />
                              {group.customer?.phone || "No phone listed"}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            group.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            group.status === "DELIVERED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                            group.status === "CANCELLED" || group.status === "POSTPONED" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {group.status}
                          </span>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-200">{group.location}</span>
                          </div>
                          {group.mapLink && (
                            <a
                              href={group.mapLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 pt-1 font-mono"
                            >
                              <Navigation className="w-3 h-3" />
                              Driver GPS Map Pin Link â†—
                            </a>
                          )}
                          <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                            <span>Date: {new Date(group.dateOfService).toISOString().split("T")[0]}</span>
                            {group.jobGroupId && <span className="font-mono text-amber-400 uppercase">[{group.jobGroupId.substring(0, 12)}]</span>}
                          </div>
                        </div>

                        {group.isFlagged && (
                          <div className="p-2 bg-red-950/60 border border-red-500/50 rounded-lg text-[11px] text-red-300">
                            <strong className="text-red-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Dispute:
                            </strong>
                            {group.conflictReport}
                            {userRole === "OWNER" && (
                              <button
                                onClick={() => setResolvingDispatchId(group.id)}
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
                        {group.childDispatches.map((d: any, childIdx: number) => (
                          <div key={d.id} className={childIdx > 0 ? "pt-3 border-t border-slate-800" : ""}>
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
                            {d.vehicle && (
                              <span className="text-[10px] text-cyan-400 font-mono block truncate mt-0.5">
                                🚚 {d.vehicle.licensePlate} ({d.vehicle.type})
                              </span>
                            )}
                          </div>
                        </div>

                        <CrewAssignmentManager d={d} employees={employees} />
                      </div>
                        ))}
                      </td>

                      {/* COLUMN 3: Assigned Equipment & Setup Tools */}
                      <td className="p-4 align-top space-y-3">
                        {group.childDispatches.map((d: any, childIdx: number) => (
                          <div key={d.id} className={childIdx > 0 ? "pt-3 border-t border-slate-800" : ""}>
                        <div className="flex flex-wrap gap-1.5">
                          {hasLift && (
                            <span className="bg-blue-950/80 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-blue-400" />
                              Lift ({d.liftFloors ?? 1} Floor{(d.liftFloors ?? 1) > 1 ? "s" : ""})
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
                                  {dt.tool?.name} Ã—{dt.quantity}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No specific setup tools logged</span>
                          )}
                        </div>

                        {/* Status updates */}
                        {d.status !== "CANCELLED" && d.status !== "POSTPONED" && d.status !== "COMPLETED" && (
                          <div className="relative group flex items-center gap-1.5 pt-1">
                            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 rounded-lg text-[11px] transition-all">
                              Update Status
                            </button>
                            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(d, "DELIVERED")}
                                className="px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                              >
                                Mark En-Route / Reached
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(d, "COMPLETED")}
                                className="px-4 py-2 text-left text-sm text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400"
                              >
                                Mark Shift Completed
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(d, "CANCELLED")}
                                className="px-4 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10 border-t border-zinc-800"
                              >
                                Cancel Job
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(d, "POSTPONED")}
                                className="px-4 py-2 text-left text-sm text-orange-400 hover:bg-orange-500/10 border-t border-zinc-800"
                              >
                                Postpone Job
                              </button>
                            </div>
                          </div>
                        )}
                            {["OWNER", "STAFF", "ADMIN"].includes(userRole) && (
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
                                <button
                                  onClick={() => handleStatusChange(d, "COMPLETED")}
                                  className="px-2.5 py-1 rounded bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 font-bold text-[10px]"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Mark Finished
                                </button>
                                {d.status === "COMPLETED" && !d.invoiceId && (
                                  <button
                                    onClick={() => {
                                      window.location.href = `/staff/billing/${d.id}`;
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1 font-bold text-[10px]"
                                  >
                                    Generate Bill / Settle
                                  </button>
                                )}
                                {d.invoiceId && (
                                  <a
                                    href={`/admin/billing/print/${d.invoiceId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 transition-colors flex items-center gap-1 font-bold text-[10px]"
                                  >
                                    View / Print Bill
                                  </a>
                                )}
                                <button
                                  onClick={() => handleEditDispatch(d)}
                                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors font-bold text-[10px]"
                                >
                                  Edit Dispatch
                                </button>
                                {d.machineId && d.machineId !== "INDEPENDENT" && (
                                  <button
                                    onClick={() => {
                                      setBreakdownDispatch(d);
                                      setReplacementMachineId("");
                                      setSwapDriverId("");
                                      setDowntimeHours(3);
                                      setDowntimeCredit(1500);
                                      setShowBreakdownModal(true);
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1 font-bold text-[10px]"
                                  >
                                    <Wrench className="w-3 h-3" /> Swap Machine
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(filteredDispatches.reduce((acc: any, d: any) => {
            const key = d.jobGroupId || d.id;
            if (!acc[key]) acc[key] = { ...d, childDispatches: [d] };
            else acc[key].childDispatches.push(d);
            return acc;
          }, {})).map((group: any) => (
            <div
              key={group.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-base">{group.customer?.name}</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {group.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> {group.location}
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="text-amber-400 font-bold mb-2">Job Assets:</div>
                  {group.childDispatches.map((d: any) => (
                    <div key={d.id} className="pt-2 border-t border-slate-800 first:pt-0 first:border-0">
                      <div><strong>Machine:</strong> {d.machine?.machineId || "Independent"}</div>
                      <div><strong>Driver:</strong> {d.driver?.name || "N/A"}</div>
                      {d.vehicle && <div><strong>Vehicle:</strong> {d.vehicle.licensePlate} ({d.vehicle.type})</div>}
                      <div><strong>Main Caller:</strong> {d.mainHelperName || d.mainHelper?.name || "Direct"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                {group.invoice ? (
                  <button
                    onClick={() => router.push(`/admin/billing/${group.invoice.id}`)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    View Bill #{group.invoice.billNumber}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateBill(group.id)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      Generate Group Bill
                    </button>
                    <button
                      onClick={() => {
                        const primaryRow = group.childDispatches.find((d: any) => d.isPrimaryBillingRow) || group.childDispatches[0];
                        setFinalizingDispatch(primaryRow);
                        setFinalWorkType(primaryRow.workType || "NORMAL");
                        setAdjustedOperatorRate(primaryRow.operatorDailyRate || "");
                        setAdjustedCustomerCharge(primaryRow.customerCharge || "");
                        setAdjustedToolRent(primaryRow.toolRent || "");
                      }}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      Edit Group Bill
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}

      {showNewModal && (
        <CreateDispatchModalV2
          onClose={() => setShowNewModal(false)}
          machines={machines}
          employees={employees}
          tools={tools}
          vehicles={vehicles}
          customers={customersList}
        />
      )}

      {/* QUICK INLINE ADD CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain">
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

      {showBreakdownModal && breakdownDispatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                Report Machine Breakdown & Swap
              </h3>
              <button onClick={() => setShowBreakdownModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!replacementMachineId) {
                  alert("Please select a replacement machine.");
                  return;
                }
                setErrorMsg(null);
                setSuccessMsg(null);
                startTransition(async () => {
                  try {
                    const res = await fetch("/api/staff/dispatch/breakdown", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        dispatchId: breakdownDispatch.id,
                        brokenMachineId: breakdownDispatch.machineId,
                        replacementMachineId,
                        driverId: swapDriverId || undefined,
                        downtimeHours: Number(downtimeHours),
                        downtimeCredit: Number(downtimeCredit),
                      }),
                    });

                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "Request failed");

                    setSuccessMsg("Breakdown swap processed! Yard ticket and relocation task created.");
                    setShowBreakdownModal(false);
                    setBreakdownDispatch(null);
                    window.location.reload();
                  } catch (err: any) {
                    setErrorMsg("Breakdown Swap failed: " + err.message);
                  }
                });
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Broken Machine</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-400 font-bold">
                  {breakdownDispatch.machine?.machineId || "No Machine ID"} ({breakdownDispatch.machine?.type || "General"})
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Replacement Machine *</label>
                <select
                  value={replacementMachineId}
                  onChange={(e) => setReplacementMachineId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-bold"
                  required
                >
                  <option value="">-- Choose available machine --</option>
                  {machines
                    .filter((m) => m.status === "AVAILABLE" && m.id !== breakdownDispatch.machineId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machineId} ({m.type || "General"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Assign Driver for Swap Logistics</label>
                <select
                  value={swapDriverId}
                  onChange={(e) => setSwapDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-bold"
                >
                  <option value="">-- Choose driver --</option>
                  {employees
                    .filter((e) => e.role === "DRIVER" || e.role === "OWNER" || e.role === "STAFF")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Downtime Hours</label>
                  <input
                    type="number"
                    value={downtimeHours}
                    onChange={(e) => setDowntimeHours(Number(e.target.value))}
                    min={0}
                    max={24}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Downtime Billing Credit (â‚¹)</label>
                  <input
                    type="number"
                    value={downtimeCredit}
                    onChange={(e) => setDowntimeCredit(Number(e.target.value))}
                    min={0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBreakdownModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  Confirm Swap
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
                  placeholder="e.g. Agreed to â‚¹500 discount on hydraulic charge..."
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
            
            {selectedEvent.siteDisbursements?.length > 0 && (
              <div className="border-t border-slate-800 pt-4 mt-4 mb-4">
                {selectedEvent.siteDisbursements.map((d: any) => (
                  <SiteLaborDisbursementReview key={d.id} disbursement={d} />
                ))}
              </div>
            )}

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

      {/* FINALIZE SCOPE & INVOICE MODAL */}
      {finalizingDispatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckCircle2 className="w-5 h-5" />
              Finalize Post-Work Scope (Job Group)
            </h3>
            <p className="text-xs text-slate-400 mt-2 border-b border-slate-800 pb-4">
              Update the actual work performed, tools rented, and total customer charge before locking this invoice.
            </p>
            <form onSubmit={handleFinalizeScope} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Final Work Type</label>
                <select
                  value={finalWorkType}
                  onChange={(e) => setFinalWorkType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                >
                  <option value="NORMAL">Normal Duty</option>
                  <option value="TROLLY">With Trolly (Heavy)</option>
                  <option value="LATE">Late Night / Overtime</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Total Tool Rent (â‚¹)</label>
                  <input
                    type="number"
                    value={adjustedToolRent}
                    onChange={(e) => setAdjustedToolRent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="e.g. 200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Operator Pay (â‚¹)</label>
                  <input
                    type="number"
                    value={adjustedOperatorRate}
                    onChange={(e) => setAdjustedOperatorRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="e.g. 900"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-1">Total Customer Bill (â‚¹)</label>
                <input
                  type="number"
                  value={adjustedCustomerCharge}
                  onChange={(e) => setAdjustedCustomerCharge(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                  placeholder="e.g. 2800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Audit Closing Notes *</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. 'Completed 2 hours late. Charged extra â‚¹300 for trolley + 2 hours.'"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFinalizingDispatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                >
                  {isPending ? "Locking..." : "Lock Final Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tool Return Verification Modal — upgraded per-tool checklist */}
      {toolReturnDispatch && (
        <ToolReturnModal
          dispatch={toolReturnDispatch}
          onClose={() => setToolReturnDispatch(null)}
          onSuccess={() => {
            setToolReturnDispatch(null);
            window.location.reload();
          }}
        />
      )}
      {/* STAFF LOGISTICS OVERRIDE MODAL */}
      {overrideModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Staff Logistics Override
            </h3>
            <p className="text-xs text-slate-400 mt-2 border-b border-slate-800 pb-4">
              Manually override the driver's verification for <strong>{overrideModal.itemName}</strong>.
              <br/>Current Status: <span className="text-white font-bold">{overrideModal.currentStatus ? "CONFIRMED" : "PENDING/MISSING"}</span>
            </p>

            <form onSubmit={handleLogisticsOverride} className="mt-5 space-y-4">
              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl">
                <p className="text-[11px] text-red-400 italic">
                  Warning: You are overriding field data. This action is logged for the Admin. Are you sure you want to change this status to <strong>{!overrideModal.currentStatus ? "CONFIRMED" : "PENDING/MISSING"}</strong>?
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Force Status Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {billingDispatch && (
        <DispatchBillingModal
          isOpen={!!billingDispatch}
          onClose={() => setBillingDispatch(null)}
          dispatch={billingDispatch}
          onSuccess={() => {
            alert("Bill successfully saved!");
            window.location.reload();
          }}
        />
      )}

    </div>
  );
}







function CrewAssignmentManager({ d, employees }: { d: any, employees: any[] }) {
  const CREW_ROLES = [
    "MIXER_OPERATOR","HYDRAULIC_OPERATOR","VIBRATOR_OPERATOR",
    "LIFT_OPERATOR","WORKER_LEADER","SUB_LEADER","DRIVER",
    "HELPER","PANI_HELPER","TROLLY_1_WHEEL","TROLLY_2_WHEEL","P_VIBRATOR"
  ];
  const roleColors: Record<string, { bg: string; text: string; border: string; avatar: string }> = {
    MIXER_OPERATOR:     { bg:"bg-orange-950/60",  text:"text-orange-300",  border:"border-orange-500/40",  avatar:"bg-orange-500/30 text-orange-300" },
    HYDRAULIC_OPERATOR: { bg:"bg-amber-950/60",   text:"text-amber-300",   border:"border-amber-500/40",   avatar:"bg-amber-500/30 text-amber-300" },
    VIBRATOR_OPERATOR:  { bg:"bg-yellow-950/60",  text:"text-yellow-300",  border:"border-yellow-500/40",  avatar:"bg-yellow-500/30 text-yellow-300" },
    LIFT_OPERATOR:      { bg:"bg-blue-950/60",    text:"text-blue-300",    border:"border-blue-500/40",    avatar:"bg-blue-500/30 text-blue-300" },
    WORKER_LEADER:      { bg:"bg-emerald-950/60", text:"text-emerald-300", border:"border-emerald-500/40", avatar:"bg-emerald-500/30 text-emerald-300" },
    SUB_LEADER:         { bg:"bg-teal-950/60",    text:"text-teal-300",    border:"border-teal-500/40",    avatar:"bg-teal-500/30 text-teal-300" },
    DRIVER:             { bg:"bg-cyan-950/60",    text:"text-cyan-300",    border:"border-cyan-500/40",    avatar:"bg-cyan-500/30 text-cyan-300" },
    HELPER:             { bg:"bg-slate-800/60",   text:"text-slate-300",   border:"border-slate-600/40",   avatar:"bg-slate-600/50 text-slate-300" },
    PANI_HELPER:        { bg:"bg-sky-950/60",     text:"text-sky-300",     border:"border-sky-500/40",     avatar:"bg-sky-500/30 text-sky-300" },
    TROLLY_1_WHEEL:     { bg:"bg-violet-950/60",  text:"text-violet-300",  border:"border-violet-500/40",  avatar:"bg-violet-500/30 text-violet-300" },
    TROLLY_2_WHEEL:     { bg:"bg-purple-950/60",  text:"text-purple-300",  border:"border-purple-500/40",  avatar:"bg-purple-500/30 text-purple-300" },
    P_VIBRATOR:         { bg:"bg-rose-950/60",    text:"text-rose-300",    border:"border-rose-500/40",    avatar:"bg-rose-500/30 text-rose-300" },
  };

  const [editingCrewId, setEditingCrewId] = React.useState<string|null>(null);
  const [editRole, setEditRole] = React.useState("");
  const [editRate, setEditRate] = React.useState("");
  const [addingCrew, setAddingCrew] = React.useState(false);
  const [newEmpId, setNewEmpId] = React.useState("");
  const [newRole, setNewRole] = React.useState("HELPER");
  const [newRate, setNewRate] = React.useState("");
  const [crewSaving, setCrewSaving] = React.useState(false);
  const [localCrew, setLocalCrew] = React.useState<any[]>(d.crewAssignments || []);

  const getWageForRole = (emp: any, role: string) => {
    if (!emp) return 0;
    const isSubcontractor = emp.operatorType === "SUBCONTRACTOR";
    const explicitRate = emp.roleRates?.find((rr: any) => rr.crewRole === role)?.wagePerDay;

    let baseWage: number;
    if (explicitRate != null) {
      baseWage = Number(explicitRate);
    } else if (isSubcontractor) {
      baseWage = Number(emp.baseDailyWage ?? OUTSIDE_WORKER_FLAT_WAGE);
    } else {
      baseWage = Number(COMPANY_WORKER_ROLE_WAGES[role] ?? emp.baseDailyWage ?? 1100);
    }

    if (role === "LIFT_OPERATOR") {
      const floors = Math.max(1, Number(d.liftFloors) || 1);
      return calculateLiftOperatorWage(baseWage, floors);
    }
    return baseWage;
  };

  const saveEdit = async (ca: any) => {
    setCrewSaving(true);
    try {
      await fetch(`/api/staff/dispatch/${d.id}/crew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [{
            employeeId: ca.employee?.id || undefined,
            contractorId: ca.contractor?.id || undefined,
            assignedRole: editRole,
            lockedWageRate: Number(editRate),
            headcount: ca.headcount || 1,
          }]
        })
      });
      setLocalCrew(prev => prev.map(x => x.id === ca.id
        ? { ...x, assignedRole: editRole, lockedWageRate: Number(editRate) }
        : x
      ));
      setEditingCrewId(null);
    } finally { setCrewSaving(false); }
  };

  const removeCrew = async (ca: any) => {
    if (!confirm(`Remove ${ca.employee?.name || "this member"} from this dispatch?`)) return;
    setCrewSaving(true);
    try {
      await fetch(`/api/staff/dispatch/${d.id}/crew`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: ca.id })
      });
      setLocalCrew(prev => prev.filter(x => x.id !== ca.id));
    } finally { setCrewSaving(false); }
  };

  const addCrew = async () => {
    if (!newEmpId || !newRole || !newRate) return;
    setCrewSaving(true);
    try {
      const res = await fetch(`/api/staff/dispatch/${d.id}/crew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [{
            employeeId: newEmpId,
            assignedRole: newRole,
            lockedWageRate: Number(newRate),
            headcount: 1,
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        const emp = employees.find((e: any) => e.id === newEmpId);
        setLocalCrew(prev => [...prev, {
          id: data.upserted?.[0]?.id || Date.now().toString(),
          assignedRole: newRole,
          lockedWageRate: Number(newRate),
          headcount: 1,
          employee: emp ? { id: emp.id, name: emp.name, role: emp.role, profilePhotoUrl: emp.profilePhotoUrl } : null,
        }]);
        setAddingCrew(false);
        setNewEmpId(""); setNewRole("HELPER"); setNewRate("");
      }
    } finally { setCrewSaving(false); }
  };

  return (
    <div className="mt-2 space-y-2">
      {localCrew.length > 0 && (
        <>
          <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">
            Crew Assigned · {localCrew.length}
          </span>
          <div className="flex flex-wrap gap-2">
            {localCrew.map((ca: any) => {
              const c = roleColors[ca.assignedRole] || roleColors.HELPER;
              const name = ca.employee?.name || ca.contractor?.name || "Unknown";
              const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              const photo = ca.employee?.profilePhotoUrl;
              const isEditing = editingCrewId === ca.id;
              const isSub = ca.employee?.operatorType === "SUBCONTRACTOR" || Boolean(ca.contractor);
              return (
                <div key={ca.id} className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border ${c.bg} ${c.border} min-w-[72px] max-w-[82px] group`}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm overflow-hidden ${c.avatar}`}>
                    {photo
                      ? <img src={photo} alt={name} className="w-full h-full object-cover rounded-full" />
                      : <span>{initials}</span>}
                  </div>
                  {/* Name & Worker Type */}
                  <span className="text-white font-bold text-[10px] text-center leading-tight line-clamp-2 w-full">{name}</span>
                  <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded border ${
                    isSub
                      ? "bg-violet-950/80 text-violet-300 border-violet-500/30"
                      : "bg-emerald-950/80 text-emerald-300 border-emerald-500/30"
                  }`}>
                    {isSub ? "🌐 Outside" : "🏢 Company"}
                  </span>

                  {isEditing ? (
                    /* ── EDIT MODE ── */
                    <div className="w-full space-y-1 mt-0.5">
                      <select
                        value={editRole}
                        onChange={e => {
                          const selected = e.target.value;
                          setEditRole(selected);
                          const emp = employees.find((x: any) => x.id === ca.employee?.id);
                          const roleWage = getWageForRole(emp, selected);
                          if (roleWage) setEditRate(String(roleWage));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-[9px] rounded-md px-1 py-0.5 outline-none"
                      >
                        {CREW_ROLES.map(r => (
                          <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                        ))}
                      </select>
                      {editRole === "LIFT_OPERATOR" && (
                        <p className="text-[9px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded leading-tight">
                          Fl. {d.liftFloors || 1}: +₹{Math.max(0, (d.liftFloors || 1) - 1) * 100}
                        </p>
                      )}
                      <input
                        type="number"
                        value={editRate}
                        onChange={e => setEditRate(e.target.value)}
                        placeholder="Rate ₹"
                        className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-[9px] rounded-md px-1 py-0.5 outline-none"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(ca)}
                          disabled={crewSaving}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md py-0.5 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingCrewId(null)}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md py-0.5 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── VIEW MODE ── */
                    <>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${c.text} ${c.border} text-center leading-tight`}>
                        {ca.assignedRole === "LIFT_OPERATOR"
                          ? `LIFT (Fl. ${d.liftFloors || 1})`
                          : ca.assignedRole.replace(/_/g," ")}
                      </span>
                      {ca.lockedWageRate > 0 && (
                        <span className="text-emerald-400 font-mono font-black text-[9px]">
                          ₹{Number(ca.lockedWageRate).toLocaleString("en-IN")}
                        </span>
                      )}
                      {/* Edit / Remove — visible on hover */}
                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                        <button
                          onClick={() => { setEditingCrewId(ca.id); setEditRole(ca.assignedRole); setEditRate(String(ca.lockedWageRate || "")); }}
                          className="w-4 h-4 bg-slate-700/90 rounded flex items-center justify-center text-slate-300 hover:text-white"
                          title="Edit rate / role"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => removeCrew(ca)}
                          className="w-4 h-4 bg-rose-900/80 rounded flex items-center justify-center text-rose-400 hover:text-rose-200"
                          title="Remove from dispatch"
                        >
                          <UserMinus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </>
                  )}
                  {ca.headcount > 1 && (
                    <span className="absolute -top-1.5 -left-1.5 bg-slate-700 border border-slate-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {ca.headcount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Crew Row */}
      {addingCrew ? (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Add Crew Member</p>
          <select
            value={newEmpId}
            onChange={e => {
              const selectedId = e.target.value;
              setNewEmpId(selectedId);
              const emp = employees.find((x: any) => x.id === selectedId);
              const roleToSet = emp?.defaultCrewRole || (emp?.capableRoles?.[0]) || newRole;
              if (roleToSet) setNewRole(roleToSet);
              const roleWage = getWageForRole(emp, roleToSet);
              if (roleWage) setNewRate(String(roleWage));
            }}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            <option value="">— Select Employee —</option>
            {employees
              .filter((e: any) => !localCrew.some((ca: any) => ca.employee?.id === e.id))
              .map((e: any) => {
                const isSub = e.operatorType === "SUBCONTRACTOR";
                const typePrefix = isSub ? "🌐 [Outside]" : "🏢 [Company]";
                const rolesDisplay = e.capableRoles && e.capableRoles.length > 0
                  ? e.capableRoles.map((r: string) => r.replace(/_/g, " ")).join(", ")
                  : e.role;
                const rateHint = isSub
                  ? `Flat ₹${e.baseDailyWage || OUTSIDE_WORKER_FLAT_WAGE}/d`
                  : `Role rates`;
                return (
                  <option key={e.id} value={e.id}>
                    {typePrefix} {e.name} — [{rolesDisplay}] ({rateHint})
                  </option>
                );
              })}
          </select>
          <select
            value={newRole}
            onChange={e => {
              const r = e.target.value;
              setNewRole(r);
              const emp = employees.find((x: any) => x.id === newEmpId);
              const roleWage = getWageForRole(emp, r);
              if (roleWage) setNewRate(String(roleWage));
            }}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            {CREW_ROLES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g," ")}</option>
            ))}
          </select>
          {newRole === "LIFT_OPERATOR" && (
            <p className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
              🏗️ Lift Floor {d.liftFloors || 1}: Base + ₹{Math.max(0, (d.liftFloors || 1) - 1) * 100} (+₹100/extra floor)
            </p>
          )}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs font-bold">₹</span>
            <input
              type="number"
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              placeholder="Daily rate"
              className="flex-1 bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs rounded-lg px-2 py-1.5 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addCrew}
              disabled={crewSaving || !newEmpId || !newRate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg py-1.5 flex items-center justify-center gap-1"
            >
              {crewSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Add
            </button>
            <button
              onClick={() => { setAddingCrew(false); setNewEmpId(""); setNewRole("HELPER"); setNewRate(""); }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs rounded-lg py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingCrew(true)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors mt-1"
        >
          <UserPlus className="w-3 h-3" /> Add Crew Member
        </button>
      )}
    </div>
  );
}