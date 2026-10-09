/**
 * IronRent ERP — Offline-First IndexedDB Store (Dexie)
 *
 * All field mutations (diary logs, attendance, external labor, location pings,
 * photos) are written here first. The sync engine replays them when online.
 */

import Dexie, { type EntityTable } from "dexie";

// ─── Offline queue record types ───────────────────────────────────────────────

export interface QueuedRequest {
  id?: number; // auto-increment PK
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: string; // JSON.stringify'd
  headers?: Record<string, string>;
  createdAt: number; // Date.now()
  retries: number;
  tag: string; // e.g. "diary", "attendance", "external-labor", "location-ping"
}

export interface CachedDiaryLog {
  id?: number;
  localId: string; // cuid generated client-side
  dispatchId: string;
  date: string; // ISO date string
  siteStatus: string;
  arrivalTime?: string;
  departureTime?: string;
  internalHelperCount: number;
  notes?: string;
  syncedAt?: number; // null = not yet synced
  serverId?: string; // returned from server after sync
}

export interface CachedAttendance {
  id?: number;
  localDiaryId: string;
  employeeId: string;
  isPresent: boolean;
  syncedAt?: number;
}

export interface CachedExternalLabor {
  id?: number;
  localDiaryId: string;
  subLeaderName: string;
  workerCount: number;
  cashPaid: number;
  notes?: string;
  syncedAt?: number;
}

export interface CachedEquipmentVerification {
  id?: number;
  localDiaryId: string;
  dispatchToolId: string;
  isVerified: boolean;
  syncedAt?: number;
}

export interface CachedLocationPing {
  id?: number;
  employeeId: string;
  dispatchId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  timestamp: number;
  synced: boolean;
}

// ─── Dexie database class ────────────────────────────────────────────────────

class IronRentOfflineDb extends Dexie {
  queuedRequests!: EntityTable<QueuedRequest, "id">;
  diaryLogs!: EntityTable<CachedDiaryLog, "id">;
  attendance!: EntityTable<CachedAttendance, "id">;
  externalLabor!: EntityTable<CachedExternalLabor, "id">;
  equipmentVerifications!: EntityTable<CachedEquipmentVerification, "id">;
  locationPings!: EntityTable<CachedLocationPing, "id">;

  constructor() {
    super("IronRentOfflineDB");

    this.version(2).stores({
      queuedRequests: "++id, tag, createdAt",
      diaryLogs: "++id, localId, dispatchId, date, syncedAt",
      attendance: "++id, localDiaryId, employeeId",
      externalLabor: "++id, localDiaryId",
      equipmentVerifications: "++id, localDiaryId, dispatchToolId",
      locationPings: "++id, employeeId, dispatchId, timestamp, synced",
    });
  }
}

export const offlineDb = new IronRentOfflineDb();
