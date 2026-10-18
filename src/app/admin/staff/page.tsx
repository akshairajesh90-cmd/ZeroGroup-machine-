import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import StaffPortalClient from "./StaffPortalClient";
import { getAuditLogs } from "@/actions/hr";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const currentUser = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  
  // 1. Fetch Staff Directory
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, phone: true, role: true,
      baseDailyWage: true, fixedSalary: true, capableRoles: true, roleRates: true,
    }
  });

  // 2. Fetch Audit Logs (Only if ADMIN or OWNER)
  let auditLogs: any[] = [];
  if (currentUser.role === "OWNER" || currentUser.role === "ADMIN") {
    const logsRes = await getAuditLogs();
    if (logsRes?.success) {
      auditLogs = logsRes.data || [];
    } else {
      console.error("Failed to fetch audit logs:", logsRes);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-950 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">HR & Security Portal</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage staff permissions, adjust wages, and review security audit logs.
        </p>
      </div>

      <StaffPortalClient 
        currentUserRole={currentUser.role} 
        employees={employees} 
        auditLogs={auditLogs} 
      />
    </div>
  );
}
