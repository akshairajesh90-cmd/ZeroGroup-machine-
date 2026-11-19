import * as React from "react";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

const safeCache = typeof (React as any).cache === "function" ? (React as any).cache : (<T extends (...args: any[]) => any>(fn: T): T => fn);

// Request-scoped memoized user lookup: primary-key unique probe runs in < 1ms and deduplicates across layout/pages
const getCachedUser = safeCache(async (userId?: string, email?: string) => {
  if (userId) {
    const userById = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (userById) return userById;
  }
  if (email) {
    return prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });
  }
  return null;
});

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  employeeId: string;
  originalAdminId?: string;
  isImpersonating?: boolean;
}

// Typed errors thrown by requireAuth so API routes can catch & return proper HTTP codes
export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Use in Server Components / page.tsx → redirects on failure.
 * Use in API route handlers → catches AuthError and returns JSON 401/403.
 */
export async function requireAuth(options?: { allowedRoles?: Role[]; redirectOnFail?: boolean }): Promise<AuthContext> {
  const shouldRedirect = options?.redirectOnFail !== false;
  const session = await auth();

  const fail = (statusCode: 401 | 403, msg: string): never => {
    if (shouldRedirect) redirect("/");
    throw new AuthError(statusCode, msg);
  };

  if (!session?.user || (!session.user.email && !session.user.id)) {
    fail(401, "Unauthenticated");
  }

  // Bypass DB lookup in CLI test mode
  if (process.env.CLI_TEST_ROLE) {
    return {
      userId: process.env.CLI_TEST_USER_ID || "cli-user",
      email: session.user.email || "cli@ironrent.test",
      role: process.env.CLI_TEST_ROLE as Role,
      employeeId: process.env.CLI_TEST_EMPLOYEE_ID || "cli-emp",
    };
  }

  let currentUser = await getCachedUser(session.user.id, session.user.email);

  if (!currentUser) {
    if (shouldRedirect) redirect("/login?error=SessionExpired");
    throw new AuthError(401, "User not found in database");
  }

  if (!currentUser.employee && !["OWNER", "ADMIN"].includes(currentUser.role)) {
    // Attempt self-healing resolution before rejecting the session
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: currentUser.id },
          ...(currentUser.email ? [{ phone: currentUser.email }] : []),
        ],
      },
    });

    if (existingEmployee) {
      currentUser.employee = existingEmployee;
    } else {
      try {
        const autoEmployee = await prisma.employee.create({
          data: {
            userId: currentUser.id,
            name: currentUser.email ? currentUser.email.split("@")[0].toUpperCase() : "DRIVER",
            role: currentUser.role,
            phone: null,
            operatorType: "INTERNAL",
          },
        });
        currentUser.employee = autoEmployee;
      } catch (provisionErr) {
        console.warn("[serverAuth] Failed to auto-provision employee profile:", provisionErr);
      }
    }

    if (!currentUser.employee) {
      if (shouldRedirect) redirect("/login?error=SessionExpired");
      throw new AuthError(401, "No employee profile linked to user");
    }
  }

  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(currentUser.role)) {
      if (shouldRedirect) {
        if (currentUser.role === "DRIVER") redirect("/driver/home");
        if (currentUser.role === "OPERATOR") redirect("/operator/home");
        if (currentUser.role === "STAFF") redirect("/staff/dashboard");
        redirect("/admin/dashboard");
      }
      throw new AuthError(403, "Insufficient role");
    }
  }

  return {
    userId: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    employeeId: currentUser.employee?.id ?? currentUser.id,
    originalAdminId: (session.user as any).originalAdminId,
    isImpersonating: (session.user as any).isImpersonating,
  };
}

/**
 * Convenience wrapper for API routes — catches AuthError and returns NextResponse JSON.
 * Usage: const { ctx, response } = await requireAuthForApi({ allowedRoles: [...] });
 *        if (response) return response;
 */
export async function requireAuthForApi(options?: { allowedRoles?: Role[] }): Promise<{ ctx?: AuthContext; response?: Response }> {
  try {
    const ctx = await requireAuth({ ...options, redirectOnFail: false });
    return { ctx };
  } catch (err: any) {
    if (err instanceof AuthError) {
      const { NextResponse } = await import("next/server");
      return { response: NextResponse.json({ error: err.message }, { status: err.statusCode }) };
    }
    throw err;
  }
}
