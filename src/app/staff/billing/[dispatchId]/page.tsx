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

  // 1. Machine Base Rental Rate
  if (dispatch.machine) {
    const mType = dispatch.machine.type;
    let baseRate = 1000;
    let machineLabel = "Mixing Machine";
    if (mType === "HYDRAULIC_MIXER" || dispatch.mixerCategory === "HYDRAULIC") {
      baseRate = 1100;
      machineLabel = "Hydraulic Mixing Machine";
    } else if (mType === "LIFT") {
      baseRate = 1700;
      machineLabel = "Lift (Ground Floor)";
    } else if (mType === "MIXER") {
      baseRate = 1000;
      machineLabel = "Mixing Machine";
    }

    defaultItems.push({
      itemKey: "MACHINE_CHARGE",
      description: `${machineLabel} (${dispatch.machine.machineId}) - Base Rate`,
      quantity: 1,
      rate: baseRate,
      total: baseRate,
    });
  }

  // 2. Lift Floors
  if (dispatch.liftFloors && dispatch.liftFloors > 0) {
    // Standard rate per floor (500 per additional floor)
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
  dispatch.crewAssignments.forEach((ca: any) => {
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

  // 4. External / Additional Helpers
  if (dispatch.helperCount && dispatch.helperCount > 0) {
    const defaultHelperRate = 1200; // Default rate, staff can edit this on the billing screen
    defaultItems.push({
      itemKey: "HELPER_CHARGE",
      description: `Helpers Provided`,
      quantity: dispatch.helperCount,
      rate: defaultHelperRate,
      total: dispatch.helperCount * defaultHelperRate,
    });
  }

  let externalWages = 0;
  dispatch.dispatchLabor.forEach((el: any) => {
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

  // 5. Dispatched Tools (populated with 1-day rental rate from Tool registry)
  if (dispatch.dispatchTools && dispatch.dispatchTools.length > 0) {
    dispatch.dispatchTools.forEach((dt: any) => {
      const toolRate = Number(dt.tool?.dailyRate || 0);
      const qty = Number(dt.quantity || 1);
      const toolName = dt.tool?.name || "Tool";

      if (toolRate > 0) {
        defaultItems.push({
          itemKey: `TOOL_${dt.tool?.id || dt.id}`,
          description: `${toolName} (1-Day Rate x${qty})`,
          quantity: qty,
          rate: toolRate,
          total: qty * toolRate,
        });
      } else {
        // Fallbacks for tools before rates were assigned
        const nameLower = toolName.toLowerCase();
        let fallbackRate = 0;
        if (nameLower.includes("1-wheel")) fallbackRate = 1500;
        else if (nameLower.includes("2-wheel")) fallbackRate = 1100;
        else if (nameLower.includes("petrol") || dt.tool?.toolType === "VIBRATOR_PETROL") fallbackRate = 1000;
        else if (nameLower.includes("electric") || dt.tool?.toolType === "VIBRATOR_ELECTRIC") fallbackRate = 200;

        if (fallbackRate > 0) {
          defaultItems.push({
            itemKey: `TOOL_${dt.tool?.id || dt.id}`,
            description: `${toolName} (x${qty})`,
            quantity: qty,
            rate: fallbackRate,
            total: qty * fallbackRate,
          });
        }
      }
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
