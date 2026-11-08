"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isValidCoordinate } from "@/lib/geo";

export interface CorporateWebsiteSettingsData {
  storeName: string;
  storeAddress: string;
  storeLatitude: number;
  storeLongitude: number;
  companyPhone: string;
  whatsappNumber: string;
  companyEmail: string;
  gstinNumber: string;
  heroHeadline: string;
  heroSubheadline: string;
  publicNotice: string;
  maintenanceMode: boolean;
  maintenanceNotice: string;
}

export async function getCorporateWebsiteSettings(): Promise<CorporateWebsiteSettingsData> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const hasLat = settings?.storeLatitude !== null && settings?.storeLatitude !== undefined;
    const hasLng = settings?.storeLongitude !== null && settings?.storeLongitude !== undefined;

    return {
      storeName: settings?.storeName || "ZERO GROUP Heavy Machinery & Equipment Rentals",
      storeAddress: settings?.storeAddress || "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
      storeLatitude: hasLat ? Number(settings!.storeLatitude) : 9.5916,
      storeLongitude: hasLng ? Number(settings!.storeLongitude) : 76.5222,
      companyPhone: settings?.companyPhone || "+91 94470 00000",
      whatsappNumber: settings?.whatsappNumber || "919447000000",
      companyEmail: settings?.companyEmail || "operations@zerogroup.in",
      gstinNumber: settings?.gstinNumber || "32AAAAZ0000A1Z5",
      heroHeadline: settings?.heroHeadline || "Heavy Construction Equipment & Precision Plant Logistics",
      heroSubheadline: settings?.heroSubheadline || "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators.",
      publicNotice: settings?.publicNotice || "Full machinery fleet operational. Direct flatbed site dispatch active from Central Yard.",
      maintenanceMode: Boolean(settings?.maintenanceMode),
      maintenanceNotice: settings?.maintenanceNotice || "Notice: Scheduled fleet maintenance window. Emergency plant dispatch active via helpline.",
    };
  } catch (err) {
    console.error("[websiteSettings] Error fetching settings, returning corporate defaults:", err);
    return {
      storeName: "ZERO GROUP Heavy Machinery & Equipment Rentals",
      storeAddress: "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
      storeLatitude: 9.5916,
      storeLongitude: 76.5222,
      companyPhone: "+91 94470 00000",
      whatsappNumber: "919447000000",
      companyEmail: "operations@zerogroup.in",
      gstinNumber: "32AAAAZ0000A1Z5",
      heroHeadline: "Heavy Construction Equipment & Precision Plant Logistics",
      heroSubheadline: "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators.",
      publicNotice: "Full machinery fleet operational. Direct flatbed site dispatch active from Central Yard.",
      maintenanceMode: false,
      maintenanceNotice: "Notice: Scheduled fleet maintenance window. Emergency plant dispatch active via helpline.",
    };
  }
}

export async function updateCorporateWebsiteSettings(data: CorporateWebsiteSettingsData) {
  try {
    await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

    if (!isValidCoordinate(data.storeLatitude, data.storeLongitude)) {
      return {
        success: false,
        error: "Invalid Depot coordinates: latitude must be between -90 and 90, longitude between -180 and 180.",
      };
    }

    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          storeName: data.storeName.trim(),
          storeAddress: data.storeAddress.trim(),
          storeLatitude: data.storeLatitude,
          storeLongitude: data.storeLongitude,
          companyPhone: data.companyPhone.trim(),
          whatsappNumber: data.whatsappNumber.replace(/\D/g, ""),
          companyEmail: data.companyEmail.trim(),
          gstinNumber: data.gstinNumber.trim(),
          heroHeadline: data.heroHeadline.trim(),
          heroSubheadline: data.heroSubheadline.trim(),
          publicNotice: data.publicNotice.trim(),
          maintenanceMode: data.maintenanceMode,
          maintenanceNotice: data.maintenanceNotice.trim(),
        },
      });
    } else {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          storeName: data.storeName.trim(),
          storeAddress: data.storeAddress.trim(),
          storeLatitude: data.storeLatitude,
          storeLongitude: data.storeLongitude,
          companyPhone: data.companyPhone.trim(),
          whatsappNumber: data.whatsappNumber.replace(/\D/g, ""),
          companyEmail: data.companyEmail.trim(),
          gstinNumber: data.gstinNumber.trim(),
          heroHeadline: data.heroHeadline.trim(),
          heroSubheadline: data.heroSubheadline.trim(),
          publicNotice: data.publicNotice.trim(),
          maintenanceMode: data.maintenanceMode,
          maintenanceNotice: data.maintenanceNotice.trim(),
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/admin/settings/website");
    revalidatePath("/admin/live/map");
    revalidatePath("/staff/fleet");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[websiteSettings] Update error:", err);
    return { success: false, error: errorMsg };
  }
}
