"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
export type {
  CorporateWebsiteSettingsData,
  WebsiteCatalogItemData,
  WebsiteValuePropData,
  CatalogItemInput,
  ValuePropInput,
  UpdateWebsiteSettingsInput,
} from "@/types/websiteSettings";

import {
  UpdateWebsiteSettingsInputSchema,
  CorporateWebsiteSettingsData,
  WebsiteCatalogItemData,
  WebsiteValuePropData,
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_VALUE_PROPS,
  DEFAULT_KERALA_DISTRICTS,
} from "@/types/websiteSettings";

// In-memory Cache layer
let cachedSettings: CorporateWebsiteSettingsData | null = null;
let lastSettingsFetchTime = 0;
const SETTINGS_CACHE_TTL_MS = 60 * 1000;

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    !isNaN(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    !isNaN(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

export async function invalidateWebsiteSettingsCache(): Promise<void> {
  cachedSettings = null;
  lastSettingsFetchTime = 0;
}

// Database direct query with fallbacks
async function fetchWebsiteSettingsFromDb(): Promise<CorporateWebsiteSettingsData> {
  try {
    const [settings, catalogItemsDb, valuePropsDb] = await Promise.all([
      prisma.systemSettings.findFirst(),
      prisma.websiteCatalogItem?.findMany ? prisma.websiteCatalogItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }) : Promise.resolve([]),
      prisma.websiteValueProp?.findMany ? prisma.websiteValueProp.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }) : Promise.resolve([]),
    ]);

    const hasLat = settings?.storeLatitude !== null && settings?.storeLatitude !== undefined;
    const hasLng = settings?.storeLongitude !== null && settings?.storeLongitude !== undefined;

    const catalogItems: WebsiteCatalogItemData[] =
      catalogItemsDb && catalogItemsDb.length > 0
        ? catalogItemsDb.map((item) => ({
            id: item.id,
            category: item.category,
            categorySubtext: item.categorySubtext,
            categoryIcon: item.categoryIcon,
            title: item.title,
            power: item.power,
            specs: item.specs,
            idealFor: item.idealFor,
            classification: item.classification,
            demandTag: item.demandTag,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }))
        : DEFAULT_CATALOG_ITEMS;

    const valueProps: WebsiteValuePropData[] =
      valuePropsDb && valuePropsDb.length > 0
        ? valuePropsDb.map((vp) => ({
            id: vp.id,
            badge: vp.badge,
            title: vp.title,
            description: vp.description,
            iconName: vp.iconName,
            sortOrder: vp.sortOrder,
            isActive: vp.isActive,
          }))
        : DEFAULT_VALUE_PROPS;

    return {
      id: settings?.id,
      storeName: settings?.storeName || "ZERO GROUP Heavy Machinery & Equipment Rentals",
      storeAddress:
        settings?.storeAddress ||
        "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
      storeLatitude: hasLat ? Number(settings!.storeLatitude) : 9.5916,
      storeLongitude: hasLng ? Number(settings!.storeLongitude) : 76.5222,
      companyPhone: settings?.companyPhone || "+91 94471 23456",
      whatsappNumber: settings?.whatsappNumber || "919447123456",
      companyEmail: settings?.companyEmail || "operations@zerogroup.in",
      gstinNumber: settings?.gstinNumber || "32AAAAZ0000A1Z5",
      heroBadge: settings?.heroBadge || "KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS",
      heroHeadline: settings?.heroHeadline || "Heavy Construction Equipment & Precision Plant Logistics",
      heroSubheadline:
        settings?.heroSubheadline ||
        "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators.",
      heroPrimaryCta: settings?.heroPrimaryCta || "Request Hire Quotation",
      heroSecondaryCta: settings?.heroSecondaryCta || "Search Plant Inventory",
      publicNotice:
        settings?.publicNotice ||
        "Full machinery fleet operational. Direct flatbed site dispatch active from Central Yard.",
      maintenanceMode: Boolean(settings?.maintenanceMode),
      maintenanceNotice:
        settings?.maintenanceNotice ||
        "Notice: Scheduled fleet maintenance window. Emergency plant dispatch active via helpline.",
      emergencyPhone: settings?.emergencyPhone || "+91 94471 23456",
      districtsCovered:
        settings?.districtsCovered && settings.districtsCovered.length > 0
          ? settings.districtsCovered
          : DEFAULT_KERALA_DISTRICTS,
      footerCopy:
        settings?.footerCopy ||
        "ZERO GROUP Equipment Rentals. All commercial plant certified under Kerala industrial equipment safety guidelines.",
      headerSubtitle:
        settings?.headerSubtitle || "Commercial Construction Machinery & Lift Rentals",
      catalogHeading:
        settings?.catalogHeading || "Certified Construction Machinery Catalog",
      catalogSubheading:
        settings?.catalogSubheading ||
        "All machinery is serviced, pressure-tested, and certified prior to site mobilization.",
      inquiryHeading:
        settings?.inquiryHeading || "Request Machinery Hire Quotation",
      inquirySubheading:
        settings?.inquirySubheading ||
        "Submit your project schedule below. Central Yard dispatch will confirm machine availability and issue formal hire rates.",
      operatingHours:
        settings?.operatingHours || "Mon – Sun: 6:00 AM – 9:00 PM",
      updatedAt: settings?.updatedAt ? settings.updatedAt.toISOString() : undefined,
      catalogItems,
      valueProps,
    };
  } catch (err) {
    console.error("[websiteSettings] Error fetching settings from database:", err);
    return {
      storeName: "ZERO GROUP Heavy Machinery & Equipment Rentals",
      storeAddress: "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
      storeLatitude: 9.5916,
      storeLongitude: 76.5222,
      companyPhone: "+91 94471 23456",
      whatsappNumber: "919447123456",
      companyEmail: "operations@zerogroup.in",
      gstinNumber: "32AAAAZ0000A1Z5",
      heroBadge: "KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS",
      heroHeadline: "Heavy Construction Equipment & Precision Plant Logistics",
      heroSubheadline:
        "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators.",
      heroPrimaryCta: "Request Hire Quotation",
      heroSecondaryCta: "Search Plant Inventory",
      publicNotice: "Full machinery fleet operational. Direct flatbed site dispatch active from Central Yard.",
      maintenanceMode: false,
      maintenanceNotice: "Notice: Scheduled fleet maintenance window. Emergency plant dispatch active via helpline.",
      emergencyPhone: "+91 94471 23456",
      districtsCovered: DEFAULT_KERALA_DISTRICTS,
      footerCopy: "ZERO GROUP Equipment Rentals. All commercial plant certified under Kerala industrial equipment safety guidelines.",
      headerSubtitle: "Commercial Construction Machinery & Lift Rentals",
      catalogHeading: "Certified Construction Machinery Catalog",
      catalogSubheading: "All machinery is serviced, pressure-tested, and certified prior to site mobilization.",
      inquiryHeading: "Request Machinery Hire Quotation",
      inquirySubheading: "Submit your project schedule below. Central Yard dispatch will confirm machine availability and issue formal hire rates.",
      operatingHours: "Mon – Sun: 6:00 AM – 9:00 PM",
      catalogItems: DEFAULT_CATALOG_ITEMS,
      valueProps: DEFAULT_VALUE_PROPS,
    };
  }
}

