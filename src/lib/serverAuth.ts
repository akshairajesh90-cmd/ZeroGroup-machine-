import { auth } from "./auth";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

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
  constructor(public statusCode: 401 | 403, message: string) {
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

  const currentUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(session.user.email ? [{ email: session.user.email }] : []),
        ...(session.user.id ? [{ id: session.user.id }] : []),
      ]
    },
    include: { employee: true },
  });

  if (!currentUser) {
    if (shouldRedirect) redirect("/api/auth/force-logout");
    throw new AuthError(401, "User not found in database");
  }

  if (!currentUser.employee && !["OWNER", "ADMIN"].includes(currentUser.role)) {
    if (shouldRedirect) redirect("/api/auth/force-logout");
    throw new AuthError(401, "No employee profile linked to user");
  }

  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(currentUser.role)) {
      if (shouldRedirect) redirect("/admin/dashboard");
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
