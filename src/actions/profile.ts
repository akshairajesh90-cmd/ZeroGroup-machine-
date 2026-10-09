"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getMyProfile() {
  const { userId } = await requireAuth();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true }
  });

  if (!user || !user.employee) {
    return { success: false, error: "Profile not found" };
  }

  return { success: true, data: {
    email: user.email,
    name: user.employee.name,
    phone: user.employee.phone,
    gpayNumber: (user.employee as any).gpayNumber || "",
    upiId: (user.employee as any).upiId || "",
    profilePhotoUrl: user.employee.profilePhotoUrl || "",
    role: user.role
  }};
}

export async function updateMyProfile(data: {
  phone?: string;
  gpayNumber?: string;
  upiId?: string;
  newPassword?: string;
  profilePhotoUrl?: string;
}) {
  try {
    const { userId, employeeId } = await requireAuth();

    // Update User (Password)
    if (data.newPassword && data.newPassword.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { hashedPassword }
      });
    }

    // Update Employee Profile
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.gpayNumber !== undefined && { gpayNumber: data.gpayNumber }),
        ...(data.upiId !== undefined && { upiId: data.upiId }),
        ...(data.profilePhotoUrl !== undefined && { profilePhotoUrl: data.profilePhotoUrl }),
      }
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update profile" };
  }
}
