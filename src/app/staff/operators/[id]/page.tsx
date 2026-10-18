import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OperatorProfileClient, { SerializedOperator } from "./OperatorProfileClient";

export const dynamic = "force-dynamic";

export default async function OperatorProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !["STAFF", "ADMIN", "OWNER"].includes(session.user.role ?? "")) {
    redirect("/");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      roleRates: true,
      user: {
        select: {
          email: true,
          role: true,
        },
      },
      operatorDispatches: {
        include: {
          customer: true,
          machine: true,
          lift: true,
          vibrator: true,
          driver: true,
        },
        orderBy: { dateOfService: "desc" },
        take: 20,
      },
      driverDispatches: {
        include: {
          customer: true,
          machine: true,
        },
        orderBy: { dateOfService: "desc" },
        take: 20,
      },
      dispatchAssignments: {
        include: {
          dispatch: {
            include: {
              customer: true,
              machine: true,
              lift: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      locationPings: {
        orderBy: { timestamp: "desc" },
        take: 15,
      },
      salaryAdvances: {
        orderBy: { date: "desc" },
        take: 25,
      },
      attendanceLogs: {
        include: {
          fieldDiaryLog: {
            include: {
              dispatch: {
                include: {
                  customer: true,
                },
              },
            },
          },
        },
        orderBy: { markedAt: "desc" },
        take: 15,
      },
    },
  });

  if (!employee || employee.isPendingDelete) {
    notFound();
  }

  // Combine and sort dispatches from operatorDispatches, driverDispatches, and dispatchAssignments
  const dispatchMap = new Map<string, any>();

  // 1. Operator Dispatches
  (employee.operatorDispatches || []).forEach((d) => {
    dispatchMap.set(d.id, {
      id: d.id,
      dateOfService: d.dateOfService.toISOString(),
      customerName: d.customer?.name || "Unknown Customer",
      location: d.location,
      mapLink: d.mapLink,
      assignedRole: employee.defaultCrewRole || "OPERATOR",
      machineName: d.machine ? `${d.machine.machineId} (${d.machine.type})` : null,
      liftFloors: d.liftFloors ?? null,
      wagePaid: d.actualWagePaid ? Number(d.actualWagePaid) : (d.operatorDailyRate ? Number(d.operatorDailyRate) : null),
      status: d.status,
    });
  });

  // 2. Driver Dispatches
  (employee.driverDispatches || []).forEach((d) => {
    if (!dispatchMap.has(d.id)) {
      dispatchMap.set(d.id, {
        id: d.id,
        dateOfService: d.dateOfService.toISOString(),
        customerName: d.customer?.name || "Unknown Customer",
        location: d.location,
        mapLink: d.mapLink,
        assignedRole: "DRIVER",
        machineName: d.machine ? `${d.machine.machineId}` : null,
        liftFloors: null,
        wagePaid: null,
        status: d.status,
      });
    }
  });

  // 3. Crew Assignments (dispatchAssignments)
  (employee.dispatchAssignments || []).forEach((ca) => {
    if (ca.dispatch && !dispatchMap.has(ca.dispatch.id)) {
      dispatchMap.set(ca.dispatch.id, {
        id: ca.dispatch.id,
        dateOfService: ca.dispatch.dateOfService.toISOString(),
        customerName: ca.dispatch.customer?.name || "Unknown Customer",
        location: ca.dispatch.location,
        mapLink: ca.dispatch.mapLink,
        assignedRole: ca.assignedRole,
        machineName: ca.dispatch.machine ? `${ca.dispatch.machine.machineId}` : null,
        liftFloors: ca.dispatch.liftFloors ?? null,
        wagePaid: ca.lockedWageRate ? Number(ca.lockedWageRate) : null,
        status: ca.dispatch.status,
      });
    }
  });

  const recentDispatches = Array.from(dispatchMap.values()).sort(
    (a, b) => new Date(b.dateOfService).getTime() - new Date(a.dateOfService).getTime()
  );

  const serialized: SerializedOperator = {
    id: employee.id,
    name: employee.name,
    phone: employee.phone ?? null,
    role: employee.role,
    operatorType: (employee.operatorType as "INTERNAL" | "SUBCONTRACTOR") || "INTERNAL",
    contractorCoName: null,
    defaultCrewRole: employee.defaultCrewRole ?? null,
    capableRoles: employee.capableRoles || [],
    roleRates: (employee.roleRates || []).map((rr) => ({
      id: rr.id,
      crewRole: rr.crewRole,
      wagePerDay: Number(rr.wagePerDay),
    })),
    baseDailyWage: employee.baseDailyWage ? Number(employee.baseDailyWage) : null,
    dailyBataRate: employee.dailyBataRate ? Number(employee.dailyBataRate) : null,
    createdAt: employee.createdAt.toISOString(),
    profilePhotoUrl: employee.profilePhotoUrl ?? null,
    userEmail: employee.user?.email ?? null,
    userPin: null,
    lastLatitude: employee.lastLatitude ? Number(employee.lastLatitude) : null,
    lastLongitude: employee.lastLongitude ? Number(employee.lastLongitude) : null,
    lastLocationUpdate: employee.lastLocationUpdate ? employee.lastLocationUpdate.toISOString() : null,
    salaryAdvances: (employee.salaryAdvances || []).map((sa) => ({
      id: sa.id,
      amount: Number(sa.amount),
      date: sa.date.toISOString(),
      notes: sa.notes ?? null,
      status: sa.status,
      createdAt: sa.createdAt.toISOString(),
    })),
    locationPings: (employee.locationPings || []).map((lp) => ({
      id: lp.id,
      latitude: Number(lp.latitude),
      longitude: Number(lp.longitude),
      accuracy: lp.accuracy ?? null,
      timestamp: lp.timestamp.toISOString(),
      source: lp.source,
    })),
    recentDispatches,
    attendanceHistory: (employee.attendanceLogs || []).map((att) => ({
      id: att.id,
      markedAt: att.markedAt.toISOString(),
      customerName: att.fieldDiaryLog?.dispatch?.customer?.name || "Field Site",
      siteStatus: att.fieldDiaryLog?.siteStatus || "IN_PROGRESS",
      isPresent: att.isPresent,
    })),
  };

  return <OperatorProfileClient operator={serialized} />;
}
