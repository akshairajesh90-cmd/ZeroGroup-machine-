/**
 * Stationary Fleet & Route Anomaly Detection Engine
 * Detects vehicles/drivers that are stationary en route (> 30 mins) outside depot and site.
 * Rule 7: Never accuses field crew; flags anomalies for human review/breakdown support.
 * Rule 8: Clear, short, actionable language.
 */

import { prisma } from "@/lib/prisma";
import { getYardLocation } from "@/lib/gis/yardLocation";
import { calculateHaversineMeters } from "./dualPointRouter";

export interface StationaryFleetAlert {
  id: string;
  dispatchId: string;
  driverId: string;
  driverName: string;
  driverPhone: string | null;
  vehiclePlate: string;
  vehicleType: string | null;
  customerName: string;
  latitude: number;
  longitude: number;
  dwellMinutes: number;
  message: string;
  detectedAt: Date;
}

/**
 * Scan active en-route dispatches for stationary anomalies (> 30 minutes outside depot/site)
 */
export async function getStationaryFleetAlerts(
  minDwellMinutes: number = 30
): Promise<StationaryFleetAlert[]> {
  try {
    const yard = await getYardLocation();
    const depotLat = yard.latitude;
    const depotLng = yard.longitude;

    // Find all active dispatches currently on the road
    const enRouteDispatches = await prisma.dailyDispatch.findMany({
      where: {
        status: "EN_ROUTE",
        isPendingDelete: false,
        driverId: { not: null },
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            lastLatitude: true,
            lastLongitude: true,
            lastSeenAt: true,
            lastLocationUpdate: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            type: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (enRouteDispatches.length === 0) {
      return [];
    }

    const alerts: StationaryFleetAlert[] = [];
    const now = new Date();
    // Look back window: minDwellMinutes + 20 minutes buffer
    const windowStart = new Date(now.getTime() - (minDwellMinutes + 20) * 60 * 1000);

    for (const dispatch of enRouteDispatches) {
      if (!dispatch.driver || !dispatch.driver.lastLatitude || !dispatch.driver.lastLongitude) {
        continue;
      }

      // Check if driver was online recently (within past 60 mins)
      if (dispatch.driver.lastSeenAt) {
        const minutesSinceSeen = (now.getTime() - dispatch.driver.lastSeenAt.getTime()) / 60000;
        if (minutesSinceSeen > 60) {
          // Driver has been offline for > 1 hr, not a live stationary candidate
          continue;
        }
      }

      const curLat = Number(dispatch.driver.lastLatitude);
      const curLng = Number(dispatch.driver.lastLongitude);

      // 1. Is driver at Pala Base Yard / Depot?
      const distToDepot = calculateHaversineMeters(curLat, curLng, depotLat, depotLng);
      if (distToDepot <= 300) {
        // Still at depot/yard, not a road stationary alert
        continue;
      }

      // 2. Is driver already at the customer site?
      if (dispatch.latitude && dispatch.longitude) {
        const distToSite = calculateHaversineMeters(
          curLat,
          curLng,
          Number(dispatch.latitude),
          Number(dispatch.longitude)
        );
        if (distToSite <= 200) {
          // Already within customer site boundary
          continue;
        }
      }

      // 3. Query historical pings for this driver in the time window
      const pings = await prisma.locationPing.findMany({
        where: {
          employeeId: dispatch.driver.id,
          timestamp: { gte: windowStart },
        },
        orderBy: { timestamp: "asc" },
      });

      if (pings.length < 2) {
        continue;
      }

      const firstPing = pings[0];
      const lastPing = pings[pings.length - 1];
      const durationMinutes = (lastPing.timestamp.getTime() - firstPing.timestamp.getTime()) / 60000;

      if (durationMinutes < minDwellMinutes) {
        continue;
      }

      // 4. Verify that ALL pings in this window are clustered within 60 meters (stationary)
      const isClustered = pings.every((p) => {
        const dist = calculateHaversineMeters(curLat, curLng, Number(p.latitude), Number(p.longitude));
        return dist <= 60;
      });

      if (isClustered) {
        const dwellMins = Math.round(durationMinutes);
        const vehicleDesc = dispatch.vehicle?.licensePlate || dispatch.driver.name;

        alerts.push({
          id: `stationary-${dispatch.id}`,
          dispatchId: dispatch.id,
          driverId: dispatch.driver.id,
          driverName: dispatch.driver.name,
          driverPhone: dispatch.driver.phone,
          vehiclePlate: dispatch.vehicle?.licensePlate || "Assigned Vehicle",
          vehicleType: dispatch.vehicle?.type || null,
          customerName: dispatch.customer?.name || "Customer",
          latitude: curLat,
          longitude: curLng,
          dwellMinutes: dwellMins,
          message: `Vehicle ${vehicleDesc} has been stationary for ${dwellMins} mins en route outside depot and site. Check if crew needs assistance or breakdown support.`,
          detectedAt: now,
        });
      }
    }

    return alerts;
  } catch (err) {
    console.warn("[StationaryAlerts] Non-blocking scan error:", err);
    return [];
  }
}
