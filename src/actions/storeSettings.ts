"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface StoreLocationData {
  storeName: string;
  storeAddress: string;
  storeLatitude: number;
  storeLongitude: number;
}

/**
 * Fetch the central Store / Base Yard location
 */
export async function getStoreLocation(): Promise<StoreLocationData> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    return {
      storeName: settings?.storeName || "Zero Group Main Yard & Store",
      storeAddress: settings?.storeAddress || "Pala, Kottayam, Kerala",
      storeLatitude: settings?.storeLatitude ? Number(settings.storeLatitude) : 9.5916,
      storeLongitude: settings?.storeLongitude ? Number(settings.storeLongitude) : 76.5222,
    };
  } catch (err) {
    console.error("Error fetching store location:", err);
    return {
      storeName: "Zero Group Main Yard & Store",
      storeAddress: "Pala, Kottayam, Kerala",
      storeLatitude: 9.5916,
      storeLongitude: 76.5222,
    };
  }
}

/**
 * Update the central Store / Base Yard location
 */
export async function updateStoreLocation(data: StoreLocationData) {
  try {
    await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          storeName: data.storeName,
          storeAddress: data.storeAddress,
          storeLatitude: data.storeLatitude,
          storeLongitude: data.storeLongitude,
        },
      });
    } else {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          storeName: data.storeName,
          storeAddress: data.storeAddress,
          storeLatitude: data.storeLatitude,
          storeLongitude: data.storeLongitude,
        },
      });
    }

    revalidatePath("/staff/live/map");
    revalidatePath("/admin/live/map");

    return { success: true, store: data };
  } catch (err: any) {
    console.error("Error updating store location:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update a specific Dispatch's Site Location & GPS coordinates
 */
export async function updateDispatchSiteLocation({
  dispatchId,
  location,
  latitude,
  longitude,
  mapLink,
}: {
  dispatchId: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  mapLink?: string | null;
}) {
  try {
    await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

    const finalMapLink =
      mapLink ||
      (latitude !== null && longitude !== null
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : null);

    const updated = await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: {
        location,
        latitude: latitude !== null ? Number(latitude) : null,
        longitude: longitude !== null ? Number(longitude) : null,
        mapLink: finalMapLink,
        isCentroidVerified: latitude !== null && longitude !== null,
      },
    });

    revalidatePath("/staff/live/map");
    revalidatePath("/admin/live/map");

    return {
      success: true,
      dispatch: {
        id: updated.id,
        location: updated.location,
        latitude: updated.latitude ? Number(updated.latitude) : null,
        longitude: updated.longitude ? Number(updated.longitude) : null,
        mapLink: updated.mapLink,
      },
    };
  } catch (err: any) {
    console.error("Error updating dispatch site location:", err);
    return { success: false, error: err.message };
  }
}
