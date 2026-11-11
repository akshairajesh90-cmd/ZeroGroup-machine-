import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// Basic Douglas-Peucker implementation for GPS smoothing
function perpendicularDistance(point: { lat: number, lng: number }, lineStart: { lat: number, lng: number }, lineEnd: { lat: number, lng: number }) {
  const x0 = point.lng, y0 = point.lat;
  const x1 = lineStart.lng, y1 = lineStart.lat;
  const x2 = lineEnd.lng, y2 = lineEnd.lat;
  
  const numerator = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
  
  if (denominator === 0) {
    // lineStart and lineEnd are exactly the same point
    return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2)) * 111000; // rough meters conversion
  }
  
  // Return rough distance in meters (1 degree ~ 111,000 meters)
  return (numerator / denominator) * 111000;
}

function douglasPeucker(points: any[], epsilon: number): any[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = douglasPeucker(points.slice(index, end + 1), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
}

export async function GET(request: Request, { params }: { params: { dispatchId: string } }) {
  try {
    const { response } = await requireAuthForApi({ allowedRoles: [Role.ADMIN, Role.OWNER, Role.STAFF] });
    if (response) return response;
    
    const { dispatchId } = params;

    const pings = await prisma.locationPing.findMany({
      where: { 
        dispatchId,
        accuracy: { lte: 50 } // Filter out GPS drift > 50 meters
      },
      orderBy: { timestamp: "asc" }
    });

    if (pings.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rawPoints = pings.map(p => ({
      id: p.id,
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      accuracy: p.accuracy,
      timestamp: p.timestamp.toISOString(),
      source: p.source
    }));

    // Apply Douglas-Peucker with a 15-meter tolerance
    const smoothedPoints = douglasPeucker(rawPoints, 15);

    return NextResponse.json({ 
      success: true, 
      data: smoothedPoints,
      meta: {
        rawCount: rawPoints.length,
        smoothedCount: smoothedPoints.length
      }
    });
  } catch (error: any) {
    console.error("Breadcrumbs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
