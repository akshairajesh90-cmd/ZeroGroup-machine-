import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { employeeId, dispatchId, latitude, longitude, accuracy, altitude, speed, timestamp, source } = await request.json();

    if (!employeeId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ping = await prisma.locationPing.create({
      data: {
        employeeId,
        dispatchId: dispatchId || null,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        source: source || "CAPACITOR",
      },
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
