"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateVehicleStatus(vehicleId: string, status: any) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status }
  });
  revalidatePath(`/admin/fleet`);
  revalidatePath(`/admin/fleet/vehicle/${vehicleId}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateMachineStatus(machineId: string, status: any) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.machine.update({
    where: { id: machineId },
    data: { status }
  });
  revalidatePath(`/admin/fleet`);
  revalidatePath(`/admin/fleet/machine/${machineId}`);
}
