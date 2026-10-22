import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const {
      employeeId,
      dispatchId,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      timestamp,
      source,
    } = await request.json();

    if (!employeeId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pingTime = timestamp ? new Date(timestamp) : new Date();

    // 1. Create LocationPing telemetry record
    const ping = await prisma.locationPing.create({
      data: {
        employeeId,
        dispatchId: dispatchId || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: accuracy ? Number(accuracy) : null,
        altitude: altitude ? Number(altitude) : null,
        speed: speed ? Number(speed) : null,
        timestamp: pingTime,
        source: source || "CAPACITOR",
      },
    });

    // 2. Update Employee live cache so LiveMap and Admin portal show real-time position
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        lastLatitude: Number(latitude),
        lastLongitude: Number(longitude),
        lastLocationUpdate: pingTime,
        lastSeenAt: new Date(),
        lastSyncStatus: "ONLINE",
      },
    }).catch((err) => {
      console.warn("Notice: could not update employee lastLatitude:", err.message);
    });

    return NextResponse.json({ success: true, ping });
  } catch (error: any) {
    console.error("Error saving location ping:", error);
    return NextResponse.json(
      { error: "Failed to save location ping" },
      { status: 500 }
    );
  }
}
