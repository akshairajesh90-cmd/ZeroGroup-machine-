import { auth } from "./auth";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  employeeId: string;
}

export async function requireAuth(options?: { allowedRoles?: Role[] }): Promise<AuthContext> {
  const session = await auth();

  // No session at all → go to login
  if (!session?.user?.email) {
    redirect("/");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { employee: true },
  });

  // Session email doesn't match any DB user (stale cookie after DB reset)
  // → redirect to login. NextAuth will clear the cookie on the way.
  if (!currentUser) {
    redirect("/");
  }

  // User exists but has no employee profile linked
  if (!currentUser.employee) {
    redirect("/");
  }

  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(currentUser.role)) {
      // Insufficient role — send to a safe page instead of crashing
      redirect("/admin/dashboard");
    }
  }

  return {
    userId: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    employeeId: currentUser.employee.id,
  };
}
