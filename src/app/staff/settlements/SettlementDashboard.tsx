"use client";

import { useState } from "react";
import { getUnsettledBalance, generateSettlement, recordSettlementPayment } from "@/actions/settlements";
import { format } from "date-fns";

export default function SettlementDashboard({ employees, contractors }: { employees: any[], contractors: any[] }) {
  const [activeTab, setActiveTab] = useState<"EMPLOYEE" | "CONTRACTOR">("EMPLOYEE");
  const [selectedId, setSelectedId] = useState("");
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);

  const activeList = activeTab === "EMPLOYEE" ? employees : contractors;

  const handleFetchBalance = async (targetId: string) => {
    setSelectedId(targetId);
    if (!targetId) {
      setBalanceData(null);
      return;
    }
    setLoading(true);
    const result = await getUnsettledBalance(activeTab, targetId);
    if (result.success) {
      setBalanceData(result.data);
    } else {
      alert("Error fetching balance: " + result.error);
    }
    setLoading(false);
  };

  const handleGenerateSettlement = async () => {
    if (!balanceData) return;
    if (balanceData.assignments.length === 0 && balanceData.advances.length === 0) {
      alert("Nothing to settle.");
      return;
    }

    setSettling(true);
    const assignmentIds = balanceData.assignments.map((a: any) => a.id);
    const advanceIds = balanceData.advances.map((a: any) => a.id);

    const result = await generateSettlement({
      type: activeTab,
      targetId: selectedId,
      assignmentIds,
      advanceIds,
      finalPayout: balanceData.netPayout,
      weekEnding: new Date(),
    });

    if (result.success) {
      alert("Settlement generated and ledger locked!");
      setBalanceData(null);
      setSelectedId("");
    } else {
      alert("Error generating settlement: " + result.error);
    }
    setSettling(false);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-800 pb-2">
        <button
          className={`pb-2 px-1 font-medium text-sm transition-colors ${
            activeTab === "EMPLOYEE"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => { setActiveTab("EMPLOYEE"); setBalanceData(null); setSelectedId(""); }}
        >
          Internal Staff
        </button>
        <button
          className={`pb-2 px-1 font-medium text-sm transition-colors ${
            activeTab === "CONTRACTOR"
              ? "border-b-2 border-orange-500 text-orange-400"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => { setActiveTab("CONTRACTOR"); setBalanceData(null); setSelectedId(""); }}
        >
          External Leaders (Contractors)
        </button>
      </div>

      {/* Selector */}
      <div className="max-w-xs">
        <label className="block text-xs text-zinc-400 uppercase font-semibold mb-2">
          Select {activeTab === "EMPLOYEE" ? "Employee" : "Contractor"}
        </label>
        <select
          value={selectedId}
          onChange={(e) => handleFetchBalance(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white"
        >
          <option value="">-- Select --</option>
          {activeList.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} {item.role ? `(${item.role})` : ""}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="text-zinc-400">Loading ledger...</div>}

      {/* Ledger View */}
      {balanceData && !loading && (
        <div className="space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Wages Column */}
            <div>
              <h3 className="text-lg font-bold text-green-400 mb-4">Gross Wages (Unlocked)</h3>
              <ul className="space-y-3">
                {balanceData.assignments.length === 0 ? (
                  <li className="text-zinc-500 text-sm">No unlocked jobs found.</li>
                ) : (
                  balanceData.assignments.map((a: any) => (
                    <li key={a.id} className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 flex justify-between items-center text-sm">
                      <div>
                        <div className="text-zinc-300 font-medium">
                          {format(new Date(a.dispatch.dateOfService), "MMM dd")} - {a.dispatch.location}
                        </div>
                        <div className="text-zinc-500 text-xs mt-1">
                          Rate: ₹{a.lockedWageRate} {activeTab === "CONTRACTOR" && `× ${a.headcount} helpers`}
                        </div>
                      </div>
                      <div className="font-mono text-green-400 font-semibold">
                        +₹{Number(a.lockedWageRate) * (a.headcount || 1)}
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-zinc-300 font-bold">
                <span>Total Gross:</span>
                <span className="text-green-400 text-lg">₹{balanceData.totalGrossWages}</span>
              </div>
            </div>

            {/* Advances Column */}
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-4">Advances & Deductions</h3>
              <ul className="space-y-3">
                {balanceData.advances.length === 0 ? (
                  <li className="text-zinc-500 text-sm">No advances found.</li>
                ) : (
                  balanceData.advances.map((a: any) => (
                    <li key={a.id} className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 flex justify-between items-center text-sm">
                      <div>
                        <div className="text-zinc-300 font-medium">{format(new Date(a.date), "MMM dd")}</div>
                        <div className="text-zinc-500 text-xs mt-1">{a.notes || "No notes"}</div>
                      </div>
                      <div className="font-mono text-red-400 font-semibold">-₹{a.amount}</div>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-zinc-300 font-bold">
                <span>Total Deductions:</span>
                <span className="text-red-400 text-lg">₹{balanceData.totalAdvances}</span>
              </div>
            </div>
          </div>

          {/* Final Calculation & Lock Button */}
          <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 flex flex-col md:flex-row justify-between items-center">
            <div>
              <div className="text-zinc-400 text-sm uppercase font-bold tracking-wider mb-1">Net Payout</div>
              <div className="text-3xl font-black text-white font-mono">₹{balanceData.netPayout}</div>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleGenerateSettlement}
                disabled={settling || (balanceData.assignments.length === 0 && balanceData.advances.length === 0)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                {settling ? "Locking Ledger..." : "Generate & Lock Ledger"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
