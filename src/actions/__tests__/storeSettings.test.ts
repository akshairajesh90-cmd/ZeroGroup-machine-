jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: "mock-admin", role: "ADMIN" }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dailyDispatch: {
      update: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { isValidCoordinate } from "@/lib/geo";
import {
  updateStoreLocation,
  updateDispatchSiteLocation,
} from "../storeSettings";

describe("Store Settings & Coordinate Validation (Server Actions)", () => {
  describe("isValidCoordinate helper", () => {
    it("accepts valid positive and negative geographical coordinates", () => {
      expect(isValidCoordinate(9.5916, 76.5222)).toBe(true);
      expect(isValidCoordinate(-12.0463, -77.0427)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    it("rejects out-of-range latitude (> 90 or < -90)", () => {
      expect(isValidCoordinate(90.0001, 76.5222)).toBe(false);
      expect(isValidCoordinate(-90.0001, 76.5222)).toBe(false);
      expect(isValidCoordinate(150, 76.5222)).toBe(false);
    });

    it("rejects out-of-range longitude (> 180 or < -180)", () => {
      expect(isValidCoordinate(9.5916, 180.0001)).toBe(false);
      expect(isValidCoordinate(9.5916, -180.0001)).toBe(false);
      expect(isValidCoordinate(9.5916, 200)).toBe(false);
    });

    it("rejects NaN, Infinity, -Infinity, strings, and non-numeric values", () => {
      expect(isValidCoordinate(NaN, 76.5222)).toBe(false);
      expect(isValidCoordinate(9.5916, NaN)).toBe(false);
      expect(isValidCoordinate(Infinity, 76.5222)).toBe(false);
      expect(isValidCoordinate(9.5916, -Infinity)).toBe(false);
      expect(isValidCoordinate("9.5916" as any, 76.5222)).toBe(false);
      expect(isValidCoordinate(null as any, undefined as any)).toBe(false);
    });
  });

  describe("updateStoreLocation server action", () => {
    it("rejects invalid out-of-range coordinates on the server", async () => {
      const res = await updateStoreLocation({
        storeName: "Test Yard",
        storeAddress: "Pala",
        storeLatitude: 95.0, // Invalid lat > 90
        storeLongitude: 76.5,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid coordinates/i);
    });

    it("rejects NaN or non-finite coordinates on the server", async () => {
      const res = await updateStoreLocation({
        storeName: "Test Yard",
        storeAddress: "Pala",
        storeLatitude: NaN,
        storeLongitude: 76.5,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid coordinates/i);
    });
  });

  describe("updateDispatchSiteLocation server action", () => {
    it("rejects invalid out-of-range site coordinates on the server", async () => {
      const res = await updateDispatchSiteLocation({
        dispatchId: "disp-123",
        location: "Kottayam Site",
        latitude: 9.5,
        longitude: 195.0, // Invalid lng > 180
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid coordinates/i);
    });
  });
});
