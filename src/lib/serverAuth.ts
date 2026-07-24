import { auth } from "./auth";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  employeeId: string;
}

export async function requireAuth(options?: { allowedRoles?: Role[] }): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized: Please log in to perform this action.");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { employee: true },
  });

  if (!currentUser) {
    throw new Error("Unauthorized: User record not found.");
  }

  if (!currentUser.employee) {
    throw new Error("Unauthorized: Your user account is not linked to an employee profile.");
  }

  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(currentUser.role)) {
      throw new Error(`Security Guardrail: Action requires one of roles: ${options.allowedRoles.join(", ")}`);
    }
  }

  return {
    userId: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    employeeId: currentUser.employee.id,
  };
}
