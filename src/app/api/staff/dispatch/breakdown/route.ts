import { NextRequest, NextResponse } from "next/server";
import { requireAuthForApi } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { Role, MaintenanceStatus, MachineStatus } from "@prisma/client";
import { logAudit } from "@/lib/auditLogger";

export async function POST(req: NextRequest) {
  try {
    const { ctx: _sessionCtx, response } = await requireAuthForApi({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });
    if (response) return response;
    const session = _sessionCtx!;

    const {
      dispatchId,
      brokenMachineId,
      replacementMachineId,
      driverId,
      downtimeHours,
      downtimeCredit
    } = await req.json();

    if (!dispatchId || !brokenMachineId || !replacementMachineId) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the original dispatch
      const dispatch = await tx.dailyDispatch.findUnique({
        where: { id: dispatchId },
        include: { machine: true }
      });

      if (!dispatch) {
        throw new Error("Original dispatch not found.");
      }

      // 2. Mark the broken machine as in REPAIR
      await tx.machine.update({
        where: { id: brokenMachineId },
        data: { status: MachineStatus.REPAIR }
      });

      // 3. Mark the replacement machine as RENTED
      await tx.machine.update({
        where: { id: replacementMachineId },
        data: { status: MachineStatus.RENTED }
      });

      // 4. Create a Maintenance Ticket for the broken machine
      const ticket = await tx.maintenanceTicket.create({
        data: {
          machineId: brokenMachineId,
          issueDescription: `Catastrophic engine breakdown reported mid-shift on active site (Location: ${dispatch.location}). Swapped with replacement machine ${replacementMachineId}. Downtime: ${downtimeHours} hours.`,
          status: MaintenanceStatus.OPEN
        }
      });

      // 5. Update the original dispatch machine and adjust charge
      const oldCharge = Number(dispatch.customerCharge || 0);
      const newCharge = Math.max(0, oldCharge - Number(downtimeCredit || 0));
      const updatedNotes = [
        dispatch.notes,
        `[BREAKDOWN LOG] Machine ${brokenMachineId} failed mid-shift. Swapped with ${replacementMachineId}. Downtime: ${downtimeHours}h, Credit adjusted: -₹${downtimeCredit}`
      ].filter(Boolean).join(" | ");

      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: {
          machineId: replacementMachineId,
          customerCharge: newCharge,
          notes: updatedNotes
        }
      });

      // 6. Create the swap transport/relocation dispatch task for the driver
      const swapDispatch = await tx.dailyDispatch.create({
        data: {
          customerId: dispatch.customerId,
          location: dispatch.location,
          dateOfService: dispatch.dateOfService,
          driverId: driverId || undefined,
          machineId: replacementMachineId,
          status: "ACCEPTED",
          isPrimaryBillingRow: false,
          notes: `[AUTO-SWAP LOGISTICS] Swapping broken machine ${brokenMachineId} with replacement machine ${replacementMachineId}. Recovery of broken machine back to yard.`
        }
      });

      // 7. Audit log the operations swap
      await tx.auditLog.create({
        data: {
          actorId: session.employeeId,
          actorRole: session.role,
          actionType: "BREAKDOWN_SWAP",
          modelName: "DailyDispatch",
          oldPayload: {
            dispatchId,
            machineId: brokenMachineId,
            customerCharge: oldCharge
          },
          newPayload: {
            dispatchId,
            machineId: replacementMachineId,
            customerCharge: newCharge,
            swapDispatchId: swapDispatch.id,
            maintenanceTicketId: ticket.id
          }
        }
      });

      return {
        success: true,
        maintenanceTicketId: ticket.id,
        swapDispatchId: swapDispatch.id
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Breakdown Hot-Swap failed:", error);
    return NextResponse.json({ error: error.message || "Failed to execute hot-swap." }, { status: 500 });
  }
}
