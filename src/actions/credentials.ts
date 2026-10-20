"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role, CrewRole } from "@prisma/client";

// Helper: check if a target role is manageable by the current user
function checkManagePermission(currentUserRole: string, targetRole: Role) {
  if (currentUserRole === "STAFF") {
    if (targetRole === "ADMIN" || targetRole === "OWNER") {
      throw new Error("Unauthorized: Office Staff cannot manage Administrator or Owner accounts.");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DIRECTORY & CREDENTIALS RETRIEVAL
// ─────────────────────────────────────────────────────────────────────────────
export async function getCredentialsDirectory() {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const isStaff = session.role === "STAFF";

    const employees = await prisma.employee.findMany({
      where: isStaff
        ? { role: { notIn: ["ADMIN", "OWNER"] }, isPendingDelete: false }
        : { isPendingDelete: false },
      orderBy: { name: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayPassword: true,
            resetOtp: true,
            resetOtpExpires: true,
            role: true,
          },
        },
        documents: {
          where: { isPendingDelete: false },
          select: {
            id: true,
            type: true,
            documentNumber: true,
            attachmentUrl: true,
            status: true,
          },
        },
        roleRates: true,
      },
    });

    return {
      success: true,
      data: employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        email: emp.user?.email || "No email",
        phone: emp.phone || "",
        role: emp.role,
        address: emp.address || "",
        officialIdType: emp.officialIdType || "DRIVING_LICENSE",
        officialIdNumber: emp.officialIdNumber || "",
        drivingLicenseNumber: emp.drivingLicenseNumber || "",
        employeeCode: emp.employeeCode || `ZG-${emp.id.slice(-4).toUpperCase()}`,
        isIdVerified: emp.isIdVerified,
        idVerifiedAt: emp.idVerifiedAt?.toISOString() || null,
        idVerifiedBy: emp.idVerifiedBy || null,
        idVerifiedRole: emp.idVerifiedRole || null,
        capableRoles: emp.capableRoles || [],
        displayPassword: emp.user?.displayPassword || "••••••••",
        resetOtp: emp.user?.resetOtp || null,
        resetOtpExpires: emp.user?.resetOtpExpires?.toISOString() || null,
        documents: emp.documents || [],
        profilePhotoUrl: emp.profilePhotoUrl || null,
        baseDailyWage: emp.baseDailyWage ? Number(emp.baseDailyWage) : null,
        fixedSalary: emp.fixedSalary ? Number(emp.fixedSalary) : null,
      })),
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] getCredentialsDirectory error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CREATE NEW USER & EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────
export async function createManagedEmployee(data: {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: Role;
  address?: string;
  drivingLicenseNumber?: string;
  officialIdNumber?: string;
  employeeCode?: string;
  capableRoles?: CrewRole[];
  baseDailyWage?: number;
  fixedSalary?: number;
}) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    checkManagePermission(session.role, data.role);

    const initialPassword = data.password || "zero123";
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: data.email.trim().toLowerCase(),
          hashedPassword,
          displayPassword: initialPassword,
          role: data.role,
        },
      });

      // 2. Create Employee
      const employee = await tx.employee.create({
        data: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          role: data.role,
          address: data.address?.trim() || null,
          drivingLicenseNumber: data.drivingLicenseNumber?.trim() || null,
          officialIdNumber: data.officialIdNumber?.trim() || null,
          employeeCode: data.employeeCode?.trim() || `ZG-${Math.floor(100 + Math.random() * 900)}`,
          capableRoles: data.capableRoles || [],
          baseDailyWage: data.baseDailyWage,
          fixedSalary: data.fixedSalary,
          userId: user.id,
        },
      });

      // 3. Log Audit Action
      await tx.auditLog.create({
        data: {
          actionType: "CREATE_EMPLOYEE",
          actorRole: session.role,
          actorId: session.employeeId,
          modelName: "Employee",
          newPayload: { id: employee.id, name: data.name, role: data.role },
          entity: employee.id,
        },
      });

      return employee;
    });

    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");
    revalidatePath("/admin/staff");
    revalidatePath("/staff/directory");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[CREDENTIALS] createManagedEmployee error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UPDATE MANAGED EMPLOYEE DETAILS
