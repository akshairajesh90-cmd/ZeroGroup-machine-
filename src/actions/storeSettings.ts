"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isValidCoordinate } from "@/lib/geo";

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
    const hasLat = settings?.storeLatitude !== null && settings?.storeLatitude !== undefined;
    const hasLng = settings?.storeLongitude !== null && settings?.storeLongitude !== undefined;
    return {
      storeName: settings?.storeName || "Zero Group Main Yard & Store",
      storeAddress: settings?.storeAddress || "",
      storeLatitude: hasLat ? Number(settings!.storeLatitude) : 0,
      storeLongitude: hasLng ? Number(settings!.storeLongitude) : 0,
    };
  } catch (err) {
    console.error("Error fetching store location:", err);
    return {
      storeName: "Zero Group Main Yard & Store",
      storeAddress: "",
      storeLatitude: 0,
      storeLongitude: 0,
    };
  }
}

/**
 * Update the central Store / Base Yard location
 */
export async function updateStoreLocation(data: StoreLocationData) {
  try {
    await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

    if (!isValidCoordinate(data.storeLatitude, data.storeLongitude)) {
      return {
        success: false,
        error: "Invalid coordinates: latitude must be between -90 and 90, and longitude between -180 and 180.",
      };
    }

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

    if (latitude !== null || longitude !== null) {
      if (latitude === null || longitude === null || !isValidCoordinate(latitude, longitude)) {
        return {
          success: false,
          error: "Invalid coordinates: latitude must be between -90 and 90, and longitude between -180 and 180.",
        };
      }
    }

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
