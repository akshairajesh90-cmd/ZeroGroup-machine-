"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { DocumentType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET CURRENT USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export async function getOwnProfile() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: {
            documents: {
              where: { isPendingDelete: false },
              select: {
                id: true,
                type: true,
                documentNumber: true,
                attachmentUrl: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.employee) {
      throw new Error("Employee profile record not found.");
    }

    const emp = user.employee;

    return {
      success: true,
      data: {
        userId: user.id,
        employeeId: emp.id,
        email: user.email,
        name: emp.name,
        role: emp.role,
        phone: emp.phone || "",
        address: emp.address || "",
        gpayNumber: emp.gpayNumber || "",
        upiId: emp.upiId || "",
        officialIdType: emp.officialIdType || "DRIVING_LICENSE",
        officialIdNumber: emp.officialIdNumber || "",
        drivingLicenseNumber: emp.drivingLicenseNumber || "",
        employeeCode: emp.employeeCode || `ZG-${emp.id.slice(-4).toUpperCase()}`,
        profilePhotoUrl: emp.profilePhotoUrl || null,
        isIdVerified: emp.isIdVerified,
        idVerifiedAt: emp.idVerifiedAt?.toISOString() || null,
        idVerifiedBy: emp.idVerifiedBy || null,
        idVerifiedRole: emp.idVerifiedRole || null,
        capableRoles: emp.capableRoles || [],
        documents: emp.documents.map((d) => ({
          id: d.id,
          type: d.type,
          documentNumber: d.documentNumber,
          attachmentUrl: d.attachmentUrl,
          status: d.status,
          createdAt: d.createdAt.toISOString(),
        })),
        baseDailyWage: emp.baseDailyWage ? Number(emp.baseDailyWage) : null,
        fixedSalary: emp.fixedSalary ? Number(emp.fixedSalary) : null,
      },
    };
  } catch (error: any) {
    console.error("[PROFILE] getOwnProfile error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UPDATE OWN PROFILE (Employee cannot self-modify capableRoles or isIdVerified)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateOwnProfile(data: {
  name?: string;
  phone?: string;
  address?: string;
  gpayNumber?: string;
  upiId?: string;
  officialIdNumber?: string;
  drivingLicenseNumber?: string;
}) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) throw new Error("Employee profile not found.");

    // Detect if official IDs changed to reset verification to PENDING review
    const idChanged =
      (data.drivingLicenseNumber !== undefined && data.drivingLicenseNumber !== employee.drivingLicenseNumber) ||
      (data.officialIdNumber !== undefined && data.officialIdNumber !== employee.officialIdNumber);

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.gpayNumber !== undefined && { gpayNumber: data.gpayNumber?.trim() || null }),
        ...(data.upiId !== undefined && { upiId: data.upiId?.trim() || null }),
        ...(data.drivingLicenseNumber !== undefined && { drivingLicenseNumber: data.drivingLicenseNumber?.trim() || null }),
        ...(data.officialIdNumber !== undefined && { officialIdNumber: data.officialIdNumber?.trim() || null }),
        ...(idChanged && {
          isIdVerified: false,
          idVerifiedAt: null,
          idVerifiedBy: null,
          idVerifiedRole: null,
        }),
      },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/staff/profile");
    revalidatePath("/driver/profile");
    revalidatePath("/operator/profile");
    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[PROFILE] updateOwnProfile error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UPLOAD OR LINK OFFICIAL ID DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function linkOfficialDocument(data: {
  type: DocumentType;
  documentNumber: string;
  attachmentUrl: string;
}) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const employee = await prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) throw new Error("Employee not found.");

    const today = new Date();
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId: employee.id,
        type: data.type,
        documentNumber: data.documentNumber.trim(),
        issueDate: today,
        expiryDate: nextYear,
        attachmentUrl: data.attachmentUrl,
        status: "ACTIVE",
      },
    });

    // Reset verification status so Staff/Admin review the newly uploaded file
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        isIdVerified: false,
        idVerifiedAt: null,
        idVerifiedBy: null,
        idVerifiedRole: null,
        ...(data.type === "LICENSE" && { drivingLicenseNumber: data.documentNumber }),
        ...(data.type === "ID_PROOF" && { officialIdNumber: data.documentNumber }),
      },
    });

    revalidatePath("/driver/profile");
    revalidatePath("/operator/profile");
    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");

    return { success: true, data: doc };
  } catch (error: any) {
    console.error("[PROFILE] linkOfficialDocument error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. IN-PROFILE PASSWORD CHANGE
// ─────────────────────────────────────────────────────────────────────────────
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: "New password must be at least 4 characters long." };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User account not found." };

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        displayPassword: newPassword,
      },
    });

    return { success: true, message: "Password updated successfully!" };
  } catch (error: any) {
    console.error("[PROFILE] changeOwnPassword error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY ALIASES – keeps MyProfileModal working without rename
// ─────────────────────────────────────────────────────────────────────────────
export const getMyProfile = getOwnProfile;
export const updateMyProfile = updateOwnProfile;
