import React from "react";
import { getWorkTypeRates, getEmployeeRoleRates } from "@/actions/rates";
import RatesClient from "./RatesClient";
import { prisma } from "@/lib/prisma";

export default async function RatesPage() {
  const workTypeRates = await getWorkTypeRates();
  const employeeRoleRates = await getEmployeeRoleRates();

  // Let's get distinct machine types and work types from enums manually or from Prisma if available
  const machineTypes = ["MIXER", "LIFT", "VIBRATOR", "PANI", "INDEPENDENT"];
  const workTypes = ["NORMAL", "TROLLY", "LATE"];
  const crewRoles = [
    "MIXER_OPERATOR", "HYDRAULIC_OPERATOR", "VIBRATOR_OPERATOR", "LIFT_OPERATOR",
    "WORKER_LEADER", "HELPER", "DRIVER", "SUB_LEADER", "PANI_HELPER", 
    "TROLLY_1_WHEEL", "TROLLY_2_WHEEL", "P_VIBRATOR"
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Global Price Book</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Manage the standard Base Rates for machines, work types, and employee roles.
          These defaults are auto-loaded during Dispatch and Billing.
        </p>
      </div>
      
      <RatesClient 
        initialWorkTypeRates={workTypeRates} 
        initialEmployeeRoleRates={employeeRoleRates}
        machineTypes={machineTypes}
        workTypes={workTypes}
        crewRoles={crewRoles}
      />
    </div>
  );
}
