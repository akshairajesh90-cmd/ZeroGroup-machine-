import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.OWNER, Role.STAFF];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch active employees with live coordinates updated in the last 60 minutes
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60000);

    const activeEmployees = await prisma.employee.findMany({
      where: {
        lastLatitude: { not: null },
        lastLongitude: { not: null },
        lastLocationUpdate: { gte: sixtyMinutesAgo },
        isPendingDelete: false,
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        profilePhotoUrl: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationUpdate: true,
        lastSyncStatus: true,
        operatorDispatches: {
          where: {
            status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED"] },
            isPendingDelete: false,
          },
          include: {
            customer: { select: { name: true, phone: true } },
            machine: { select: { machineId: true, type: true } },
          },
          orderBy: { dateOfService: "desc" },
          take: 1,
        },
        driverDispatches: {
          where: {
            status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED"] },
            isPendingDelete: false,
          },
          include: {
            customer: { select: { name: true, phone: true } },
            machine: { select: { machineId: true, type: true } },
            vehicle: { select: { licensePlate: true, type: true } },
          },
          orderBy: { dateOfService: "desc" },
          take: 1,
        },
        locationPings: {
          orderBy: { timestamp: "desc" },
          take: 2,
          select: {
            latitude: true,
            longitude: true,
            speed: true,
            accuracy: true,
            timestamp: true,
          },
        },
      },
    });

    // Helper: calculate bearing from prev ping to current ping
    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
      const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
      const brng = (Math.atan2(y, x) * 180) / Math.PI;
      return (brng + 360) % 360;
    };

    const liveData = activeEmployees.map((emp) => {
      const activeDispatch = emp.driverDispatches[0] || emp.operatorDispatches[0] || null;
      const pings = emp.locationPings || [];
      const latestPing = pings[0];
      const previousPing = pings[1];

      let bearing = 0;
      if (latestPing && previousPing) {
        bearing = calculateBearing(
          Number(previousPing.latitude),
          Number(previousPing.longitude),
          Number(latestPing.latitude),
          Number(latestPing.longitude)
        );
      }

      return {
        id: emp.id,
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        phone: emp.phone,
        profilePhotoUrl: emp.profilePhotoUrl,
        lat: Number(emp.lastLatitude),
        lng: Number(emp.lastLongitude),
        speed: latestPing?.speed ? Number(latestPing.speed) : 0,
        bearing: Math.round(bearing),
        accuracy: latestPing?.accuracy ? Number(latestPing.accuracy) : 10,
        lastUpdate: emp.lastLocationUpdate ? emp.lastLocationUpdate.toISOString() : new Date().toISOString(),
        status: emp.lastSyncStatus || "ONLINE",
        dispatch: activeDispatch
          ? {
              id: activeDispatch.id,
              location: activeDispatch.location,
              status: activeDispatch.status,
              customerName: activeDispatch.customer?.name || "Customer",
              customerPhone: activeDispatch.customer?.phone || null,
              machineId: activeDispatch.machine?.machineId || null,
              machineType: activeDispatch.machine?.type || null,
              vehiclePlate: (activeDispatch as any).vehicle?.licensePlate || null,
            }
          : null,
      };
    });

    return NextResponse.json(
      { success: true, count: liveData.length, data: liveData },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3, stale-while-revalidate=5",
        },
      }
    );
  } catch (error: any) {
    console.error("Live map API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
