"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface UtilizationPieProps {
  data: {
    status: string;
    count: number;
  }[];
}

const COLORS = {
  AVAILABLE: "#10b981", // Green
  RENTED: "#3b82f6", // Blue
  REPAIR: "#f59e0b", // Orange
  RETIRED: "#9ca3af", // Gray
};

export default function UtilizationPie({ data }: UtilizationPieProps) {
  // Aggregate data if there are multiple types but same status
  const aggregatedData = data.reduce((acc, curr) => {
    const existing = acc.find(item => item.status === curr.status);
    if (existing) {
      existing.count += curr.count;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as any[]);

  return (
    <div className="w-full h-96 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Fleet Status Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={aggregatedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="count"
            nameKey="status"
          >
            {aggregatedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.status] || "#000"} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