// Cached fetcher with Next.js tags
const getCachedSettings = unstable_cache
  ? unstable_cache(
      async () => fetchWebsiteSettingsFromDb(),
      ["corporate-website-settings-tag"],
      { tags: ["website-settings"], revalidate: 60 }
    )
  : fetchWebsiteSettingsFromDb;

export async function getCorporateWebsiteSettings(
  forceRefresh = false
): Promise<CorporateWebsiteSettingsData> {
  const now = Date.now();
  if (
    process.env.NODE_ENV !== "test" &&
    !forceRefresh &&
    cachedSettings &&
    now - lastSettingsFetchTime < SETTINGS_CACHE_TTL_MS
  ) {
    return cachedSettings;
  }

  let result: CorporateWebsiteSettingsData;
  if (process.env.NODE_ENV === "test" || forceRefresh) {
    result = await fetchWebsiteSettingsFromDb();
  } else {
    try {
      result = await getCachedSettings();
    } catch {
      result = await fetchWebsiteSettingsFromDb();
    }
  }

  cachedSettings = result;
  lastSettingsFetchTime = now;
  return result;
}

export async function updateCorporateWebsiteSettings(data: unknown) {
  try {
    const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

    // Zod validation
    const parsed = UpdateWebsiteSettingsInputSchema.safeParse(data);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return { success: false, error: `Validation Failed: ${errorMsg}` };
    }

    const payload = parsed.data;

    if (!isValidCoordinate(payload.storeLatitude, payload.storeLongitude)) {
      return {
        success: false,
        error: "Invalid Depot coordinates: latitude must be between -90 and 90, longitude between -180 and 180.",
      };
    }

    // Optimistic Concurrency Control (OCC) Check
    const currentSettings = await prisma.systemSettings.findFirst();
    if (currentSettings && payload.expectedUpdatedAt) {
      const currentIso = currentSettings.updatedAt.toISOString();
      if (currentIso !== payload.expectedUpdatedAt) {
        return {
          success: false,
          conflict: true,
          error:
            "STALE_DATA_CONFLICT: Website settings were modified by another administrator since you loaded this page. Please reload before saving to avoid overwriting recent changes.",
        };
      }
    }

    // Run transaction
    const executeDbWork = async (tx: typeof prisma) => {
      // 1. Update or create SystemSettings
      let updatedSettings;
      if (!currentSettings) {
        updatedSettings = await tx.systemSettings.create({
          data: {
            storeName: payload.storeName.trim(),
            storeAddress: payload.storeAddress.trim(),
            storeLatitude: payload.storeLatitude,
            storeLongitude: payload.storeLongitude,
            companyPhone: payload.companyPhone.trim(),
            whatsappNumber: payload.whatsappNumber.replace(/\D/g, ""),
            companyEmail: payload.companyEmail.trim(),
            gstinNumber: payload.gstinNumber.trim(),
            heroBadge: payload.heroBadge?.trim() || null,
            heroHeadline: payload.heroHeadline.trim(),
            heroSubheadline: payload.heroSubheadline.trim(),
            heroPrimaryCta: payload.heroPrimaryCta?.trim() || "Request Hire Quotation",
            heroSecondaryCta: payload.heroSecondaryCta?.trim() || "Search Plant Inventory",
            publicNotice: payload.publicNotice?.trim() || null,
            maintenanceMode: payload.maintenanceMode,
            maintenanceNotice: payload.maintenanceNotice?.trim() || null,
            emergencyPhone: payload.emergencyPhone?.trim() || null,
            districtsCovered: payload.districtsCovered,
            footerCopy: payload.footerCopy?.trim() || null,
            headerSubtitle: payload.headerSubtitle?.trim() || null,
            catalogHeading: payload.catalogHeading?.trim() || null,
            catalogSubheading: payload.catalogSubheading?.trim() || null,
            inquiryHeading: payload.inquiryHeading?.trim() || null,
            inquirySubheading: payload.inquirySubheading?.trim() || null,
            operatingHours: payload.operatingHours?.trim() || null,
          },
        });
      } else {
        updatedSettings = await tx.systemSettings.update({
          where: { id: currentSettings.id },
          data: {
            storeName: payload.storeName.trim(),
            storeAddress: payload.storeAddress.trim(),
            storeLatitude: payload.storeLatitude,
            storeLongitude: payload.storeLongitude,
            companyPhone: payload.companyPhone.trim(),
            whatsappNumber: payload.whatsappNumber.replace(/\D/g, ""),
            companyEmail: payload.companyEmail.trim(),
            gstinNumber: payload.gstinNumber.trim(),
            heroBadge: payload.heroBadge?.trim() || null,
            heroHeadline: payload.heroHeadline.trim(),
            heroSubheadline: payload.heroSubheadline.trim(),
            heroPrimaryCta: payload.heroPrimaryCta?.trim() || "Request Hire Quotation",
            heroSecondaryCta: payload.heroSecondaryCta?.trim() || "Search Plant Inventory",
            publicNotice: payload.publicNotice?.trim() || null,
            maintenanceMode: payload.maintenanceMode,
            maintenanceNotice: payload.maintenanceNotice?.trim() || null,
            emergencyPhone: payload.emergencyPhone?.trim() || null,
            districtsCovered: payload.districtsCovered,
            footerCopy: payload.footerCopy?.trim() || null,
            headerSubtitle: payload.headerSubtitle?.trim() || null,
            catalogHeading: payload.catalogHeading?.trim() || null,
            catalogSubheading: payload.catalogSubheading?.trim() || null,
            inquiryHeading: payload.inquiryHeading?.trim() || null,
            inquirySubheading: payload.inquirySubheading?.trim() || null,
            operatingHours: payload.operatingHours?.trim() || null,
          },
        });
      }

      // 2. Sync WebsiteCatalogItems if provided
      if (payload.catalogItems && tx.websiteCatalogItem) {
        const incomingIds = payload.catalogItems
          .map((i) => i.id)
          .filter((id): id is string => typeof id === "string" && !id.startsWith("temp-"));

        // Delete removed items
        await tx.websiteCatalogItem.deleteMany({
          where: { id: { notIn: incomingIds } },
        });

        for (let i = 0; i < payload.catalogItems.length; i++) {
          const item = payload.catalogItems[i];
          const hasExistingId = item.id && !item.id.startsWith("temp-");

          if (hasExistingId) {
            await tx.websiteCatalogItem.upsert({
              where: { id: item.id },
              update: {
                category: item.category.trim(),
                categorySubtext: item.categorySubtext?.trim() || null,
                categoryIcon: item.categoryIcon,
                title: item.title.trim(),
                power: item.power.trim(),
                specs: item.specs,
                idealFor: item.idealFor.trim(),
                classification: item.classification.trim(),
                demandTag: item.demandTag.trim(),
                sortOrder: i,
                isActive: item.isActive,
              },
              create: {
                id: item.id,
                category: item.category.trim(),
                categorySubtext: item.categorySubtext?.trim() || null,
                categoryIcon: item.categoryIcon,
                title: item.title.trim(),
                power: item.power.trim(),
                specs: item.specs,
                idealFor: item.idealFor.trim(),
                classification: item.classification.trim(),
                demandTag: item.demandTag.trim(),
                sortOrder: i,
                isActive: item.isActive,
              },
            });
          } else {
            await tx.websiteCatalogItem.create({
              data: {
                category: item.category.trim(),
                categorySubtext: item.categorySubtext?.trim() || null,
                categoryIcon: item.categoryIcon,
                title: item.title.trim(),
                power: item.power.trim(),
                specs: item.specs,
                idealFor: item.idealFor.trim(),
                classification: item.classification.trim(),
                demandTag: item.demandTag.trim(),
                sortOrder: i,
                isActive: item.isActive,
              },
            });
          }
        }
      }

      // 3. Sync WebsiteValueProps if provided
      if (payload.valueProps && tx.websiteValueProp) {
        const incomingVpIds = payload.valueProps
          .map((vp) => vp.id)
          .filter((id): id is string => typeof id === "string" && !id.startsWith("temp-"));

        await tx.websiteValueProp.deleteMany({
          where: { id: { notIn: incomingVpIds } },
        });

        for (let i = 0; i < payload.valueProps.length; i++) {
          const vp = payload.valueProps[i];
          const hasExistingId = vp.id && !vp.id.startsWith("temp-");

          if (hasExistingId) {
            await tx.websiteValueProp.upsert({
              where: { id: vp.id },
              update: {
                badge: vp.badge.trim(),
                title: vp.title.trim(),
                description: vp.description.trim(),
                iconName: vp.iconName,
                sortOrder: i,
                isActive: vp.isActive,
              },
              create: {
                id: vp.id,
                badge: vp.badge.trim(),
                title: vp.title.trim(),
                description: vp.description.trim(),
                iconName: vp.iconName,
                sortOrder: i,
                isActive: vp.isActive,
              },
            });
          } else {
            await tx.websiteValueProp.create({
              data: {
                badge: vp.badge.trim(),
                title: vp.title.trim(),
                description: vp.description.trim(),
                iconName: vp.iconName,
                sortOrder: i,
                isActive: vp.isActive,
              },
            });
          }
        }
      }

      // 4. Audit Log entry
      if (tx.auditLog) {
        try {
          let actorId = session.employeeId;
          if (!actorId) {
            const firstEmp = await tx.employee?.findFirst({ select: { id: true } });
            actorId = firstEmp?.id || "";
          }

          if (actorId) {
            await tx.auditLog.create({
              data: {
                actorId,
                actorRole: session.role,
                actionType: "UPDATE_WEBSITE_SETTINGS",
                modelName: "SystemSettings",
                entity: "WEBSITE_CMS",
                newPayload: {
                  heroHeadline: payload.heroHeadline,
                  maintenanceMode: payload.maintenanceMode,
                  companyPhone: payload.companyPhone,
                  storeAddress: payload.storeAddress,
                  catalogItemsCount: payload.catalogItems?.length ?? 0,
                  valuePropsCount: payload.valueProps?.length ?? 0,
                },
              },
            });
          }
        } catch (auditErr) {
          console.warn("[websiteSettings] Audit logging non-blocking error:", auditErr);
        }
      }

      return updatedSettings;
    };

    if (typeof prisma.$transaction === "function") {
      await prisma.$transaction(async (tx) => executeDbWork(tx as typeof prisma));
    } else {
      await executeDbWork(prisma);
    }

    // Invalidate caches across instances
    await invalidateWebsiteSettingsCache();

    try {
      if (typeof revalidateTag === "function") {
        revalidateTag("website-settings");
      }
    } catch (tagErr) {
      console.warn("[websiteSettings] revalidateTag warning:", tagErr);
    }

    try {
      revalidatePath("/");
      revalidatePath("/login");
      revalidatePath("/admin/settings/website");
      revalidatePath("/admin/live/map");
      revalidatePath("/staff/fleet");
    } catch (pathErr) {
      console.warn("[websiteSettings] revalidatePath warning:", pathErr);
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[websiteSettings] Update error:", err);
    return { success: false, error: errorMsg };
  }
}
