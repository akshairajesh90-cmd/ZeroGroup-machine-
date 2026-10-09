import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  params,
}: {
  params: { dispatchId: string };
}) {
  const session = await auth();
  if (
    !session?.user ||
    !["ADMIN", "OWNER", "STAFF"].includes(session.user.role)
  ) {
    redirect("/");
  }

  // Fetch the logged-in employee for the collector ID
  const me = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });
  if (!me) redirect("/");

  const dispatch = await prisma.dailyDispatch.findUnique({
    where: { id: params.dispatchId },
    include: {
      customer: true,
      machine: true,
      operator: true,
      driver: true,
      dispatchMachines: { include: { machine: true } },
      dispatchTools: { include: { tool: true } },
      crewAssignments: { include: { employee: true } },
      dispatchLabor: true,
    },
  });

  if (!dispatch) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-bold text-red-500">Dispatch Not Found</h1>
        <p>Could not load dispatch details for {params.dispatchId}</p>
      </div>
    );
  }

  if (dispatch.invoiceId) {
    // Already billed
    redirect(`/admin/billing/print/${dispatch.invoiceId}`);
  }

  // Calculate default items based on dispatch structure
  const defaultItems = [];

  // 1. Machine
  if (dispatch.machine) {
    defaultItems.push({
      itemKey: "MACHINE_CHARGE",
      description: `${dispatch.machine.type} (${dispatch.machine.machineId})`,
      quantity: 1,
      rate: Number(dispatch.machine.operatorDailyPayout),
      total: Number(dispatch.machine.operatorDailyPayout),
    });
  }

  // 2. Lift Floors
  if (dispatch.liftFloors && dispatch.liftFloors > 0) {
    // Standard rate per floor (you could pull this from settings/WorkTypeRate, assuming fixed 500 for now)
    const ratePerFloor = 500; 
    defaultItems.push({
      itemKey: "LIFT_CHARGE",
      description: `Lift Floors (${dispatch.liftFloors} floors)`,
      quantity: dispatch.liftFloors,
      rate: ratePerFloor,
      total: dispatch.liftFloors * ratePerFloor,
    });
  }

  // 3. Crew
  let totalWages = 0;
  dispatch.crewAssignments.forEach(ca => {
    totalWages += Number(ca.lockedWageRate || 0);
  });
  if (totalWages > 0) {
    defaultItems.push({
      itemKey: "CREW_WAGES",
      description: `Internal Crew (${dispatch.crewAssignments.length} members)`,
      quantity: 1,
      rate: totalWages,
      total: totalWages,
    });
  }

  // 4. External Labor
  let externalWages = 0;
  dispatch.dispatchLabor.forEach(el => {
    externalWages += Number(el.lumpSumWage || 0);
  });
  if (externalWages > 0) {
    defaultItems.push({
      itemKey: "EXTERNAL_WAGES",
      description: `External Labor (${dispatch.dispatchLabor.length} workers)`,
      quantity: 1,
      rate: externalWages,
      total: externalWages,
    });
  }

  // 5. Tools / Surcharges (e.g. Vibrator wire length & Petrol Vibrator)
  const vibratorToolElectric = dispatch.dispatchTools.find(dt => dt.tool.toolType === "VIBRATOR_ELECTRIC" || dt.tool.toolId.includes("ELEC"));
  if (vibratorToolElectric || dispatch.vibratorType === "ELECTRIC") {
    defaultItems.push({
      itemKey: "WIRE_SURCHARGE",
      description: `Electric Vibrator Wire Rental`,
      quantity: 1,
      rate: 200, // standard wire surcharge
      total: 200,
    });
  }

  const vibratorToolPetrol = dispatch.dispatchTools.find(dt => dt.tool.toolType === "VIBRATOR_PETROL" || dt.tool.toolId.includes("PETROL"));
  if (vibratorToolPetrol || dispatch.vibratorType === "PETROL") {
    defaultItems.push({
      itemKey: "PETROL_VIBRATOR_CHARGE",
      description: `Petrol Vibrator Rental Charge`,
      quantity: 1,
      rate: 1000, // standard petrol vibrator rate (editable by staff)
      total: 1000,
    });
  }

  return (
    <div className="min-h-screen bg-black">
      <BillingClient 
        dispatch={dispatch} 
        defaultItems={defaultItems} 
        collectorId={me.id}
      />
    </div>
  );
}
