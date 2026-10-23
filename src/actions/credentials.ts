"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role, CrewRole } from "@prisma/client";
import { sendOtpSms } from "@/lib/sms";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In CLI test environments, static generation store is not active
  }
}

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
            resetRequested: true,
            resetRequestedAt: true,
            resetRequestNotes: true,
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
        resetRequested: emp.user?.resetRequested || false,
        resetRequestedAt: emp.user?.resetRequestedAt?.toISOString() || null,
        resetRequestNotes: emp.user?.resetRequestNotes || null,
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

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");
    safeRevalidatePath("/admin/staff");
    safeRevalidatePath("/staff/directory");

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

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");
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

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");
    safeRevalidatePath("/driver/profile");
    safeRevalidatePath("/operator/profile");
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

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");
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
        resetRequested: false,
        resetRequestedAt: null,
        resetRequestNotes: null,
      },
    });

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");
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

    if (employee.role === "ADMIN" || employee.role === "OWNER") {
      throw new Error("OTP password reset is restricted for Admin/Owner accounts.");
    }

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

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");

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

    const digitsOnly = clean.replace(/\D/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    // Find by phone or email (supporting +91, with/without country code, and email)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { employee: { phone: clean } },
          ...(last10
            ? [
                { employee: { phone: last10 } },
                { employee: { phone: `+91${last10}` } },
                { employee: { phone: `+91 ${last10}` } },
              ]
            : []),
        ],
      },
      include: { employee: true },
    });

    if (!user) {
      return { success: false, error: "No employee account found with this phone number or email." };
    }

    if (user.role === "ADMIN" || user.role === "OWNER") {
      return { success: false, error: "OTP reset is disabled for Admin accounts. Please use master credentials." };
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

    const digits = (user.employee?.phone || "").replace(/\D/g, "");
    const maskedPhone =
      digits.length >= 10
        ? `+91 ${digits.slice(-10, -7)}•••••${digits.slice(-2)}`
        : user.employee?.phone || user.email;

    // Dispatch SMS via configured gateways (Fast2SMS / Twilio) or prepare WhatsApp fallback
    let smsResult: any = null;
    const phoneToTarget = user.employee?.phone || (clean.includes("@") ? "" : clean);
    if (phoneToTarget) {
      try {
        smsResult = await sendOtpSms(phoneToTarget, otp);
      } catch (smsErr) {
        console.warn("[CREDENTIALS] SMS dispatch error:", smsErr);
      }
    }

    return {
      success: true,
      message: smsResult?.provider === "fast2sms" || smsResult?.provider === "twilio"
        ? `SMS OTP sent directly to ${maskedPhone}.`
        : "6-digit OTP has been generated. Use it within 15 minutes.",
      demoOtp: otp, // Surfaced for easy testing in development/demo
      employeeName: user.employee?.name || user.email,
      employeeRole: user.employee?.role || user.role,
      phone: user.employee?.phone || user.email,
      maskedPhone,
      smsProvider: smsResult?.provider || "dev_mode",
      whatsappUrl: smsResult?.whatsappUrl || null,
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
  firebaseVerified?: boolean;
}) {
  try {
    const clean = data.phoneOrEmail.trim().toLowerCase();
    const cleanOtp = data.otp.trim();
    const cleanPassword = data.newPassword.trim();

    if (!clean || !cleanPassword) {
      return { success: false, error: "Phone number and new password are required." };
    }

    if (!data.firebaseVerified && !cleanOtp) {
      return { success: false, error: "6-digit OTP code is required." };
    }

    if (cleanPassword.length < 4) {
      return { success: false, error: "Password must be at least 4 characters long." };
    }

    const digitsOnly = clean.replace(/\D/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { employee: { phone: clean } },
          ...(last10
            ? [
                { employee: { phone: last10 } },
                { employee: { phone: `+91${last10}` } },
                { employee: { phone: `+91 ${last10}` } },
              ]
            : []),
        ],
      },
    });

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    if (user.role === "ADMIN" || user.role === "OWNER") {
      return { success: false, error: "OTP reset is disabled for Admin accounts." };
    }

    if (!data.firebaseVerified) {
      if (!user.resetOtp || user.resetOtp !== cleanOtp) {
        return { success: false, error: "Invalid OTP code. Please check and try again." };
      }

      if (!user.resetOtpExpires || new Date() > user.resetOtpExpires) {
        return { success: false, error: "OTP has expired. Please request a new OTP code." };
      }
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

/**
 * Verify Employee Identity via Name & Email.
 * If TRUE, automatically returns and selects the registered phone number.
 */
export async function verifyNameAndEmailAction(data: { name: string; email: string }) {
  try {
    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return { success: false, error: "Please provide both your registered Full Name and Email." };
    }

    const employee = await prisma.employee.findFirst({
      where: {
        user: {
          email: cleanEmail,
        },
      },
      include: {
        user: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "No employee account found matching this email address.",
      };
    }

    const dbNameClean = employee.name.trim().toLowerCase();
    const inputNameClean = cleanName.toLowerCase();

    const isMatch =
      dbNameClean === inputNameClean ||
      dbNameClean.includes(inputNameClean) ||
      inputNameClean.includes(dbNameClean);

    if (!isMatch) {
      return {
        success: false,
        error: `The name "${cleanName}" does not match the registered records for this email address.`,
      };
    }

    if (employee.user.role === "ADMIN" || employee.user.role === "OWNER") {
      return {
        success: false,
        error: "OTP reset is strictly disabled for Admin/Owner accounts.",
      };
    }

    if (!employee.phone) {
      return {
        success: false,
        error: "No phone number is registered for this employee account. Please contact Office Staff.",
      };
    }

    const digits = employee.phone.replace(/\D/g, "");
    const maskedPhone =
      digits.length >= 10
        ? `+91 ${digits.slice(-10, -7)}•••••${digits.slice(-2)}`
        : employee.phone;

    return {
      success: true,
      employeeName: employee.name,
      employeeRole: employee.role,
      phone: employee.phone,
      maskedPhone,
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] verifyNameAndEmailAction error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. INTERNAL STAFF PASSWORD RESET REQUEST QUEUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to test if a candidate employee matches the requested role,
 * considering their primary Role, defaultCrewRole, and multiple capableRoles from crew allocation.
 */
function checkCrewRoleMatch(emp: any, requestedRole: string): boolean {
  const norm = requestedRole.toUpperCase().trim();

  // 1. Exact match with primary Role (e.g. "DRIVER", "OPERATOR", "WORKER", "STAFF")
  if (emp.role === norm) return true;

  // 2. Exact match with defaultCrewRole
  if (emp.defaultCrewRole === norm) return true;

  // 3. Match with any tagged capableRoles from crew allocation
  if (Array.isArray(emp.capableRoles) && emp.capableRoles.includes(norm)) {
    return true;
  }

  // 4. Operator crew roles group mapping
  const OPERATOR_ROLES = [
    "OPERATOR",
    "MIXER_OPERATOR",
    "HYDRAULIC_OPERATOR",
    "LIFT_OPERATOR",
    "VIBRATOR_OPERATOR",
    "P_VIBRATOR",
  ];
  if (emp.role === "OPERATOR" && OPERATOR_ROLES.includes(norm)) return true;
  if (norm === "OPERATOR" && (emp.role === "OPERATOR" || (Array.isArray(emp.capableRoles) && emp.capableRoles.some((r: string) => OPERATOR_ROLES.includes(r))))) {
    return true;
  }

  // 5. Worker crew roles group mapping
  const WORKER_ROLES = [
    "WORKER",
    "WORKER_LEADER",
    "SUB_LEADER",
    "HELPER",
    "PANI_HELPER",
    "TROLLY_1_WHEEL",
    "TROLLY_2_WHEEL",
  ];
  if (emp.role === "WORKER" && WORKER_ROLES.includes(norm)) return true;
  if (norm === "WORKER" && (emp.role === "WORKER" || (Array.isArray(emp.capableRoles) && emp.capableRoles.some((r: string) => WORKER_ROLES.includes(r))))) {
    return true;
  }

  // 6. Driver match
  if (norm === "DRIVER" && (emp.role === "DRIVER" || (Array.isArray(emp.capableRoles) && emp.capableRoles.includes("DRIVER")))) {
    return true;
  }

  return false;
}

/**
 * Public action: Submit password reset request with Name, Phone Number, and Role verification.
 * Confirms that the provided credentials match an active employee record before flagging the account,
 * supporting multiple capable crew roles from dispatch and crew allocation.
 */
export async function submitPasswordResetRequestAction(data: {
  name?: string;
  phone?: string;
  role?: string;
  identifier?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  employeeName?: string;
  employeeRole?: string;
  capableRoles?: string[];
  phone?: string;
}> {
  try {
    const cleanName = (data.name || "").trim();
    const rawPhone = (data.phone || data.identifier || "").trim();
    const requestedRole = (data.role || "").trim();

    // 1. If Name, Phone, and Role are provided: perform verified matching
    if (cleanName && rawPhone && requestedRole) {
      const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
      const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;

      const candidates = await prisma.employee.findMany({
        where: {
          isPendingDelete: false,
          OR: [
            { phone: rawPhone },
            ...(last10
              ? [
                  { phone: last10 },
                  { phone: `+91${last10}` },
                  { phone: `+91 ${last10}` },
                ]
              : []),
          ],
        },
        include: { user: true },
      });

      if (candidates.length === 0) {
        return {
          success: false,
          error: "No employee record found matching this Phone Number. Please verify your registered mobile number.",
        };
      }

      // Match name (case-insensitive, exact or substring match)
      const inputLower = cleanName.toLowerCase();
      const matchedNameEmp = candidates.find((emp) => {
        const dbLower = emp.name.trim().toLowerCase();
        return (
          dbLower === inputLower ||
          dbLower.includes(inputLower) ||
          inputLower.includes(dbLower)
        );
      });

      if (!matchedNameEmp) {
        return {
          success: false,
          error: `The name "${cleanName}" does not match the registered records for this phone number.`,
        };
      }

      // Check role match against primary Role, defaultCrewRole, and capableRoles (crew allocation)
      const isRoleValid = checkCrewRoleMatch(matchedNameEmp, requestedRole);
      if (!isRoleValid) {
        return {
          success: false,
          error: `The selected role "${requestedRole.replace(/_/g, " ")}" does not match the registered or crew allocation roles for ${matchedNameEmp.name}.`,
        };
      }

      if (matchedNameEmp.role === "ADMIN" || matchedNameEmp.role === "OWNER" || matchedNameEmp.user?.role === "ADMIN" || matchedNameEmp.user?.role === "OWNER") {
        return {
          success: false,
          error: "Password reset for Admin or Owner accounts must be requested directly with senior management.",
        };
      }

      if (!matchedNameEmp.user) {
        return {
          success: false,
          error: "No portal user login account exists for this employee. Please contact Office Staff.",
        };
      }

      // Flag user for staff reset
      await prisma.user.update({
        where: { id: matchedNameEmp.user.id },
        data: {
          resetRequested: true,
          resetRequestedAt: new Date(),
          resetRequestNotes: data.notes?.trim() || `Verified Request: ${matchedNameEmp.name} (Role: ${requestedRole})`,
        },
      });

      safeRevalidatePath("/admin/credentials");
      safeRevalidatePath("/staff/credentials");

      return {
        success: true,
        message: `Password reset request verified and forwarded to Office Staff for ${matchedNameEmp.name}.`,
        employeeName: matchedNameEmp.name,
        employeeRole: matchedNameEmp.role,
        capableRoles: matchedNameEmp.capableRoles || [],
        phone: matchedNameEmp.phone || undefined,
      };
    }

    // 2. Fallback: single identifier mode (phone/email/code)
    const raw = rawPhone || (data.identifier || "").trim();
    if (!raw) {
      return { success: false, error: "Please provide your Full Name, Phone Number, and Role." };
    }

    const clean = raw.toLowerCase();
    const digitsOnly = clean.replace(/\D/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { employee: { employeeCode: { equals: raw, mode: "insensitive" } } },
          { employee: { phone: raw } },
          ...(last10
            ? [
                { employee: { phone: last10 } },
                { employee: { phone: `+91${last10}` } },
                { employee: { phone: `+91 ${last10}` } },
              ]
            : []),
        ],
      },
      include: { employee: true },
    });

    if (!user) {
      return {
        success: false,
        error: "No employee account found matching this identifier. Please verify your details or provide Name, Phone, and Role.",
      };
    }

    if (user.role === "ADMIN" || user.role === "OWNER") {
      return {
        success: false,
        error: "Password reset for Admin or Owner accounts must be requested directly with senior management.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetRequested: true,
        resetRequestedAt: new Date(),
        resetRequestNotes: data.notes?.trim() || null,
      },
    });

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");

    return {
      success: true,
      message: "Your password reset request has been verified and forwarded to Office Staff.",
      employeeName: user.employee?.name || user.email,
      employeeRole: user.employee?.role || user.role,
      phone: user.employee?.phone || "",
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] submitPasswordResetRequestAction error:", error);
    return { success: false, error: error.message || "Failed to submit password reset request." };
  }
}

