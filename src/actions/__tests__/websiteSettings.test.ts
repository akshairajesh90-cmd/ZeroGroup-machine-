import {
  getCorporateWebsiteSettings,
  updateCorporateWebsiteSettings,
} from "../websiteSettings";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteCatalogItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    websiteValueProp: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    employee: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: (fn: any) => fn,
}));

describe("Website Settings Server Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCorporateWebsiteSettings", () => {
    it("returns default corporate settings when database has no entry", async () => {
      (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.websiteCatalogItem.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.websiteValueProp.findMany as jest.Mock).mockResolvedValue([]);

      const settings = await getCorporateWebsiteSettings(true);

      expect(settings).toBeDefined();
      expect(settings.storeName).toContain("ZERO GROUP");
      expect(settings.storeLatitude).toBe(9.5916);
      expect(settings.storeLongitude).toBe(76.5222);
      expect(settings.gstinNumber).toBe("32AAAAZ0000A1Z5");
      expect(settings.catalogItems?.length).toBeGreaterThan(0);
      expect(settings.valueProps?.length).toBeGreaterThan(0);
    });

    it("returns persisted database settings when present", async () => {
      const mockDbRecord = {
        id: "settings-1",
        storeName: "Zero Group Main Yard",
        storeAddress: "Pala Road, Kottayam",
        storeLatitude: 9.7117,
        storeLongitude: 76.6853,
        companyPhone: "+91 98471 22334",
        whatsappNumber: "+919847122334",
        companyEmail: "info@zerogroup.in",
        gstinNumber: "32BBBBZ0000B2Z6",
        heroBadge: "TEST BADGE",
        heroHeadline: "Custom Headline",
        heroSubheadline: "Custom Subheadline",
        heroPrimaryCta: "Custom Primary",
        heroSecondaryCta: "Custom Secondary",
        publicNotice: "Custom Notice",
        maintenanceMode: false,
        maintenanceNotice: "",
        emergencyPhone: "+91 94471 23456",
        districtsCovered: ["Kottayam", "Ernakulam"],
        footerCopy: "Custom Footer",
        updatedAt: new Date("2026-11-11T10:00:00Z"),
      };
      (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(mockDbRecord);
      (prisma.websiteCatalogItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          category: "Mixers",
          categorySubtext: "Heavy Duty",
          categoryIcon: "Cog",
          title: "Test Mixer",
          power: "10 HP Diesel",
          specs: ["Spec 1", "Spec 2"],
          idealFor: "Slabs",
          classification: "Heavy",
          demandTag: "High Demand",
          sortOrder: 0,
          isActive: true,
        },
      ]);
      (prisma.websiteValueProp.findMany as jest.Mock).mockResolvedValue([]);

      const settings = await getCorporateWebsiteSettings(true);

      expect(settings.storeName).toBe("Zero Group Main Yard");
      expect(settings.storeLatitude).toBe(9.7117);
      expect(settings.gstinNumber).toBe("32BBBBZ0000B2Z6");
      expect(settings.catalogItems?.[0].title).toBe("Test Mixer");
    });
  });

  describe("updateCorporateWebsiteSettings", () => {
    const validData = {
      storeName: "Zero Group Central Hub",
      storeAddress: "Industrial Area, Pala, Kerala",
      storeLatitude: 9.7117,
      storeLongitude: 76.6853,
      companyPhone: "+91 98471 99999",
      whatsappNumber: "+919847199999",
      companyEmail: "admin@zerogroup.in",
      gstinNumber: "32AAAAZ0000A1Z5",
      heroBadge: "KERALA INFRASTRUCTURE",
      heroHeadline: "Industrial Plant Hire",
      heroSubheadline: "Top Mixers & Hoists for commercial jobs",
      heroPrimaryCta: "Request Hire Quotation",
      heroSecondaryCta: "Search Plant Inventory",
      publicNotice: "Yard open 24/7",
      maintenanceMode: false,
      maintenanceNotice: "",
      emergencyPhone: "+91 94471 23456",
      districtsCovered: ["Kottayam", "Ernakulam"],
      footerCopy: "ZERO GROUP Machinery Rentals",
      headerSubtitle: "Commercial Construction Machinery & Lift Rentals",
      catalogHeading: "Certified Construction Machinery Catalog",
      catalogSubheading: "All machinery is serviced, pressure-tested, and certified prior to site mobilization.",
      inquiryHeading: "Request Machinery Hire Quotation",
      inquirySubheading: "Submit your project schedule below.",
      operatingHours: "Mon – Sun: 6:00 AM – 9:00 PM",
    };

    it("rejects invalid GPS coordinates", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ userId: "admin-1", employeeId: "emp-1", role: "ADMIN" });

      const invalidData = {
        ...validData,
        storeLatitude: 195.0, // Invalid latitude (> 90)
      };

      const result = await updateCorporateWebsiteSettings(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid Depot coordinates");
    });

    it("rejects invalid email via Zod schema", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ userId: "admin-1", employeeId: "emp-1", role: "ADMIN" });

      const invalidData = {
        ...validData,
        companyEmail: "not-an-email",
      };

      const result = await updateCorporateWebsiteSettings(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Valid email required");
    });

    it("detects OCC conflict when expectedUpdatedAt differs from current record", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ userId: "admin-1", employeeId: "emp-1", role: "ADMIN" });
      (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
        id: "settings-1",
        updatedAt: new Date("2026-11-11T12:00:00.000Z"),
      });

      const result = await updateCorporateWebsiteSettings({
        ...validData,
        expectedUpdatedAt: "2026-11-11T10:00:00.000Z", // Stale timestamp!
      });

      expect(result.success).toBe(false);
      expect((result as any).conflict).toBe(true);
      expect(result.error).toContain("STALE_DATA_CONFLICT");
    });

    it("updates existing settings successfully when authorized and OCC matches", async () => {
      const now = new Date();
      (requireAuth as jest.Mock).mockResolvedValue({ userId: "admin-1", employeeId: "emp-1", role: "ADMIN" });
      (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
        id: "settings-1",
        updatedAt: now,
      });
      (prisma.systemSettings.update as jest.Mock).mockResolvedValue({
        id: "settings-1",
        ...validData,
        updatedAt: now,
      });

      const result = await updateCorporateWebsiteSettings({
        ...validData,
        expectedUpdatedAt: now.toISOString(),
      });

      expect(result.success).toBe(true);
      expect(prisma.systemSettings.update).toHaveBeenCalledTimes(1);
    });

    it("rejects unauthenticated or unauthorized users", async () => {
      (requireAuth as jest.Mock).mockRejectedValue(new Error("Unauthorized: Role not allowed"));

      const result = await updateCorporateWebsiteSettings(validData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });
  });
});
