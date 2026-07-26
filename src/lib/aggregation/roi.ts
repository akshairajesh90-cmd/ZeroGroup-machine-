import { prisma } from "@/lib/prisma";

export async function calculateAssetROI(machineId?: string, vehicleId?: string) {
  if (!machineId && !vehicleId) throw new Error("Must provide an asset ID");

  // Cost Center Flag
  const isCostCenter = !!vehicleId;

  // 1. Calculate Lifetime Revenue & Operation Payouts
  let revenue = 0;
  let operationCost = 0;

  if (machineId) {
    const dispatchAgg = await prisma.dailyDispatch.aggregate({
      where: { 
        machineId, 
        status: "COMPLETED",
      },
      _sum: { 
        customerCharge: true,
        operatorDailyRate: true 
      }
    });
    revenue = Number(dispatchAgg._sum.customerCharge || 0);
    operationCost = Number(dispatchAgg._sum.operatorDailyRate || 0);
  }

  // 2. Calculate Lifetime Maintenance Cost
  const maintenanceAgg = await prisma.maintenanceTicket.aggregate({
    where: { 
      machineId: machineId || undefined,
      vehicleId: vehicleId || undefined,
      status: "RESOLVED"
    },
    _sum: { 
      partsCost: true, 
      laborCost: true 
    }
  });
  const maintenanceExpense = Number(maintenanceAgg._sum.partsCost || 0) + Number(maintenanceAgg._sum.laborCost || 0);

  // 3. Calculate Lifetime Fuel Cost
  const fuelAgg = await prisma.fuelLog.aggregate({
    where: {
      machineId: machineId || undefined,
      vehicleId: vehicleId || undefined
    },
    _sum: { totalCost: true }
  });
  const fuelExpense = Number(fuelAgg._sum.totalCost || 0);

  // 4. True Net Profit Calculation
  const totalExpense = operationCost + maintenanceExpense + fuelExpense;
  const trueProfit = revenue - totalExpense;

  return {
    isCostCenter, // Frontend will use this flag to hide the "Profit" metric for vehicles
    revenue,
    expenses: {
      operationPayout: operationCost,
      maintenance: maintenanceExpense,
      fuel: fuelExpense,
      total: totalExpense
    },
    trueProfit
  };
}
