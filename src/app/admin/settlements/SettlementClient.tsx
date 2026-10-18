'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculateOperatorSettlement,
  calculateMultiPlayerBreakdown,
  createManualAdjustment,
  approveManualAdjustment,
  generateSettlement,
  finalizeSettlement,
} from '@/actions/settlement';
import {
  Calculator,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  Lock,
  PlusCircle,
  Clock,
  Loader2,
  FileText,
  UserCheck,
  AlertTriangle,
  Calendar,
  Users,
  TrendingUp,
  Edit3,
  Save,
  ChevronRight,
  UserPlus,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface SettlementClientProps {
  operators: any[]; // All players: Operators, Mestris, Workers, Drivers
  pendingAdjustments: any[];
  recentSettlements: any[];
  userRole: string;
}

export default function SettlementClient({
  operators,
  pendingAdjustments,
  recentSettlements,
  userRole,
}: SettlementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Top-level Navigation Tabs (Defaulting to Weekend Settlement Hub for exact Physical Notebook reconciliation)
  const [viewMode, setViewMode] = useState<'MULTI_DAY' | 'MULTI_WEEK' | 'SINGLE_CALC'>('MULTI_WEEK');

  // Day-Based State (Daily Ledger)
  const [dayDate, setDayDate] = useState('2026-07-08');
  const [dayRoleFilter, setDayRoleFilter] = useState<'ALL' | 'OPERATOR' | 'WORKER' | 'DRIVER'>('ALL');

  // Week-Based State (Weekend Settlement Hub - Exact Physical Notebook Week: July 5 to July 11, 2026)
  const [weekStartDate, setWeekStartDate] = useState('2026-07-05');
  const [weekEndDate, setWeekEndDate] = useState('2026-07-11');
  const [weekRoleFilter, setWeekRoleFilter] = useState<'ALL' | 'OPERATOR' | 'WORKER' | 'DRIVER'>('ALL');

  // Multi-Player Breakdown Result (Shared for Day or Week)
  const [multiBreakdown, setMultiBreakdown] = useState<{
    players: any[];
    bookingHistory?: any[];
    allEmployees: any[];
    totals: any;
  } | null>(null);

  // Custom Amount Overrides per Player ID: { playerId: { earned: number, advances: number, bonuses: number } }
  const [customPayOverrides, setCustomPayOverrides] = useState<
    Record<string, { earned?: number; advances?: number; bonuses?: number }>
  >({});

  // Single Operator Calculator State (Tab 3)
  const [selectedOperatorId, setSelectedOperatorId] = useState(operators[0]?.id || '');
  const [singleStartDate, setSingleStartDate] = useState(
    new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
  );
  const [singleEndDate, setSingleEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculationResult, setCalculationResult] = useState<any | null>(null);

  // Add Bonus/Penalty Modal state
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjPlayerId, setAdjPlayerId] = useState(operators[0]?.id || '');
  const [adjType, setAdjType] = useState<'BONUS' | 'PENALTY'>('BONUS');
  const [adjAmount, setAdjAmount] = useState<number | string>('');
  const [adjReason, setAdjReason] = useState('');
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);

  // Add Custom Player Row Modal (if player wasn't automatically pulled into today's sheet)
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newRowPlayerId, setNewRowPlayerId] = useState(operators[0]?.id || '');
  const [newRowCustomPay, setNewRowCustomPay] = useState<number | string>('');
  const [newRowJobNote, setNewRowJobNote] = useState('');

  // Automatically fetch multi-player sheet when tab or dates change
  useEffect(() => {
    if (viewMode === 'MULTI_DAY') {
      handleFetchMultiBreakdown(dayDate, dayDate);
    } else if (viewMode === 'MULTI_WEEK') {
      handleFetchMultiBreakdown(weekStartDate, weekEndDate);
    }
  }, [viewMode, dayDate, weekStartDate, weekEndDate]);

  const checkUnsavedEdits = (proceed: () => void) => {
    if (Object.keys(customPayOverrides).length > 0) {
      if (window.confirm("You have unsaved edits. Are you sure you want to change the date/tab and lose them?")) {
        setCustomPayOverrides({});
        proceed();
      }
    } else {
      proceed();
    }
  };

  const handleFetchMultiBreakdown = (start: string, end: string, checkDirty = true) => {
    if (checkDirty && Object.keys(customPayOverrides).length > 0) {
      if (!window.confirm("You have unsaved edits. Are you sure you want to change the date and lose them?")) {
        return;
      }
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await calculateMultiPlayerBreakdown({ startDate: start, endDate: end });
      if (!res.success || !(res as any).data) {
        setErrorMsg((res as any).error || 'Failed to fetch player settlements.');
      } else {
        setMultiBreakdown((res as any).data);
        // Clear old overrides when loading new period
        setCustomPayOverrides({});
      }
    });
  };

  const handleCustomPayChange = (playerId: string, field: 'earned' | 'advances' | 'bonuses', val: string) => {
    const num = val === '' ? undefined : Number(val);
    setCustomPayOverrides((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: num,
      },
    }));
  };

  const getPlayerEffectiveNumbers = (player: any) => {
    const overrides = customPayOverrides[player.playerId] || {};
    const earned = overrides.earned !== undefined ? overrides.earned : (player.laborEarned || 0);
    const baseLiabilities = (player.advances || 0) + (player.cashHeld || 0) + (player.penalties || 0);
    const manualDeduction = overrides.advances !== undefined ? overrides.advances : 0;
    const advances = baseLiabilities + manualDeduction;
    const bonuses = overrides.bonuses !== undefined ? overrides.bonuses : (player.approvedBonuses || 0);
    const net = (earned + bonuses) - advances;
    return { earned, advances, bonuses, net, baseLiabilities, manualDeduction };
  };

  const handleSingleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!selectedOperatorId) return;

    startTransition(async () => {
      const res = await calculateOperatorSettlement({
        operatorId: selectedOperatorId,
        startDate: singleStartDate,
        endDate: singleEndDate,
      });

      if (!(res as any).success) {
        setErrorMsg((res as any).error || 'Failed to calculate settlement figures.');
      } else {
        setCalculationResult((res as any).data);
      }
    });
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || Number(adjAmount) <= 0) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createManualAdjustment({
        employeeId: adjPlayerId,
        amount: Number(adjAmount),
        type: adjType,
        reason: adjReason,
        date: adjDate,
      });

      if (!(res as any).success) {
        setErrorMsg((res as any).error || 'Failed to create adjustment.');
      } else {
        setSuccessMsg(
          Number(adjAmount) <= 500 || userRole === 'OWNER'
            ? '✅ Adjustment logged and AUTO-APPROVED (Delegated Authority threshold met).'
            : '⏳ Adjustment > ₹500 submitted as PENDING. Requires OWNER approval.'
        );
        setShowAdjModal(false);
        setAdjAmount('');
        setAdjReason('');
        router.refresh();
      }
    });
  };

  const handleApproveAdjustment = async (adjustmentId: string) => {
    if (userRole !== 'OWNER') {
      alert('Security Guardrail: Only OWNER can approve manual adjustments over ₹500');
      return;
    }

    startTransition(async () => {
      const res = await approveManualAdjustment({ adjustmentId });
      if (!(res as any).success) {
        alert((res as any).error || 'Approval failed.');
      } else {
        router.refresh();
      }
    });
  };

  const handleGenerateDraft = async (opId?: string, endDt?: string) => {
    const targetId = opId || selectedOperatorId;
    const targetDate = endDt || singleEndDate;
    if (!targetId || !targetDate) return;

    // Extract exact custom overrides or effective numbers for this targetId
    let targetPlayer = multiBreakdown?.players.find((p) => p.playerId === targetId);
    if (!targetPlayer) {
      const emp = operators.find((o) => o.id === targetId);
      if (emp) {
        targetPlayer = {
          playerId: emp.id,
          laborEarned: 0,
          advances: 0,
          cashHeld: 0,
          penalties: 0,
          approvedBonuses: 0,
        };
      }
    }

    const effective = targetPlayer ? getPlayerEffectiveNumbers(targetPlayer) : undefined;

    startTransition(async () => {
      const res = await generateSettlement({
        operatorId: targetId,
        weekEnding: targetDate,
        customEarned: effective?.earned,
        customAdvances: effective?.advances,
        customBonuses: effective?.bonuses,
      });

      if (!(res as any).success) {
        setErrorMsg((res as any).error || 'Failed to generate draft settlement.');
      } else {
        setSuccessMsg('✅ Draft Settlement generated and saved successfully!');
        router.refresh();
      }
    });
  };

  const handleFinalizeLock = async (settlementId: string) => {
    if (userRole !== 'OWNER') {
      alert('Security Guardrail: Only OWNER can finalize and lock settlements immutably.');
      return;
    }

    if (!confirm('⚠️ AUDIT LOCK WARNING: Once finalized, this settlement cannot be edited or recalculated. All pending advances and adjustments for this player will be marked as SETTLED. Confirm?')) {
      return;
    }

    startTransition(async () => {
      const res = await finalizeSettlement({ settlementId, currentVersion: 1 });
      if (!(res as any).success) {
        alert((res as any).error || 'Finalization failed.');
      } else {
        alert('🔒 Settlement locked immutably for payroll!');
        router.refresh();
      }
    });
  };

  const handleAddCustomPlayerRow = () => {
    if (!newRowPlayerId) return;
    const emp = operators.find((o) => o.id === newRowPlayerId);
    if (!emp || !multiBreakdown) return;

    // Check if player already exists in breakdown
    const existingIndex = multiBreakdown.players.findIndex((p) => p.playerId === newRowPlayerId);
    if (existingIndex >= 0) {
      const existing = multiBreakdown.players[existingIndex];
      const customPay = Number(newRowCustomPay || emp.dailyRate || 1000);
      existing.laborEarned += customPay;
      if (newRowJobNote.trim()) {
        existing.jobDescriptions.push(`[Manual Entry] ${newRowJobNote.trim()} (+₹${customPay})`);
      }
      setMultiBreakdown({
        ...multiBreakdown,
        players: [...multiBreakdown.players],
      });
    } else {
      const customPay = Number(newRowCustomPay || emp.dailyRate || 1000);
      const newPlayer = {
        playerId: emp.id,
        playerName: emp.name,
        playerRole: emp.role,
        phone: emp.phone || '',
        shiftsCount: 1,
        jobDescriptions: [newRowJobNote.trim() ? `[Manual Entry] ${newRowJobNote.trim()} (+₹${customPay})` : `[Manual Entry] Custom Work (+₹${customPay})`],
        laborEarned: customPay,
        approvedBonuses: 0,
        penalties: 0,
        cashHeld: 0,
        advances: 0,
        netPayable: customPay,
      };
      setMultiBreakdown({
        ...multiBreakdown,
        players: [newPlayer, ...multiBreakdown.players],
      });
    }

    setShowAddPlayerModal(false);
    setNewRowCustomPay('');
    setNewRowJobNote('');
    setSuccessMsg(`✅ Custom payment entry added for ${emp.name}!`);
  };

  // Filter players based on selected role tab
  const getFilteredPlayers = () => {
    if (!multiBreakdown?.players) return [];
    const filter = viewMode === 'MULTI_DAY' ? dayRoleFilter : weekRoleFilter;
    if (filter === 'ALL') return multiBreakdown.players;
    return multiBreakdown.players.filter((p) => p.playerRole === filter);
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TOP NAVIGATION TABS (Physical Ledger Modes) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => checkUnsavedEdits(() => setViewMode('MULTI_DAY'))}
          className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            viewMode === 'MULTI_DAY'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          📅 Day-Based Settlements (Daily Ledger)
        </button>

        <button
          type="button"
          onClick={() => checkUnsavedEdits(() => setViewMode('MULTI_WEEK'))}
          className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            viewMode === 'MULTI_WEEK'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          📊 Week-Based Master Sheet (Weekend Hub)
        </button>

        <button
          type="button"
          onClick={() => checkUnsavedEdits(() => setViewMode('SINGLE_CALC'))}
          className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            viewMode === 'SINGLE_CALC'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          🔍 Single Operator Audit Calculator
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdjModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            + Log Bonus / Advance (`₹`)
          </button>
        </div>
      </div>

      {/* ==================================================================================== */}
      {/* TAB 1 & TAB 2: DAY-BASED OR WEEK-BASED MULTI-PLAYER SHEET (EACH PLAYER & CUSTOM PAY) */}
      {/* ==================================================================================== */}
      {(viewMode === 'MULTI_DAY' || viewMode === 'MULTI_WEEK') && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                {viewMode === 'MULTI_DAY' ? (
                  <>
                    <Calendar className="w-6 h-6 text-amber-400" />
                    Daily Player Ledger (`Day-Based Breakdown`)
                  </>
                ) : (
                  <>
                    <Users className="w-6 h-6 text-emerald-400" />
                    Weekend Player Sheet (`Week-Based Breakdown`)
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {viewMode === 'MULTI_DAY'
                  ? 'Shows all operators, mestri leaders, and workers for this date. Custom-edit any player’s Varavu (Earned) or Chilavu right in the table!'
                  : 'Master weekly settlement sheet. Verify custom totals across all players and lock weekend payroll.'}
              </p>
            </div>

            {/* Date Pickers */}
            <div className="flex flex-wrap items-center gap-3">
              {viewMode === 'MULTI_DAY' ? (
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 pl-2">Date (`തീയതി`):</span>
                  <input
                    type="date"
                    value={dayDate}
                    onChange={(e) => checkUnsavedEdits(() => setDayDate(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                  />
                  <button
                    onClick={() => handleFetchMultiBreakdown(dayDate, dayDate)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs shadow"
                  >
                    Load Day
                  </button>
                  <button
                    onClick={() => {
                      checkUnsavedEdits(() => {
                        setDayDate('2026-07-08');
                        handleFetchMultiBreakdown('2026-07-08', '2026-07-08');
                      });
                    }}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1.5 rounded-xl text-[11px] font-black shadow"
                  >
                    📅 Notebook Day (08 Jul)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 pl-2">From:</span>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => checkUnsavedEdits(() => setWeekStartDate(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">To (`Week Ending`):</span>
                  <input
                    type="date"
                    value={weekEndDate}
                    onChange={(e) => checkUnsavedEdits(() => setWeekEndDate(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none"
                  />
                  <button
                    onClick={() => handleFetchMultiBreakdown(weekStartDate, weekEndDate)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs shadow"
                  >
                    Load Week
                  </button>
                  <button
                    onClick={() => {
                      checkUnsavedEdits(() => {
                        setWeekStartDate('2026-07-05');
                        setWeekEndDate('2026-07-11');
                        handleFetchMultiBreakdown('2026-07-05', '2026-07-11');
                      });
                    }}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-[11px] font-black shadow"
                  >
                    📅 Notebook Week (05 Jul - 11 Jul)
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <UserPlus className="w-4 h-4" />
                + Add Player Custom Row
              </button>
            </div>
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Role:
            </span>
            {(['ALL', 'OPERATOR', 'WORKER', 'DRIVER'] as const).map((role) => {
              const current = viewMode === 'MULTI_DAY' ? dayRoleFilter : weekRoleFilter;
              return (
                <button
                  key={role}
                  onClick={() =>
                    viewMode === 'MULTI_DAY' ? setDayRoleFilter(role) : setWeekRoleFilter(role)
                  }
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                    current === role
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {role === 'ALL'
                    ? 'All Players (`എല്ലാവരും`)'
                    : role === 'OPERATOR'
                    ? 'Operators (`ഓപ്പറേറ്റർമാർ`)'
                    : role === 'WORKER'
                    ? 'Leaders / Mestris (`മേസ്തിരിമാർ`)'
                    : 'Drivers (`ഡ്രൈവർമാർ`)'}
                </button>
              );
            })}
          </div>

          {/* TOTALS SUMMARY BAR */}
          {multiBreakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-500 block">Total Players Active</span>
                <span className="text-base font-black text-white font-mono mt-0.5 block">
                  {getFilteredPlayers().length} Players
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-500 block">Total Varavu (`Earned`)</span>
                <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                  +₹{getFilteredPlayers().reduce((sum, p) => sum + getPlayerEffectiveNumbers(p).earned, 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-500 block">Approved Bonuses</span>
                <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                  +₹{getFilteredPlayers().reduce((sum, p) => sum + getPlayerEffectiveNumbers(p).bonuses, 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-500 block">Advances / Cash Held</span>
                <span className="text-base font-black text-red-400 font-mono mt-0.5 block">
                  -₹{getFilteredPlayers().reduce((sum, p) => sum + getPlayerEffectiveNumbers(p).advances, 0)}
                </span>
              </div>
              <div className="col-span-2 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-400 block">
                    Final Net {viewMode === 'MULTI_DAY' ? 'Day Payout' : 'Weekend Payout'}
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    ₹{getFilteredPlayers().reduce((sum, p) => sum + getPlayerEffectiveNumbers(p).net, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================================== */}
          {/* ZERO GROUP DAILY / WEEKLY WORKER WAGE STATEMENT (`Top Summary Notes from Photos`) */}
          {/* ==================================================================================== */}
          {multiBreakdown && multiBreakdown.players && multiBreakdown.players.length > 0 && (
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-amber-500/30 p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-amber-400 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    Zero Group Worker Daily & Weekly Wage Statement (`ഓരോരുത്തരുടെയും കൂലി കണക്ക്`)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Matches the physical summary boxes (e.g. <span className="font-mono text-amber-300 font-bold">Kaka (9) — ₹10,800 | Chottu (11) — ₹13,200</span>). Live summation across all daily shifts and leader crews.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-mono font-black text-amber-400">
                    Total Wages: ₹{getFilteredPlayers().reduce((sum, p) => sum + getPlayerEffectiveNumbers(p).earned, 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {getFilteredPlayers().map((p) => {
                  const numbers = getPlayerEffectiveNumbers(p);
                  // Extract daily/headcount rate from role
                  const isLeader = p.playerRole === 'WORKER';
                  const rateLabel = isLeader ? '₹1,200 / bhai' : 'Operator Rate';

                  return (
                    <div
                      key={p.playerId}
                      className="bg-slate-900/90 hover:bg-slate-800/80 p-4 rounded-2xl border border-slate-800 transition-all shadow-md flex flex-col justify-between gap-3 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-white truncate font-sans" title={p.playerName}>
                            {p.playerName}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                            p.playerRole === 'OPERATOR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            isLeader ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {isLeader ? 'MESTRI' : p.playerRole}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>Rate (`നിരക്ക്`): <strong className="text-slate-200 font-mono">{rateLabel}</strong></span>
                          <span>Shifts: <strong className="text-amber-400 font-mono">({p.shiftsCount})</strong></span>
                        </div>

                        {/* Split Crew Breakdown Badge (`Requirement 5`) */}
                        {p.isExternalLiability && (
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-2.5 py-1.5 text-[10px] text-purple-300 font-mono flex items-center justify-between mt-2">
                            <span>Internal: <strong className="text-white">{p.internalHeadCount} bhai</strong></span>
                            <span>Outside Paid: <strong className="text-amber-400">₹{p.outsideWagePaid || 0}</strong> ({p.externalHeadCount} out)</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Varavu (`Earned`)</span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            ₹{numbers.earned}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance (`നെറ്റ്`)</span>
                          <span className="text-base font-black font-mono text-white">
                            ₹{numbers.net}
                          </span>
                        </div>
                      </div>

                      {/* Connected Field Bookings Drawer (`AND THE BOOKING IS CONNECTED WITH STATEMENT PAGE`) */}
                      {p.linkedBookings && p.linkedBookings.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60 mt-1">
                          <details className="group/details">
                            <summary className="text-[10px] font-bold text-amber-400/90 hover:text-amber-300 cursor-pointer flex items-center justify-between select-none">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Connected Bookings ({p.linkedBookings.length})
                              </span>
                              <span className="text-xs font-mono transition-transform group-open/details:rotate-180">▼</span>
                            </summary>
                            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[10px] font-mono border border-slate-800/80 rounded-xl p-2 bg-slate-950/60">
                              {p.linkedBookings.map((lb: any, lbIdx: number) => (
                                <div key={lbIdx} className="flex flex-col gap-0.5 border-b border-slate-800/50 pb-1.5 last:border-0 last:pb-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-300 truncate font-sans max-w-[150px]" title={lb.site}>
                                      {lb.bookingNo} {lb.site}
                                    </span>
                                    <span className="text-emerald-400 font-black">₹{lb.earned}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-slate-400 text-[9px]">
                                    <span>{lb.date} • <span className="text-amber-400/80">{lb.rolePlayed}</span></span>
                                    {lb.outsideWorkers > 0 && (
                                      <span className="text-purple-300">Out: {lb.outsideWorkers} (₹{lb.outsidePaid})</span>
                                    )}
                                  </div>
                                  {lb.notes && <p className="text-slate-500 italic truncate text-[9px] font-sans">{lb.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================================================== */}
          {/* ZERO GROUP DOCUMENT REGISTER (ITEMIZED FIELD BOOKINGS & LABOR MATRIX FROM PHOTOS) */}
          {/* ==================================================================================== */}
          {multiBreakdown && multiBreakdown.bookingHistory && multiBreakdown.bookingHistory.length > 0 && (
            <div className="bg-slate-950/90 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    Zero Group Field Booking Register (`5/07/2026 – 11/07/2026 Physical Notebook Format`)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exact 6-column layout matching handwritten sheets (`നം. | തീയതി/സ്ഥലം | ഇനവിവരം | വരവ് ₹ | ചെലവ് ₹ | ബാലൻസ്/കുറിപ്പ്`).
                  </p>
                </div>
                <span className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-300 self-start sm:self-center">
                  Total Bookings: <strong className="text-amber-400">{multiBreakdown.bookingHistory.length}</strong>
                </span>
              </div>

              {/* MOBILE CARDS VIEW (PWA Mobile-First) */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {multiBreakdown.bookingHistory.map((booking: any, bIdx: number) => {
                  const itemLines = booking.itemLines || [];
                  const hasLines = itemLines.length > 0;

                  return (
                    <div
                      key={booking.id}
                      className="bg-slate-950/90 rounded-2xl border border-slate-800/80 p-4 space-y-3 shadow-lg"
                    >
                      {/* Card Header: Bill #, Date, Customer & Location */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-amber-400">({bIdx + 1})</span>
                            <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {booking.date}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                              Bill {booking.billNumber}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-100 text-sm">{booking.customerName}</h4>
                          <p className="text-[11px] text-slate-400 leading-tight">{booking.location}</p>
                        </div>
                      </div>

                      {/* Equipment Summary */}
                      <div className="bg-slate-900/60 rounded-xl p-2.5 text-xs border border-slate-800/50 flex items-center justify-between">
                        <span className="font-bold text-blue-400">{booking.machineSummary}</span>
                        <span className="text-slate-400 font-medium text-[11px]">{booking.workType}</span>
                      </div>

                      {/* Staff & Wage Breakdown */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">
                          Staff / Labor Breakdown (`ഇനവിവരം & വരവ്/ചെലവ്`)
                        </span>
                        {!hasLines ? (
                          <div className="flex items-center justify-between text-xs py-1 px-2 bg-slate-900/40 rounded-lg">
                            <span className="text-slate-400 font-bold">General Crew</span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-emerald-400 font-bold">₹{booking.totalBookingWage}</span>
                              <span className="text-amber-400 font-black">₹{booking.totalBookingWage}</span>
                            </div>
                          </div>
                        ) : (
                          itemLines.map((line: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-slate-900/40 rounded-xl p-2.5 space-y-1.5 border border-slate-800/40 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                      line.role === 'OPERATOR'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : line.role === 'MESTRI'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-purple-500/20 text-purple-400'
                                    }`}
                                  >
                                    {line.role === 'MESTRI' ? 'LEADER' : line.role}
                                  </span>
                                  <span className="font-bold text-white truncate">{line.itemDescription}</span>
                                </div>
                                <div className="font-mono font-bold text-xs shrink-0 flex items-center gap-2">
                                  <span className="text-emerald-400" title="Varavu (Rate)">
                                    +₹{line.rate || line.totalWage}
                                  </span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-amber-400" title="Chilavu (Wage)">
                                    -₹{line.totalWage}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800/30">
                                <span>Assigned: <strong className="text-slate-200">{line.assignedTo}</strong></span>
                                {line.quantity > 1 && (
                                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded">
                                    {line.quantity} bhai
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider font-sans">
                      <th className="py-3.5 px-3 w-16 text-center">നം. (`No.`)</th>
                      <th className="py-3.5 px-3.5 w-44">തീയതി & സ്ഥലം (`Date & Site`)</th>
                      <th className="py-3.5 px-3.5 min-w-[280px]">ഇനവിവരം (`Inavivaram — Equipment & Staff`)</th>
                      <th className="py-3.5 px-3.5 w-28 text-right font-mono text-emerald-400">വരവ് (`Varavu / Rate`)</th>
                      <th className="py-3.5 px-3.5 w-28 text-right font-mono text-amber-400">ചെലവ് (`Chilavu / Wage`)</th>
                      <th className="py-3.5 px-3.5 w-44 font-mono text-slate-300">ബാലൻസ് / കുറിപ്പ് (`Assigned To`)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {multiBreakdown.bookingHistory.map((booking: any, bIdx: number) => {
                      const itemLines = booking.itemLines || [];
                      const hasLines = itemLines.length > 0;

                      return (
                        <tr key={booking.id} className="hover:bg-slate-900/60 transition-all bg-slate-950/40">
                          {/* Column 1: Number */}
                          <td className="py-3 px-3 text-center font-black text-amber-400 align-top text-sm">
                            ({bIdx + 1})
                          </td>

                          {/* Column 2: Date & Customer/Site */}
                          <td className="py-3 px-3.5 align-top font-sans space-y-1">
                            <span className="block font-black text-white text-xs font-mono">{booking.date}</span>
                            <span className="block font-bold text-slate-200 text-sm leading-tight">{booking.customerName}</span>
                            <span className="block text-[11px] text-slate-400">{booking.location}</span>
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded font-bold uppercase text-slate-400">
                              Bill {booking.billNumber}
                            </span>
                          </td>

                          {/* Column 3: Inavivaram (Equipment / Work / Staff Lines) */}
                          <td className="py-3 px-3.5 align-top font-sans space-y-2">
                            <div className="text-xs font-bold text-blue-400 pb-1 border-b border-slate-800/60 flex items-center justify-between">
                              <span>Equipment: {booking.machineSummary}</span>
                              <span className="text-slate-500 font-normal">{booking.workType}</span>
                            </div>

                            {!hasLines ? (
                              <div className="text-slate-500 italic text-xs">No specific labor crews logged</div>
                            ) : (
                              itemLines.map((line: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/30 last:border-none">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                      line.role === 'OPERATOR' ? 'bg-blue-500/20 text-blue-400' :
                                      line.role === 'MESTRI' ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-purple-500/20 text-purple-400'
                                    }`}>
                                      {line.role === 'MESTRI' ? 'LEADER' : line.role}
                                    </span>
                                    <span className="font-bold text-white text-xs truncate">
                                      {line.itemDescription}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </td>

                          {/* Column 4: Varavu (Rate / Rent / Daily Rate) */}
                          <td className="py-3 px-3.5 align-top text-right font-mono font-bold text-emerald-400 space-y-2">
                            <div className="text-xs pb-1 border-b border-slate-800/60 text-slate-500 font-normal">Rate (`വരവ്`)</div>
                            {!hasLines ? (
                              <div>₹{booking.totalBookingWage}</div>
                            ) : (
                              itemLines.map((line: any, idx: number) => (
                                <div key={idx} className="py-1 border-b border-slate-800/30 last:border-none font-bold text-emerald-400">
                                  ₹{line.rate || line.totalWage}
                                </div>
                              ))
                            )}
                          </td>

                          {/* Column 5: Chilavu (Labor Cost / Calculated Wage) */}
                          <td className="py-3 px-3.5 align-top text-right font-mono font-black text-amber-400 space-y-2">
                            <div className="text-xs pb-1 border-b border-slate-800/60 text-slate-500 font-normal">Chilavu (`ചെലവ്`)</div>
                            {!hasLines ? (
                              <div>₹{booking.totalBookingWage}</div>
                            ) : (
                              itemLines.map((line: any, idx: number) => (
                                <div key={idx} className="py-1 border-b border-slate-800/30 last:border-none font-black text-amber-400">
                                  ₹{line.totalWage}
                                </div>
                              ))
                            )}
                          </td>

                          {/* Column 6: Balance / Note (Assigned Worker Name / Note) */}
                          <td className="py-3 px-3.5 align-top font-sans space-y-2">
                            <div className="text-xs pb-1 border-b border-slate-800/60 text-slate-500 font-normal">Assigned To (`കുറിപ്പ്`)</div>
                            {!hasLines ? (
                              <div className="text-slate-400 font-bold">General Crew</div>
                            ) : (
                              itemLines.map((line: any, idx: number) => (
                                <div key={idx} className="py-1 border-b border-slate-800/30 last:border-none font-bold text-white truncate flex items-center justify-between">
                                  <span title={line.assignedTo}>{line.assignedTo}</span>
                                  {line.quantity > 1 && (
                                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded">
                                      {line.quantity} bhai
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLAYER TABLE (EACH PAYMENT IS CUSTOM EACH PLAYER BASED) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Zero Group Player & Leader Payroll Matrix (`Custom Pay & Settlement Hub`)
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Verify or override individual Varavu/Chilavu before locking weekend settlement
              </span>
            </div>

          {isPending ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-sm font-bold">Calculating exact player breakdown...</span>
            </div>
          ) : !multiBreakdown || getFilteredPlayers().length === 0 ? (
            <div className="p-12 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <p className="text-sm font-bold">No active dispatches or players found for this date range.</p>
              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                + Add Custom Player Payment Entry Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MOBILE CARDS VIEW (PWA Mobile-First) */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {getFilteredPlayers().map((p) => {
                  const numbers = getPlayerEffectiveNumbers(p);
                  const hasOverrides = customPayOverrides[p.playerId] !== undefined;

                  return (
                    <div
                      key={p.playerId}
                      className="bg-slate-950/90 rounded-2xl border border-slate-800/80 p-4 space-y-4 shadow-xl"
                    >
                      {/* Player Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-3">
                        <div>
                          <h4 className="font-black text-white text-base">{p.playerName}</h4>
                          {p.phone && <p className="text-xs text-slate-400 font-mono mt-0.5">{p.phone}</p>}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase shrink-0 ${
                            p.playerRole === 'OPERATOR'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : p.playerRole === 'WORKER'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {p.playerRole === 'WORKER' ? 'MESTRI / LEADER' : p.playerRole}
                        </span>
                      </div>

                      {/* Shifts / Work Description */}
                      <div className="space-y-1 bg-slate-900/50 p-3 rounded-xl border border-slate-800/40 text-xs max-h-28 overflow-y-auto pr-1 font-sans">
                        {p.jobDescriptions.length === 0 ? (
                          <span className="text-slate-500 italic">No shifts logged directly</span>
                        ) : (
                          p.jobDescriptions.map((desc: string, idx: number) => (
                            <div key={idx} className="text-slate-300 font-medium leading-tight">
                              • {desc}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Custom Inputs Stack */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono">
                        {/* Varavu (Earned) */}
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-emerald-500/20 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">
                            Varavu (`Earned ₹`)
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-emerald-400 font-bold text-sm">+₹</span>
                            <input
                              type="number"
                              value={numbers.earned}
                              onChange={(e) => handleCustomPayChange(p.playerId, 'earned', e.target.value)}
                              className="w-full bg-slate-950 border border-emerald-500/40 hover:border-emerald-500 focus:border-emerald-400 rounded-lg py-2 pl-8 pr-2 text-sm font-black text-emerald-400 outline-none transition-all"
                            />
                          </div>
                          {hasOverrides && customPayOverrides[p.playerId]?.earned !== undefined && (
                            <span className="text-[10px] text-amber-400 font-bold block">`Custom Edited`</span>
                          )}
                        </div>

                        {/* Bonuses */}
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-amber-500/20 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">
                            Bonuses (`+₹`)
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-amber-400 font-bold text-sm">+₹</span>
                            <input
                              type="number"
                              value={numbers.bonuses}
                              onChange={(e) => handleCustomPayChange(p.playerId, 'bonuses', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-400 rounded-lg py-2 pl-8 pr-2 text-sm font-bold text-amber-400 outline-none transition-all"
                            />
                          </div>
                        </div>

                        {/* Chilavu (Base Liabilities + Add Deduction) */}
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-red-500/20 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                            <span>Base Chilavu:</span>
                            <span className="text-red-400 font-mono">-₹{numbers.baseLiabilities}</span>
                          </div>
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-red-400 font-bold text-sm">-₹</span>
                            <input
                              type="number"
                              placeholder="Add Deduction"
                              value={customPayOverrides[p.playerId]?.advances ?? ''}
                              onChange={(e) => handleCustomPayChange(p.playerId, 'advances', e.target.value)}
                              className="w-full bg-slate-950 border border-red-500/40 hover:border-red-500 focus:border-red-400 rounded-lg py-2 pl-8 pr-2 text-sm font-black text-red-400 outline-none transition-all"
                            />
                          </div>
                          {numbers.manualDeduction > 0 && (
                            <span className="text-[10px] text-red-400 font-bold block">
                              Total Chilavu: ₹{numbers.advances}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Net Payable Footer & Actions */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Net Payable</span>
                          <span
                            className={`text-lg font-black font-mono ${
                              numbers.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            ₹{numbers.net}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjPlayerId(p.playerId);
                              setShowAdjModal(true);
                            }}
                            className="px-3 py-2 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-all shadow"
                          >
                            + Adj
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleGenerateDraft(p.playerId, viewMode === 'MULTI_DAY' ? dayDate : weekEndDate)
                            }
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-lg text-xs flex items-center gap-1.5 transition-all"
                          >
                            <Save className="w-4 h-4" />
                            Settle & Save
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-3">Player / Leader (`പേര്`)</th>
                      <th className="py-3.5 px-3">Role</th>
                      <th className="py-3.5 px-3 min-w-[200px]">Inavivaram (`ഇനവിവരം - Work Done / Shifts`)</th>
                      <th className="py-3.5 px-3 w-32">Varavu (`Earned ₹ - Custom Input`)</th>
                      <th className="py-3.5 px-3 w-28">Bonuses (`+₹`)</th>
                      <th className="py-3.5 px-3 w-40">Chilavu (`Advances -₹`)</th>
                      <th className="py-3.5 px-3 text-right font-black text-amber-400">Net Payable (`₹`)</th>
                      <th className="py-3.5 px-3 text-right">Action (`Settle`)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                    {getFilteredPlayers().map((p) => {
                      const numbers = getPlayerEffectiveNumbers(p);
                      const hasOverrides = customPayOverrides[p.playerId] !== undefined;

                      return (
                        <tr key={p.playerId} className="hover:bg-slate-800/40 transition-all">
                          <td className="py-3 px-3 font-bold text-white">
                            <span className="block text-sm font-black text-white">{p.playerName}</span>
                            {p.phone && <span className="text-[10px] text-slate-500 block">{p.phone}</span>}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              p.playerRole === 'OPERATOR'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : p.playerRole === 'WORKER'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>
                              {p.playerRole === 'WORKER' ? 'MESTRI / LEADER' : p.playerRole}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans text-xs">
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {p.jobDescriptions.length === 0 ? (
                                <span className="text-slate-500 italic">No shifts logged directly</span>
                              ) : (
                                p.jobDescriptions.map((desc: string, idx: number) => (
                                  <div key={idx} className="text-slate-300 font-medium leading-tight">
                                    • {desc}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>

                          {/* CUSTOM VARAVU (EARNED) INPUT */}
                          <td className="py-3 px-3">
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-emerald-400 font-bold text-xs">+₹</span>
                              <input
                                type="number"
                                value={numbers.earned}
                                onChange={(e) => handleCustomPayChange(p.playerId, 'earned', e.target.value)}
                                className="w-full bg-slate-950 border border-emerald-500/30 hover:border-emerald-500 focus:border-emerald-400 rounded-lg py-1.5 pl-7 pr-2 text-xs font-black text-emerald-400 outline-none transition-all"
                              />
                            </div>
                            {hasOverrides && customPayOverrides[p.playerId]?.earned !== undefined && (
                              <span className="text-[9px] text-amber-400 font-bold block mt-0.5">`Custom Edited`</span>
                            )}
                          </td>

                          {/* CUSTOM BONUSES INPUT */}
                          <td className="py-3 px-3">
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-amber-400 font-bold text-xs">+₹</span>
                              <input
                                type="number"
                                value={numbers.bonuses}
                                onChange={(e) => handleCustomPayChange(p.playerId, 'bonuses', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-400 rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold text-amber-400 outline-none transition-all"
                              />
                            </div>
                          </td>

                          {/* CUSTOM CHILAVU (ADVANCES / DEDUCTIONS) INPUT */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                <span>Base:</span>
                                <span className="text-red-400 font-mono font-bold">-₹{numbers.baseLiabilities}</span>
                              </div>
                              <div className="relative flex items-center">
                                <span className="absolute left-2 text-red-400 font-bold text-xs">-₹</span>
                                <input
                                  type="number"
                                  placeholder="Add Deduction"
                                  value={customPayOverrides[p.playerId]?.advances ?? ''}
                                  onChange={(e) => handleCustomPayChange(p.playerId, 'advances', e.target.value)}
                                  className="w-full bg-slate-950 border border-red-500/30 hover:border-red-500 focus:border-red-400 rounded-lg py-1.5 pl-7 pr-2 text-xs font-black text-red-400 outline-none transition-all"
                                />
                              </div>
                              {numbers.manualDeduction > 0 && (
                                <span className="text-[9px] text-red-400 font-bold block">
                                  Total Chilavu: ₹{numbers.advances}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* NET PAYABLE COLUMN */}
                          <td className="py-3 px-3 text-right">
                            <span className={`text-sm font-black font-mono ${numbers.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ₹{numbers.net}
                            </span>
                          </td>

                          {/* ACTION BUTTONS */}
                          <td className="py-3 px-3 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjPlayerId(p.playerId);
                                  setShowAdjModal(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-bold"
                                title="Log Bonus/Penalty"
                              >
                                + Adj
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateDraft(p.playerId, viewMode === 'MULTI_DAY' ? dayDate : weekEndDate)}
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-lg shadow text-[11px] flex items-center gap-1 transition-all"
                              >
                                Settle & Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ==================================================================================== */}
      {/* TAB 3: SINGLE OPERATOR AUDIT CALCULATOR (`Legacy / Deep Verification`) */}
      {/* ==================================================================================== */}
      {viewMode === 'SINGLE_CALC' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                Single Operator Audit Calculator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed single-operator inspection with exact shift history and instant draft saving.
              </p>
            </div>
            <button
              onClick={() => setShowAdjModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              Log Bonus / Penalty (`Manual Adjustment`)
            </button>
          </div>

          <form onSubmit={handleSingleCalculate} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-400 block mb-1">Select Player (`Operator / Leader`)</label>
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none focus:border-amber-500 font-bold"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Start Date</label>
              <input
                type="date"
                value={singleStartDate}
                onChange={(e) => setSingleStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">End Date (`Week Ending`)</label>
              <input
                type="date"
                value={singleEndDate}
                onChange={(e) => setSingleEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                required
              />
            </div>

            <div className="sm:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Calculate & Preview Breakdown
              </button>
            </div>
          </form>

          {/* CALCULATION RESULT BREAKDOWN */}
          {calculationResult && (
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Labor Earned</span>
                  <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                    +₹{calculationResult.totalLaborEarned}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Approved Bonuses</span>
                  <span className="text-lg font-black text-amber-400 font-mono mt-1 block">
                    +₹{calculationResult.approvedBonuses}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Penalties</span>
                  <span className="text-lg font-black text-red-400 font-mono mt-1 block">
                    -₹{calculationResult.approvedPenalties}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Cash Collected Held</span>
                  <span className="text-lg font-black text-blue-400 font-mono mt-1 block">
                    -₹{calculationResult.totalCashHeld}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Salary Advances</span>
                  <span className="text-lg font-black text-purple-400 font-mono mt-1 block">
                    -₹{calculationResult.totalAdvances}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/50 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    Final Net Settlement Payout (`Date Range: {singleEndDate}`)
                  </span>
                  <span className="text-3xl font-black text-white font-mono mt-1 block">
                    ₹{calculationResult.finalPayout}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleGenerateDraft(selectedOperatorId, singleEndDate)}
                    disabled={isPending}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs border border-slate-700 shadow transition-all"
                  >
                    Save Draft Settlement
                  </button>
                </div>
              </div>

              {/* Detailed Logs Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Completed Shift & Pour Logs ({calculationResult.breakdown.laborLogs.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {calculationResult.breakdown.laborLogs.map((log: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{log.machine} ({log.workType})</span>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {new Date(log.date).toISOString().split('T')[0]}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">+₹{log.pay}</span>
                      </div>
                    ))}
                    {calculationResult.breakdown.laborLogs.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4">No completed shifts found in date range.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                    Cash Held & Pending Advances ({calculationResult.breakdown.cashCollections.length + calculationResult.breakdown.advances.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {calculationResult.breakdown.cashCollections.map((c: any, idx: number) => (
                      <div key={`cash-${idx}`} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-blue-300 block">Field Cash Collection</span>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {new Date(c.date).toISOString().split('T')[0]} | Status: {c.status}</span>
                        </div>
                        <span className="font-mono font-bold text-red-400">-₹{c.amountCollected}</span>
                      </div>
                    ))}
                    {calculationResult.breakdown.advances.map((a: any, idx: number) => (
                      <div key={`adv-${idx}`} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-purple-300 block">Pending Salary Advance</span>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {new Date(a.date).toISOString().split('T')[0]}</span>
                        </div>
                        <span className="font-mono font-bold text-red-400">-₹{a.amount}</span>
                      </div>
                    ))}
                    {calculationResult.breakdown.cashCollections.length === 0 && calculationResult.breakdown.advances.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4">No cash collections or pending advances.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: OWNER APPROVAL QUEUE (Delegated Authority > ₹500) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Pending Adjustment Approvals (`Delegated Authority: &gt; ₹500`)
            </h3>
            <p className="text-xs text-slate-400">
              Adjustments over ₹500 must be explicitly approved by OWNER before factoring into settlement calculations.
            </p>
          </div>
          <span className="bg-amber-500/20 text-amber-400 text-xs font-black px-2.5 py-1 rounded-full border border-amber-500/30">
            {pendingAdjustments.length} Pending
          </span>
        </div>

        {pendingAdjustments.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 text-xs font-bold">
            ✅ All high-value manual adjustments have been reviewed and resolved.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAdjustments.map((adj) => (
              <div key={adj.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">{adj.employee?.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Date: {new Date(adj.date).toISOString().split('T')[0]}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    adj.type === 'BONUS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {adj.type === 'BONUS' ? '+' : '-'}₹{adj.amount?.toString()}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl text-xs font-mono text-slate-300 italic">
                  &quot;{adj.reason}&quot;
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">Logged by Staff: {adj.createdBy?.name}</span>
                  {userRole === 'OWNER' && (
                    <button
                      onClick={() => handleApproveAdjustment(adj.id)}
                      disabled={isPending}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-lg shadow transition-all flex items-center gap-1"
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Owner: Approve Adjustment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: RECENT SETTLEMENTS LEDGER & OWNER IMMUTABLE LOCK */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Weekend Settlements Ledger (`Audit Locked`)
            </h3>
            <p className="text-xs text-slate-400">
              Once an OWNER locks a settlement (`isFinalized: true`), it becomes immutable and marks advances/adjustments as SETTLED.
            </p>
          </div>
        </div>

        {recentSettlements.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 text-xs font-bold">
            No settlements generated yet. Use the live calculator tabs above to preview and save settlements.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Player / Operator</th>
                  <th className="py-3 px-3">Week Ending</th>
                  <th className="py-3 px-3">Earned</th>
                  <th className="py-3 px-3">Bonuses/Pen.</th>
                  <th className="py-3 px-3">Cash Held</th>
                  <th className="py-3 px-3">Advances</th>
                  <th className="py-3 px-3">Final Payout</th>
                  <th className="py-3 px-3">Audit Lock Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {recentSettlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3 px-3 font-bold text-white">{s.operator?.name}</td>
                    <td className="py-3 px-3">{new Date(s.weekEnding).toISOString().split('T')[0]}</td>
                    <td className="py-3 px-3 text-emerald-400">+₹{s.totalLaborEarned?.toString()}</td>
                    <td className="py-3 px-3 text-amber-400">₹{s.totalAdjustments?.toString()}</td>
                    <td className="py-3 px-3 text-blue-400">-₹{s.totalCashHeld?.toString()}</td>
                    <td className="py-3 px-3 text-purple-400">-₹{s.totalAdvances?.toString()}</td>
                    <td className="py-3 px-3 font-black text-white text-sm">₹{s.finalPayout?.toString()}</td>
                    <td className="py-3 px-3 font-sans">
                      {s.isFinalized ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                          <Lock className="w-3 h-3" />
                          LOCKED BY OWNER
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          DRAFT PREVIEW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      {!s.isFinalized && userRole === 'OWNER' && (
                        <button
                          onClick={() => handleFinalizeLock(s.id)}
                          disabled={isPending}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-lg shadow text-[11px] transition-all"
                        >
                          Owner: Lock & Finalize
                        </button>
                      )}
                      {s.isFinalized && (
                        <span className="text-[10px] text-slate-500 font-bold block">Immutable Lock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LOG BONUS/PENALTY MODAL */}
      {showAdjModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-amber-400">
              <PlusCircle className="w-5 h-5" />
              Log Bonus or Penalty (`Manual Adjustment`)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Delegated Authority rule: Adjustments ≤ ₹500 auto-approve. Over ₹500 will be submitted as PENDING requiring OWNER approval.
            </p>

            <form onSubmit={handleCreateAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Player (`Operator / Leader / Worker`)</label>
                <select
                  value={adjPlayerId}
                  onChange={(e) => setAdjPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none font-bold"
                >
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name} ({op.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Type</label>
                  <select
                    value={adjType}
                    onChange={(e: any) => setAdjType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none font-bold"
                  >
                    <option value="BONUS">BONUS (+ Pay)</option>
                    <option value="PENALTY">PENALTY (- Pay / Advance)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Amount (`₹`)</label>
                  <input
                    type="number"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="e.g. 300"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Mandatory Audit Reason</label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Exceptional concrete pour speed on Kakkanad site (+₹300 festival bonus)."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none h-24 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Log Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOM PLAYER ROW MODAL */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/60 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-emerald-400">
              <UserPlus className="w-5 h-5" />
              Add Custom Player Payment Entry
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add or custom-edit a player (Leader/Operator/Driver) into today’s or this week’s ledger even if they weren't on an auto-dispatch.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Select Player (`പേര്`)</label>
                <select
                  value={newRowPlayerId}
                  onChange={(e) => setNewRowPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none font-bold"
                >
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name} ({op.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Custom Earned Pay (`₹ Varavu`)</label>
                <input
                  type="number"
                  value={newRowCustomPay}
                  onChange={(e) => setNewRowCustomPay(e.target.value)}
                  placeholder="e.g. 10800 (for 9 helpers) or 2200"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none font-mono font-bold text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Work Description (`ഇനവിവരം`)</label>
                <input
                  type="text"
                  value={newRowJobNote}
                  onChange={(e) => setNewRowJobNote(e.target.value)}
                  placeholder="e.g. Kaka - 9 bhai @ 1200 or Lift (2) mle 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomPlayerRow}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow"
                >
                  Add To Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