// ─────────────────────────────────────────────────────────────────────────────
export async function updateManagedEmployee(
  id: string,
  data: {
    name?: string;
    phone?: string;
    address?: string;
    drivingLicenseNumber?: string;
    officialIdNumber?: string;
    employeeCode?: string;
    role?: Role;
    capableRoles?: CrewRole[];
    baseDailyWage?: number;
    fixedSalary?: number;
  }
) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const target = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!target) throw new Error("Employee not found.");
    checkManagePermission(session.role, target.role);
    if (data.role) checkManagePermission(session.role, data.role);

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.phone && { phone: data.phone.trim() }),
          ...(data.address !== undefined && { address: data.address?.trim() || null }),
          ...(data.drivingLicenseNumber !== undefined && { drivingLicenseNumber: data.drivingLicenseNumber?.trim() || null }),
          ...(data.officialIdNumber !== undefined && { officialIdNumber: data.officialIdNumber?.trim() || null }),
          ...(data.employeeCode !== undefined && { employeeCode: data.employeeCode?.trim() || null }),
          ...(data.role && { role: data.role }),
          ...(data.capableRoles && { capableRoles: { set: data.capableRoles } }),
          ...(data.baseDailyWage !== undefined && { baseDailyWage: data.baseDailyWage }),
          ...(data.fixedSalary !== undefined && { fixedSalary: data.fixedSalary }),
        },
      });

      if (data.role && target.userId) {
        await tx.user.update({
          where: { id: target.userId },
          data: { role: data.role },
        });
      }

      return emp;
    });

    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[CREDENTIALS] updateManagedEmployee error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VERIFY / REVOKE OFFICIAL ID
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyOfficialIdAction(employeeId: string) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new Error("Employee not found.");
    checkManagePermission(session.role, employee.role);

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        isIdVerified: true,
        idVerifiedAt: new Date(),
        idVerifiedBy: session.email || "Staff",
        idVerifiedRole: session.role,
      },
    });

    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");
    revalidatePath("/driver/profile");
    revalidatePath("/operator/profile");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[CREDENTIALS] verifyOfficialIdAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function revokeOfficialIdAction(employeeId: string) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new Error("Employee not found.");
    checkManagePermission(session.role, employee.role);

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        isIdVerified: false,
        idVerifiedAt: null,
        idVerifiedBy: null,
        idVerifiedRole: null,
      },
    });

    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[CREDENTIALS] revokeOfficialIdAction error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN / STAFF DIRECT PASSWORD SET
// ─────────────────────────────────────────────────────────────────────────────
export async function adminSetPasswordAction(employeeId: string, newPassword: string) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee || !employee.userId) throw new Error("Employee user account not found.");
    checkManagePermission(session.role, employee.role);

    if (!newPassword || newPassword.length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: employee.userId },
      data: {
        hashedPassword,
        displayPassword: newPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");
    return { success: true, message: `Password for ${employee.name} updated to "${newPassword}"` };
  } catch (error: any) {
    console.error("[CREDENTIALS] adminSetPasswordAction error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OTP GENERATION & VERIFICATION WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
export async function adminGenerateOtpAction(employeeId: string) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee || !employee.userId) throw new Error("Employee record not found.");
    checkManagePermission(session.role, employee.role);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: employee.userId },
      data: {
        resetOtp: otp,
        resetOtpExpires: expires,
      },
    });

    const targetIdentifier = employee.phone || employee.user?.email || "";
    const resetUrl = `/reset-password?phone=${encodeURIComponent(targetIdentifier)}`;

    revalidatePath("/admin/credentials");
    revalidatePath("/staff/credentials");

    return {
      success: true,
      otp,
      phone: targetIdentifier,
      resetUrl,
      employeeName: employee.name,
      expiresAt: expires.toISOString(),
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] adminGenerateOtpAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function requestPasswordResetOtp(phoneOrEmail: string) {
  try {
    const clean = phoneOrEmail.trim().toLowerCase();
    if (!clean) return { success: false, error: "Please enter your phone number or email." };

    // Find by phone or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { employee: { phone: clean } },
        ],
      },
      include: { employee: true },
    });

    if (!user) {
      return { success: false, error: "No employee account found with this phone number or email." };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: expires,
      },
    });

    console.log(`[AUTH OTP] Generated OTP for ${clean}: ${otp}`);

    return {
      success: true,
      message: "6-digit OTP has been generated. Use it within 15 minutes.",
      demoOtp: otp, // Surfaced for easy testing in development/demo
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] requestPasswordResetOtp error:", error);
    return { success: false, error: error.message };
  }
}

export async function verifyOtpAndResetPassword(data: {
  phoneOrEmail: string;
  otp: string;
  newPassword: string;
}) {
  try {
    const clean = data.phoneOrEmail.trim().toLowerCase();
    const cleanOtp = data.otp.trim();
    const cleanPassword = data.newPassword.trim();

    if (!clean || !cleanOtp || !cleanPassword) {
      return { success: false, error: "All fields are required." };
    }

    if (cleanPassword.length < 4) {
      return { success: false, error: "Password must be at least 4 characters long." };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { employee: { phone: clean } },
        ],
      },
    });

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    if (!user.resetOtp || user.resetOtp !== cleanOtp) {
      return { success: false, error: "Invalid OTP code. Please check and try again." };
    }

    if (!user.resetOtpExpires || new Date() > user.resetOtpExpires) {
      return { success: false, error: "OTP has expired. Please request a new OTP code." };
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        displayPassword: cleanPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    return {
      success: true,
      message: "Password successfully updated! You can now log in.",
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] verifyOtpAndResetPassword error:", error);
    return { success: false, error: error.message };
  }
}
