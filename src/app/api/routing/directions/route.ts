import { NextRequest, NextResponse } from "next/server";
import { resolveDualPointNavigation } from "@/lib/gis/dualPointRouter";

export const dynamic = "force-dynamic";

// In-memory cache for road directions to prevent hammering OSRM
// Key: originLat,originLng:destLat,destLng
interface CachedRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMins: number;
  isRoadSnapped: boolean;
  cachedAt: number;
}

const routeCache = new Map<string, CachedRoute>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function calculatePathDistance(points: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateHaversineKm(
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );
  }
  return Math.round(total * 10) / 10;
}

/**
 * Downsamples waypoints if there are too many (OSRM limits URL length)
 */
function sampleWaypoints(points: [number, number][], maxPoints = 25): [number, number][] {
  if (points.length <= maxPoints) return points;
  const result: [number, number][] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.round(i * step);
    result.push(points[idx]);
  }
  result.push(points[points.length - 1]);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let waypoints: [number, number][] = [];

    if (Array.isArray(body.waypoints) && body.waypoints.length >= 2) {
      waypoints = body.waypoints;
    } else if (Array.isArray(body.coordinates) && body.coordinates.length >= 2) {
      waypoints = body.coordinates.map((c: any) => {
        const a = Number(c[0]);
        const b = Number(c[1]);
        if (a > 50 && b < 20) {
          return [b, a] as [number, number];
        }
        return [a, b] as [number, number];
      });
    } else if (body.origin && body.destination) {
      waypoints = [
        [Number(body.origin[0]), Number(body.origin[1])],
        [Number(body.destination[0]), Number(body.destination[1])],
      ];
    }

    let dualPoint = null;
    if (body.accessWaypoint && body.gatePin) {
      dualPoint = resolveDualPointNavigation(
        [Number(body.accessWaypoint[0]), Number(body.accessWaypoint[1])],
        [Number(body.gatePin[0]), Number(body.gatePin[1])]
      );
    }

    if (waypoints.length < 2) {
      return NextResponse.json(
        { error: "At least two coordinates (origin & destination) are required." },
        { status: 400 }
      );
    }

    // Filter invalid coordinates
    waypoints = waypoints.filter(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        !isNaN(p[0]) &&
        !isNaN(p[1]) &&
        p[0] !== 0 &&
        p[1] !== 0
    );

    if (waypoints.length < 2) {
      return NextResponse.json(
        { error: "Invalid coordinates provided." },
        { status: 400 }
      );
    }

    // Build Cache Key from sampled waypoints
    const sampled = sampleWaypoints(waypoints, 15);
    const cacheKey = sampled
      .map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`)
      .join(";");

    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        ...cached,
        fromCache: true,
      });
    }

    // Call OSRM Road Routing API
    // OSRM expects coordinates in {lon},{lat} format!
    const osrmCoords = sampled.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout

    let osrmData: any = null;
    try {
      const response = await fetch(osrmUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "ZeroGroupRoadRouter/1.0" },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        osrmData = await response.json();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn("[RoadRouter] OSRM fetch failed or timed out:", err.message);
    }

    // If OSRM returned road route successfully
    if (osrmData && osrmData.code === "Ok" && osrmData.routes?.[0]?.geometry?.coordinates) {
      const route = osrmData.routes[0];
      // Convert OSRM GeoJSON [lon, lat] back to Leaflet [lat, lng]
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMins = Math.max(1, Math.round(route.duration / 60));

      const result: CachedRoute = {
        coordinates,
        distanceKm,
        durationMins,
        isRoadSnapped: true,
        cachedAt: Date.now(),
      };

      routeCache.set(cacheKey, result);

      return NextResponse.json({
        success: true,
        ...result,
        durationMin: durationMins,
        dualPoint: dualPoint || undefined,
      });
    }

    // Fallback: Return straight lines between given waypoints
    const fallbackDist = calculatePathDistance(waypoints);
    const fallbackDuration = Math.max(1, Math.round(fallbackDist * 1.8));
    const fallbackResult: CachedRoute = {
      coordinates: waypoints,
      distanceKm: fallbackDist,
      durationMins: fallbackDuration,
      isRoadSnapped: false,
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      ...fallbackResult,
      durationMin: fallbackDuration,
      dualPoint: dualPoint || undefined,
      fallback: true,
    });
  } catch (error: any) {
    console.error("[RoadRouter] Error handling route request:", error);
    return NextResponse.json(
      { error: "Internal error calculating road route", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const originStr = searchParams.get("origin");
  const destStr = searchParams.get("destination");
  const waypointsStr = searchParams.get("waypoints");

  let waypoints: [number, number][] = [];

  if (waypointsStr) {
    waypoints = waypointsStr.split(";").map((pair) => {
      const [lat, lng] = pair.split(",").map(Number);
      return [lat, lng];
    });
  } else if (originStr && destStr) {
    const [origLat, origLng] = originStr.split(",").map(Number);
    const [destLat, destLng] = destStr.split(",").map(Number);
    waypoints = [
      [origLat, origLng],
      [destLat, destLng],
    ];
  }

  const postReq = new NextRequest(req.url, {
    method: "POST",
    body: JSON.stringify({ waypoints }),
  });

  return POST(postReq);
}