/**
 * Staff/Admin action: Get all active pending password reset requests.
 * Enforces role hierarchy: STAFF can only see operational roles (DRIVER, OPERATOR, WORKER).
 */
export async function getPendingPasswordResetRequestsAction() {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const isStaff = session.role === "STAFF";

    const pendingUsers = await prisma.user.findMany({
      where: {
        resetRequested: true,
        ...(isStaff
          ? {
              role: { notIn: ["ADMIN", "OWNER", "STAFF"] },
              employee: { isPendingDelete: false },
            }
          : {
              employee: { isPendingDelete: false },
            }),
      },
      include: {
        employee: true,
      },
      orderBy: {
        resetRequestedAt: "desc",
      },
    });

    return {
      success: true,
      data: pendingUsers.map((u) => ({
        userId: u.id,
        employeeId: u.employee?.id || null,
        name: u.employee?.name || u.email,
        email: u.email,
        phone: u.employee?.phone || "",
        role: u.employee?.role || u.role,
        capableRoles: u.employee?.capableRoles || [],
        defaultCrewRole: u.employee?.defaultCrewRole || null,
        employeeCode: u.employee?.employeeCode || `ZG-${u.id.slice(-4).toUpperCase()}`,
        resetRequestedAt: u.resetRequestedAt?.toISOString() || null,
        resetRequestNotes: u.resetRequestNotes || null,
        profilePhotoUrl: u.employee?.profilePhotoUrl || null,
      })),
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] getPendingPasswordResetRequestsAction error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Fast count of pending requests for sidebar badges.
 */
export async function getPendingPasswordResetCountAction() {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const isStaff = session.role === "STAFF";

    const count = await prisma.user.count({
      where: {
        resetRequested: true,
        ...(isStaff
          ? {
              role: { notIn: ["ADMIN", "OWNER", "STAFF"] },
              employee: { isPendingDelete: false },
            }
          : {
              employee: { isPendingDelete: false },
            }),
      },
    });

    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
}

/**
 * Staff/Admin action: Resolve a pending password reset request by either
 * updating the employee's password or dismissing the request.
 * Enforces strict role hierarchy and logs to AuditLog.
 */
export async function resolvePasswordResetRequestAction(data: {
  employeeId?: string;
  userId?: string;
  newPassword?: string;
  dismissOnly?: boolean;
}) {
  try {
    const session = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

    let targetUser: any = null;
    let targetEmployee: any = null;

    if (data.employeeId) {
      targetEmployee = await prisma.employee.findUnique({
        where: { id: data.employeeId },
        include: { user: true },
      });
      targetUser = targetEmployee?.user;
    } else if (data.userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { employee: true },
      });
      targetEmployee = targetUser?.employee;
    }

    if (!targetUser) {
      throw new Error("Target user account not found.");
    }

    const targetRole = targetEmployee?.role || targetUser.role;

    // Strict Role Guard
    if (session.role === "STAFF") {
      if (targetRole === "STAFF" || targetRole === "ADMIN" || targetRole === "OWNER") {
        throw new Error("Unauthorized: Office Staff cannot modify credentials for Staff, Admin, or Owner accounts.");
      }
    }

    if (data.dismissOnly) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          resetRequested: false,
          resetRequestedAt: null,
          resetRequestNotes: null,
        },
      });

      if (session.employeeId) {
        try {
          await prisma.auditLog.create({
            data: {
              actionType: "DISMISS_RESET_REQUEST",
              actorRole: session.role,
              actorId: session.employeeId,
              modelName: "User",
              entity: targetUser.id,
              newPayload: {
                targetName: targetEmployee?.name || targetUser.email,
                targetRole,
              },
            },
          });
        } catch (auditErr) {
          console.warn("[AUDIT] Could not create audit log:", auditErr);
        }
      }

      safeRevalidatePath("/admin/credentials");
      safeRevalidatePath("/staff/credentials");
      return { success: true, message: "Password reset request dismissed." };
    }

    // Setting password
    const newPassword = (data.newPassword || "zero123").trim();
    if (newPassword.length < 4) {
      throw new Error("New password must be at least 4 characters long.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        hashedPassword,
        displayPassword: newPassword,
        resetRequested: false,
        resetRequestedAt: null,
        resetRequestNotes: null,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    if (session.employeeId) {
      try {
        await prisma.auditLog.create({
          data: {
            actionType: "STAFF_RESET_PASSWORD",
            actorRole: session.role,
            actorId: session.employeeId,
            modelName: "User",
            entity: targetUser.id,
            newPayload: {
              targetName: targetEmployee?.name || targetUser.email,
              targetRole,
              resetTo: newPassword,
            },
          },
        });
      } catch (auditErr) {
        console.warn("[AUDIT] Could not create audit log:", auditErr);
      }
    }

    safeRevalidatePath("/admin/credentials");
    safeRevalidatePath("/staff/credentials");
    safeRevalidatePath("/staff/directory");
    safeRevalidatePath("/admin/staff");

    return {
      success: true,
      message: `Password for ${targetEmployee?.name || targetUser.email} has been updated to "${newPassword}".`,
    };
  } catch (error: any) {
    console.error("[CREDENTIALS] resolvePasswordResetRequestAction error:", error);
    return { success: false, error: error.message };
  }
}


