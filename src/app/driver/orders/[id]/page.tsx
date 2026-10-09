import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft, MapPin, Phone, CheckCircle2, Circle,
  Wrench, Users, Calendar, Banknote, FileText
} from "lucide-react";
import SaveLocationButton from "./SaveLocationButton";

import DriverOrderClient from "./DriverOrderClient";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/");

  const empId = session.user.employeeId;
  const role  = session.user.role;

  const dispatch = await prisma.dailyDispatch.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      machine:  true,
      lift:     true,
      vibrator: true,
      operator: { select: { name: true } },
      driver:   { select: { name: true } },
      crewAssignments: { include: { employee: true } },
      dispatchTools: { include: { tool: true } },
    },
  });

  if (!dispatch) notFound();

  // Security: only allow the assigned operator/driver (or OWNER/STAFF) to view
  const isAdmin = role === "OWNER" || role === "STAFF";
  const isAssigned = dispatch.operatorId === empId || dispatch.driverId === empId || dispatch.crewAssignments.some(mo => mo.employee?.id === empId);
  if (!isAdmin && !isAssigned) redirect("/driver/dispatches");

  // Fetch group aggregate for logistics tracking
  let groupAggregate = { operators: [] as any[], tools: [] as any[] };
  
  if (dispatch.jobGroupId) {
    const groupDispatches = await prisma.dailyDispatch.findMany({
      where: { jobGroupId: dispatch.jobGroupId },
      include: {
        operator: { select: { id: true, name: true } },
        crewAssignments: { include: { employee: true } },
        dispatchTools: { include: { tool: true } }
      }
    });

    const opMap = new Map();
    const toolMap = new Map();

    for (const gd of groupDispatches) {
      if (gd.operator) opMap.set(gd.operator.id, { id: gd.operator.id, name: gd.operator.name });
      for (const mo of gd.crewAssignments) {
        if (mo.employee) opMap.set(mo.employee.id, { id: mo.employee.id, name: mo.employee.name });
      }
      for (const dt of gd.dispatchTools) {
        if (dt.tool) {
          const key = `${dt.tool.id}-${dt.variant || 'none'}`;
          if (!toolMap.has(key)) {
            toolMap.set(key, { id: dt.tool.id, name: dt.tool.name, variant: dt.variant, quantity: 0 });
          }
          toolMap.get(key).quantity += dt.quantity;
        }
      }
    }
    
    groupAggregate.operators = Array.from(opMap.values());
    groupAggregate.tools = Array.from(toolMap.values());
  } else {
    // Fallback to single dispatch
    const opMap = new Map();
    const toolMap = new Map();
    
    if (dispatch.operator) opMap.set(dispatch.operatorId, { id: dispatch.operatorId, name: dispatch.operator.name });
    for (const mo of dispatch.crewAssignments) {
      if (mo.employee) opMap.set(mo.employee.id, { id: mo.employee.id, name: mo.employee.name });
    }
    for (const dt of dispatch.dispatchTools) {
      if (dt.tool) {
        const key = `${dt.tool.id}-${dt.variant || 'none'}`;
        toolMap.set(key, { id: dt.tool.id, name: dt.tool.name, variant: dt.variant, quantity: dt.quantity });
      }
    }
    groupAggregate.operators = Array.from(opMap.values());
    groupAggregate.tools = Array.from(toolMap.values());
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <DriverOrderClient dispatch={dispatch} userRole={role} groupAggregate={groupAggregate} />
      <div className="mt-4">
        <SaveLocationButton dispatchId={dispatch.id} />
      </div>
    </div>
  );
}
