import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    employeeId: string | null;
    operatorType?: "INTERNAL" | "SUBCONTRACTOR";
    isCrewLeader?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      employeeId: string | null;
      operatorType?: "INTERNAL" | "SUBCONTRACTOR";
      isCrewLeader?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    employeeId: string | null;
    operatorType?: "INTERNAL" | "SUBCONTRACTOR";
    isCrewLeader?: boolean;
  }
}
