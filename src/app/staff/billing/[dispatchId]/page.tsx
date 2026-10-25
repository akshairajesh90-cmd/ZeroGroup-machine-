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

  // Fetch the logged-in employee for the collector ID, with fallback for Admins/Owners
  const me = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });
  let collectorId = me?.id;
  if (!collectorId) {
    const fallbackEmp = await prisma.employee.findFirst({
      where: { isActive: true, isPendingDelete: false },
    });
    collectorId = fallbackEmp?.id || session.user.id;
  }

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
  // DOMAIN RULE: Invoices ONLY show Machine Rent and Tools Used.
  // Internal operator wages and worker wages are NEVER billed to the customer.
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

  // 3. Trolly & Bench Stand Check (Configured in Work & Concrete Specs)
  let has1WheelTrollyAdded = false;
  if (dispatch.hasTrollyBench) {
    const oneWheelCount = Math.max(1, dispatch.trollyWorkerCount || 1);
    defaultItems.push({
      itemKey: "TOOL_TROLLY_1_WHEEL_BENCH",
      description: `1-Wheel Trolly & Bench (${oneWheelCount} Unit${oneWheelCount > 1 ? "s" : ""})`,
      quantity: oneWheelCount,
      rate: 1500,
      total: oneWheelCount * 1500,
    });
    defaultItems.push({
      itemKey: "TOOL_TROLLY_1_WHEEL_BENCH_RENT",
      description: "1-Wheel Trolly & Bench - Tool Rent",
      quantity: 1,
      rate: 1000,
      total: 1000,
    });
    has1WheelTrollyAdded = true;
  }

  // 4. Tools Used (2-Wheel Trolly, Vibrators, Kit, Sheets, etc.)
  if (dispatch.dispatchTools && dispatch.dispatchTools.length > 0) {
    dispatch.dispatchTools.forEach((dt: any) => {
      const toolName = dt.tool?.name || "Tool";
      const nameLower = toolName.toLowerCase();
      const qty = Number(dt.quantity || 1);
      let toolRate = Number(dt.tool?.dailyRate || 0);

      if (nameLower.includes("1-wheel")) {
        // 1-Wheel Trolly only goes with bench in Work Specs
        if (!has1WheelTrollyAdded) {
          defaultItems.push({
            itemKey: `TOOL_${dt.tool?.id || dt.id}`,
            description: `1-Wheel Trolly & Bench (${qty} Unit${qty > 1 ? "s" : ""})`,
            quantity: qty,
            rate: 1500,
            total: qty * 1500,
          });
          defaultItems.push({
            itemKey: `TOOL_${dt.tool?.id || dt.id}_RENT`,
            description: "1-Wheel Trolly & Bench - Tool Rent",
            quantity: 1,
            rate: 1000,
            total: 1000,
          });
          has1WheelTrollyAdded = true;
        }
      } else if (nameLower.includes("2-wheel") || dt.tool?.toolType?.includes("TROLLY_2")) {
        // 2-Wheel Trolly in Tools section: Exactly ₹200 per trolly given
        const rate = 200;
        defaultItems.push({
          itemKey: `TOOL_${dt.tool?.id || dt.id}`,
          description: `2-Wheel Trolly (Tools Used x${qty})`,
          quantity: qty,
          rate: rate,
          total: qty * rate,
        });
      } else {
        // Fallback rates if dailyRate not set in DB
        if (toolRate <= 0) {
          if (nameLower.includes("petrol") || dt.tool?.toolType === "VIBRATOR_PETROL") toolRate = 1000;
          else if (nameLower.includes("electric") || dt.tool?.toolType === "VIBRATOR_ELECTRIC") toolRate = 200;
          else if (nameLower.includes("needle") || dt.tool?.toolType === "VIBRATOR") toolRate = 300;
          else if (nameLower.includes("bench") || dt.tool?.toolType === "PANI") toolRate = 500;
          else if (nameLower.includes("tarp") || dt.tool?.toolType === "SHEET") toolRate = 150;
          else toolRate = 100;
        }

        defaultItems.push({
          itemKey: `TOOL_${dt.tool?.id || dt.id}`,
          description: `${toolName} (Tools Used x${qty})`,
          quantity: qty,
          rate: toolRate,
          total: qty * toolRate,
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-black">
      <BillingClient 
        dispatch={dispatch} 
        defaultItems={defaultItems} 
        collectorId={collectorId || ""}
      />
    </div>
  );
}
