import { updateEmployeeLocation } from "../location";
import { getStationaryFleetAlerts } from "@/lib/gis/stationaryAlerts";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auditLogger", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const mockTx = {
    dailyDispatch: { update: jest.fn() },
    dispatchStatusHistory: { create: jest.fn() },
    employee: { update: jest.fn() },
    locationPing: { create: jest.fn() },
    siteDwellCluster: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    vehicle: { update: jest.fn() },
    shiftLog: { findFirst: jest.fn(), create: jest.fn() },
  };

  return {
    prisma: {
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      dailyDispatch: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      locationPing: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      siteDwellCluster: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      systemSettings: {
        findFirst: jest.fn(),
      },
      vehicleDocument: {
        findMany: jest.fn(),
      },
      employeeDocument: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockTx)),
      _mockTx: mockTx,
    },
  };
});

describe("Stationary Filter Cadence, Dwell Cluster Lock, and Anomaly Alerts", () => {
  const mockDriverUser = {
    user: { id: "user-driver-1", employeeId: "emp-driver-1", role: "DRIVER" },
  };

  const mockEmployee = {
    id: "emp-driver-1",
    name: "Kishore Kumar",
    phone: "9847012345",
    role: "DRIVER",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue(mockDriverUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockEmployee);
    (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
      storeLatitude: 9.7118,
      storeLongitude: 76.6853, // Pala Depot
    });
  });

  describe("1. Stationary Filter & Live State Cadence", () => {
    it("always updates Employee live coordinates so live map never shows stale ghost state", async () => {
      const now = new Date();
      (prisma.locationPing.findFirst as jest.Mock).mockResolvedValue(null); // First ping
      (prisma.dailyDispatch.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await updateEmployeeLocation(9.6801, 76.7801, 15, "BROWSER", 0, null, now.getTime());

      expect(res.success).toBe(true);
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "emp-driver-1" },
          data: expect.objectContaining({
            lastLatitude: 9.6801,
            lastLongitude: 76.7801,
            lastSyncStatus: "ONLINE",
          }),
        })
      );
    });

    it("holds stationary pings under 10 minutes to avoid DB bloat while keeping live map fresh", async () => {
      const baseTime = Date.now();
      // Previous ping was 2 minutes (120s) ago at virtually same coordinates (< 5m displacement)
      (prisma.locationPing.findFirst as jest.Mock).mockResolvedValue({
        latitude: 9.6800,
        longitude: 76.7800,
        timestamp: new Date(baseTime - 120 * 1000),
        speed: 0,
      });
      (prisma.dailyDispatch.findFirst as jest.Mock).mockResolvedValue(null);

      // New ping arrives 2 mins later, moved 2 meters, speed 0 km/h
      const res = await updateEmployeeLocation(9.68001, 76.78001, 10, "BROWSER", 0, null, baseTime);

      expect(res.success).toBe(true);
      // Ping was filtered from inserting into historical LocationPing
      expect(res.pingInserted).toBe(false);
      expect(prisma.locationPing.create).not.toHaveBeenCalled();
      // BUT employee live coordinates were still refreshed for the live map!
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "emp-driver-1" },
          data: expect.objectContaining({
            lastLatitude: 9.68001,
            lastLongitude: 76.78001,
          }),
        })
      );
    });

    it("inserts a historical LocationPing after 10 minutes (600s) of stationary dwell", async () => {
      const baseTime = Date.now();
      // Previous ping was 11 minutes (660s) ago
      (prisma.locationPing.findFirst as jest.Mock).mockResolvedValue({
        latitude: 9.6800,
        longitude: 76.7800,
        timestamp: new Date(baseTime - 660 * 1000),
        speed: 0,
      });
      (prisma.dailyDispatch.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await updateEmployeeLocation(9.68001, 76.78001, 10, "BROWSER", 0, null, baseTime);

      expect(res.success).toBe(true);
      expect(res.pingInserted).toBe(true);
      expect(prisma.locationPing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId: "emp-driver-1",
            latitude: 9.68001,
            longitude: 76.78001,
          }),
        })
      );
    });
  });

  describe("2. Fraud Lock & Autopilot Geofence Arrival", () => {
    it("auto-advances EN_ROUTE to IN_PROGRESS on arrival within 100m, but does NOT verify centroid prematurely", async () => {
      const now = new Date();
      (prisma.locationPing.findFirst as jest.Mock).mockResolvedValue(null);

      const mockEnRouteDispatch = {
        id: "disp-arrival-1",
        driverId: "emp-driver-1",
        status: "EN_ROUTE",
        latitude: 9.6800,
        longitude: 76.7800,
        isCentroidVerified: false,
        isPendingDelete: false,
      };

      (prisma.dailyDispatch.findFirst as jest.Mock).mockResolvedValue(mockEnRouteDispatch);

      // Driver reaches site (within 30 meters of customer coordinates)
      const res = await updateEmployeeLocation(9.6802, 76.7802, 10, "BROWSER", 10, null, now.getTime());

      expect(res.success).toBe(true);

      const mockTx = (prisma as any)._mockTx;
      expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "disp-arrival-1" },
          data: { status: "IN_PROGRESS" }, // Verified: isCentroidVerified is NOT set to true here!
        })
      );
      expect(mockTx.dispatchStatusHistory.create).toHaveBeenCalled();
    });
  });

  describe("3. Dwell Cluster & Centroid Lock", () => {
    it("locks verified centroid after 10 minutes of active stationary dwell at site", async () => {
      const now = new Date();
      const thirtyMinsAgo = new Date(now.getTime() - 25 * 60 * 1000);

      const mockActiveDispatch = {
        id: "disp-active-1",
        driverId: "emp-driver-1",
        operatorId: "emp-operator-1",
        status: "IN_PROGRESS",
        latitude: 9.6800,
        longitude: 76.7800,
        isCentroidVerified: false,
        isPendingDelete: false,
      };

      (prisma.dailyDispatch.findFirst as jest.Mock).mockResolvedValue(mockActiveDispatch);

      // Recent pings spanning 12 minutes within 15 meters radius (stationary pouring concrete)
      const pings = [
        { latitude: 9.6800, longitude: 76.7800, timestamp: new Date(now.getTime() - 12 * 60 * 1000), speed: 0, accuracy: 10 },
        { latitude: 9.68005, longitude: 76.78005, timestamp: new Date(now.getTime() - 6 * 60 * 1000), speed: 0, accuracy: 10 },
        { latitude: 9.68002, longitude: 76.78001, timestamp: now, speed: 0, accuracy: 10 },
      ];
      (prisma.locationPing.findMany as jest.Mock).mockResolvedValue(pings);

      const res = await updateEmployeeLocation(9.68002, 76.78001, 10, "BROWSER", 0, null, now.getTime());

      expect(res.success).toBe(true);
      const mockTx = (prisma as any)._mockTx;
      expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "disp-active-1" },
          data: expect.objectContaining({
            isCentroidVerified: true,
            locationSource: "VERIFIED_CENTROID",
            locationUpdatedById: "emp-driver-1",
          }),
        })
      );
      expect(mockTx.siteDwellCluster.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "SITE_CENTROID_VERIFIED",
            targetId: "disp-active-1",
          }),
        })
      );
    });

    it("never verifies a customer site centroid if equipment is dwelling at Pala Base Depot", async () => {
      const now = new Date();
      const mockActiveDispatch = {
        id: "disp-depot-dwell",
        driverId: "emp-driver-1",
        status: "IN_PROGRESS",
        isCentroidVerified: false,
      };

      (prisma.dailyDispatch.findFirst as jest.Mock).mockResolvedValue(mockActiveDispatch);

      // Pings are right at Pala Depot (9.7118, 76.6853)
      const depotPings = [
        { latitude: 9.7118, longitude: 76.6853, timestamp: new Date(now.getTime() - 15 * 60 * 1000), speed: 0 },
        { latitude: 9.71182, longitude: 76.68531, timestamp: now, speed: 0 },
      ];
      (prisma.locationPing.findMany as jest.Mock).mockResolvedValue(depotPings);

      await updateEmployeeLocation(9.71182, 76.68531, 10, "BROWSER", 0, null, now.getTime());

      const mockTx = (prisma as any)._mockTx;
      // Centroid verification must NOT happen at the depot
      expect(mockTx.siteDwellCluster.create).not.toHaveBeenCalled();
    });
  });

  describe("4. Stationary Fleet Anomaly Alerts", () => {
    it("flags an EN_ROUTE vehicle stationary for > 30 mins outside depot and customer site", async () => {
      const now = new Date();
      const fortyMinsAgo = new Date(now.getTime() - 40 * 60 * 1000);

      // Dispatch is EN_ROUTE to a site in Poonjar (9.6800, 76.7800)
      const mockEnRouteDispatch = {
        id: "disp-anomaly-1",
        driverId: "emp-driver-1",
        status: "EN_ROUTE",
        latitude: 9.6800,
        longitude: 76.7800,
        isPendingDelete: false,
        driver: {
          id: "emp-driver-1",
          name: "Suresh G",
          phone: "9847000111",
          lastLatitude: 9.7000, // Stopped on highway between Pala (9.7118) and Poonjar (9.6800)
          lastLongitude: 76.7300,
          lastSeenAt: now,
          lastLocationUpdate: now,
        },
        vehicle: {
          id: "veh-1",
          licensePlate: "KL-35-H-4421",
          type: "FLATBED_CARRIER",
        },
        customer: {
          name: "Sunny Thomas",
          phone: "9447112233",
        },
      };

      (prisma.dailyDispatch.findMany as jest.Mock).mockResolvedValue([mockEnRouteDispatch]);

      // Driver has been stationary at (9.7000, 76.7300) for 35 minutes
      const pings = [
        { latitude: 9.7000, longitude: 76.7300, timestamp: new Date(now.getTime() - 35 * 60 * 1000) },
        { latitude: 9.70002, longitude: 76.73001, timestamp: new Date(now.getTime() - 20 * 60 * 1000) },
        { latitude: 9.70001, longitude: 76.73002, timestamp: now },
      ];
      (prisma.locationPing.findMany as jest.Mock).mockResolvedValue(pings);

      const alerts = await getStationaryFleetAlerts(30);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].vehiclePlate).toBe("KL-35-H-4421");
      expect(alerts[0].dwellMinutes).toBe(35);
      // Non-accusatory review wording
      expect(alerts[0].message).toContain("Check if crew needs assistance or breakdown support");
    });

    it("does not flag if vehicle is stationary inside Pala Depot yard", async () => {
      const now = new Date();
      const mockEnRouteDispatch = {
        id: "disp-depot-wait",
        driverId: "emp-driver-1",
        status: "EN_ROUTE",
        isPendingDelete: false,
        driver: {
          id: "emp-driver-1",
          name: "Suresh G",
          phone: "9847000111",
          lastLatitude: 9.7118, // At depot
          lastLongitude: 76.6853,
          lastSeenAt: now,
          lastLocationUpdate: now,
        },
        vehicle: { licensePlate: "KL-35-H-4421", type: "FLATBED" },
        customer: { name: "Customer A" },
      };

      (prisma.dailyDispatch.findMany as jest.Mock).mockResolvedValue([mockEnRouteDispatch]);

      const alerts = await getStationaryFleetAlerts(30);
      expect(alerts).toHaveLength(0);
    });
  });
});
