/**
 * Telemetry Ping API — IronRent
 * POST /api/telemetry/ping
 *
 * Receives a GPS ping from a field device, evaluates the geofence,
 * persists a LocationPing record, and updates the employee's last location.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { evaluateGeofence } from "@/lib/geofence";

export interface TelemetryPingPayload {
    dispatchId?: string;
    employeeId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    /** ISO timestamp recorded on device */
    timestamp?: string;
}

export async function POST(req: NextRequest) {
    let body: TelemetryPingPayload;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { dispatchId, employeeId, latitude, longitude, accuracy, altitude, speed, timestamp } = body;

    if (!employeeId || latitude == null || longitude == null) {
        return NextResponse.json(
            { error: "employeeId, latitude, longitude are required" },
            { status: 422 }
        );
    }

    // Evaluate geofence position (computed, not stored — schema has no geofence columns)
    const geo = evaluateGeofence(latitude, longitude);

    // Persist LocationPing using actual schema fields
    await prisma.locationPing.create({
        data: {
            employeeId,
            dispatchId: dispatchId ?? null,
            latitude,
            longitude,
            accuracy: accuracy ?? null,
            altitude: altitude ?? null,
            speed: speed ?? null,
            source: "BROWSER",
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
    });

    // Update employee's last known location
    await prisma.employee.update({
        where: { id: employeeId },
        data: {
            lastLatitude: latitude,
            lastLongitude: longitude,
            lastLocationUpdate: new Date(),
        },
    });

    return NextResponse.json({
        ok: true,
        geofence: {
            isInside: geo.isInside,
            distanceMeters: Math.round(geo.distanceMeters),
            center: geo.center,
            radiusMeters: geo.radiusMeters,
        },
    });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const dispatchId = searchParams.get("dispatchId");

    if (!dispatchId) {
        return NextResponse.json({ error: "dispatchId required" }, { status: 400 });
    }

    const pings = await prisma.locationPing.findMany({
        where: { dispatchId },
        orderBy: { timestamp: "asc" },
        take: 500,
        select: {
            id: true,
            latitude: true,
            longitude: true,
            accuracy: true,
            timestamp: true,
            employee: { select: { name: true, role: true } },
        },
    });

    // Compute geofence membership at query time (not stored in DB)
    const enrichedPings = pings.map((p) => {
        const geo = evaluateGeofence(Number(p.latitude), Number(p.longitude));
        return {
            id: p.id,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            isInsideGeofence: geo.isInside,
            distanceFromCenter: geo.distanceMeters,
            recordedAt: p.timestamp,
            employee: p.employee,
        };
    });

    return NextResponse.json({ pings: enrichedPings });
}
