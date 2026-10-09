import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProfitability, getUtilization, getPayrollSummary } from "@/actions/analytics";
import ProfitMarginChart from "@/components/analytics/ProfitMarginChart";
import UtilizationPie from "@/components/analytics/UtilizationPie";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "OWNER")) {
    redirect("/");
  }

  // Fetch data concurrently
  const [profitability, utilization, payroll] = await Promise.all([
    getProfitability(new Date()),
    getUtilization(),
    getPayrollSummary(),
  ]);

  const profitChartData = [
    {
      name: "Current Month",
      revenue: profitability.revenue,
      expenses: profitability.expenses,
      payroll: profitability.payroll,
      netProfit: profitability.netProfit,
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & Reporting</h1>
        <p className="text-sm text-gray-500 mt-1">
          High-level metrics for revenue, fleet utilization, and payroll.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitMarginChart data={profitChartData} />
        <UtilizationPie data={utilization} />
      </div>

      {/* Basic Payroll Summary Table */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Payroll Settlements</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payroll.map((p: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{p.amount.toFixed(2)}</td>
                </tr>
              ))}
              {payroll.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">No recent settlements found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

