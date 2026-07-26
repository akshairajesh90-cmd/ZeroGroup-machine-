/**
 * IronRent ERP — Vehicle Patch Script
 * Updates existing vehicles to: 2 Pickup Trucks + 1 Jeep
 * Adds full shift logs, vehicle documents, fuel logs for each.
 * Idempotent — safe to re-run.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  VehicleStatus,
  DocumentType,
  DocumentStatus,
} from "@prisma/client";
import { subDays, addDays, startOfDay } from "date-fns";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] } as any);

const today = startOfDay(new Date());

// ─── Real Vehicle Data ───────────────────────────────────────────────────────
// IDs from DB (don't change these — they already have relations)
const VEHICLE_IDS = {
  pickup1: "cms0q4wbz0013s4vkw56sc9m1", // was "Flatbed Truck"
  pickup2: "cms0q4wc10014s4vkbwkcrjfg", // was "Mini Truck"
  jeep:    "cms0q4wc20015s4vkejdq7b3s", // was "Van"
};

const VEHICLE_DEFS = {
  pickup1: {
    licensePlate: "KL-10-AK-1234",
    type: "Pickup Truck",
    make: "Tata Xenon",
    color: "White",
    status: VehicleStatus.AVAILABLE,
    notes: "Primary fleet pickup — material transport",
    docs: [
      { type: DocumentType.RC,        num: "KL10AK1234RC-2023",  issueOffset: -730, expiryOffset: 730  },
      { type: DocumentType.INSURANCE, num: "HDFC-INS-PK1-2025",  issueOffset: -30,  expiryOffset: 335  },
      { type: DocumentType.FITNESS,   num: "FIT-KL10AK1234-2025",issueOffset: -90,  expiryOffset: 275  },
      { type: DocumentType.POLLUTION, num: "PUC-KL10AK1234-2025",issueOffset: -15,  expiryOffset: 75   },
    ],
  },
  pickup2: {
    licensePlate: "KL-10-AK-5678",
    type: "Pickup Truck",
    make: "Mahindra Bolero Pickup",
    color: "Silver",
    status: VehicleStatus.AVAILABLE,
    notes: "Secondary pickup — operator transport & light loads",
    docs: [
      { type: DocumentType.RC,        num: "KL10AK5678RC-2022",  issueOffset: -900, expiryOffset: 550  },
      // Insurance expiring in 12 days — compliance warning!
      { type: DocumentType.INSURANCE, num: "BAJA-INS-PK2-EXPIRING", issueOffset: -353, expiryOffset: 12 },
      { type: DocumentType.FITNESS,   num: "FIT-KL10AK5678-2025",issueOffset: -60,  expiryOffset: 305  },
      { type: DocumentType.POLLUTION, num: "PUC-KL10AK5678-2025",issueOffset: -5,   expiryOffset: 85   },
    ],
  },
  jeep: {
    licensePlate: "KL-10-BK-9001",
    type: "Jeep",
    make: "Mahindra Scorpio",
    color: "Black",
    status: VehicleStatus.REPAIR, // currently in shop
    notes: "Owner/Staff vehicle — site visits and supervision",
    docs: [
      { type: DocumentType.RC,        num: "KL10BK9001RC-2023",  issueOffset: -500, expiryOffset: 860  },
      { type: DocumentType.INSURANCE, num: "NIC-INS-JEEP-2025",  issueOffset: -20,  expiryOffset: 345  },
      // Fitness certificate EXPIRED — must fix before dispatch
      { type: DocumentType.FITNESS,   num: "FIT-JEEP-EXPIRED",   issueOffset: -400, expiryOffset: -35  },
      { type: DocumentType.POLLUTION, num: "PUC-JEEP-2025",      issueOffset: -8,   expiryOffset: 82   },
    ],
  },
};

async function main() {
  console.log("🚛 IronRent Vehicle Patch — Updating to 2 Pickups + 1 Jeep...\n");

  // ── 1. Get the OWNER employee for audit/driver references ─────────────────
  const ownerEmp = await prisma.employee.findFirst({
    where: { user: { role: "OWNER" } },
    include: { user: true },
  });
  const driverEmp = await prisma.employee.findFirst({
    where: { user: { role: "DRIVER" } },
  });

  if (!ownerEmp || !driverEmp) {
    throw new Error("Run seed-full.ts first to create users!");
  }

  // ── 2. Update each vehicle type & status ─────────────────────────────────
  console.log("📝 Updating vehicle records...");

  for (const [key, def] of Object.entries(VEHICLE_DEFS)) {
    const id = VEHICLE_IDS[key as keyof typeof VEHICLE_IDS];
    await prisma.vehicle.update({
      where: { id },
      data: {
        licensePlate: def.licensePlate,
        type: def.type,
        status: def.status,
      },
    });
    console.log(`  ✅ ${def.licensePlate} → ${def.type} (${def.status})`);
  }

  // ── 3. Wipe old docs and recreate with correct data ───────────────────────
  console.log("\n📄 Replacing vehicle documents...");

  for (const [key, def] of Object.entries(VEHICLE_DEFS)) {
    const id = VEHICLE_IDS[key as keyof typeof VEHICLE_IDS];

    // Archive old docs (soft-delete, never hard delete)
    await prisma.vehicleDocument.updateMany({
      where: { vehicleId: id, status: DocumentStatus.ACTIVE },
      data: { status: DocumentStatus.ARCHIVED },
    });

    // Create fresh docs
    for (const doc of def.docs) {
      const issueDate = subDays(today, Math.abs(doc.issueOffset));
      const expiryDate = doc.expiryOffset >= 0
        ? addDays(today, doc.expiryOffset)
        : subDays(today, Math.abs(doc.expiryOffset));
      const isExpired = expiryDate < today;

      await prisma.vehicleDocument.create({
        data: {
          vehicleId: id,
          type: doc.type,
          documentNumber: doc.num,
          issueDate,
          expiryDate,
          attachmentUrl: `https://placeholder.co/doc-${doc.num}.jpg`,
          status: isExpired ? DocumentStatus.EXPIRED : DocumentStatus.ACTIVE,
        },
      });

      const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);
      const badge = isExpired ? "🔴 EXPIRED" : daysLeft <= 30 ? `⚠️  Expires in ${daysLeft}d` : `✅ Valid ${daysLeft}d`;
      console.log(`    ${def.licensePlate} · ${doc.type.padEnd(10)} → ${badge}`);
    }
  }

  // ── 4. Add Shift Logs (past 15 days — vehicles actually used) ─────────────
  console.log("\n🗓️  Adding Shift Logs (last 15 days)...");

  const shiftEntries = [
    // Pickup 1 — active almost every day
    ...Array.from({ length: 12 }, (_, i) => ({
      vehicleId: VEHICLE_IDS.pickup1,
      driverId: driverEmp.id,
      date: subDays(today, i + 1),
      startTime: new Date(subDays(today, i + 1).setHours(7, 30, 0, 0)),
      endTime:   new Date(subDays(today, i + 1).setHours(18, 0, 0, 0)),
    })),
    // Pickup 2 — used every other day
    ...Array.from({ length: 8 }, (_, i) => ({
      vehicleId: VEHICLE_IDS.pickup2,
      driverId: driverEmp.id,
      date: subDays(today, (i * 2) + 1),
      startTime: new Date(subDays(today, (i * 2) + 1).setHours(8, 0, 0, 0)),
      endTime:   new Date(subDays(today, (i * 2) + 1).setHours(17, 30, 0, 0)),
    })),
    // Jeep — owner used until it went to repair 7 days ago
    ...Array.from({ length: 5 }, (_, i) => ({
      vehicleId: VEHICLE_IDS.jeep,
      driverId: ownerEmp.id,
      date: subDays(today, i + 8),
      startTime: new Date(subDays(today, i + 8).setHours(9, 0, 0, 0)),
      endTime:   new Date(subDays(today, i + 8).setHours(16, 0, 0, 0)),
    })),
  ];


  let shiftCount = 0;
  for (const s of shiftEntries) {
    const existing = await prisma.shiftLog.findFirst({
      where: { vehicleId: s.vehicleId, date: s.date },
    });
    if (!existing) {
      await prisma.shiftLog.create({
        data: {
          vehicleId: s.vehicleId,
          driverId: s.driverId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        },
      });
      shiftCount++;
    }
  }
  console.log(`  ✅ ${shiftCount} shift logs added.`);

  // ── 5. Update fuel logs to match correct vehicle types ─────────────────────
  console.log("\n⛽ Refreshing fuel logs for correct vehicles...");

  const fuelRefills = [
    { vehicleId: VEHICLE_IDS.pickup1, liters: 25, cost: 2875, days: 2,  odometer: 45320 },
    { vehicleId: VEHICLE_IDS.pickup1, liters: 22, cost: 2530, days: 9,  odometer: 45720 },
    { vehicleId: VEHICLE_IDS.pickup1, liters: 28, cost: 3220, days: 17, odometer: 46100 },
    { vehicleId: VEHICLE_IDS.pickup2, liters: 20, cost: 2300, days: 4,  odometer: 28180 },
    { vehicleId: VEHICLE_IDS.pickup2, liters: 18, cost: 2070, days: 12, odometer: 28440 },
    { vehicleId: VEHICLE_IDS.jeep,    liters: 30, cost: 3450, days: 10, odometer: 62150 },
    { vehicleId: VEHICLE_IDS.jeep,    liters: 26, cost: 2990, days: 22, odometer: 62550 },
  ];

  let fuelCount = 0;
  for (const f of fuelRefills) {
    const fuelDate = subDays(today, f.days);
    const existing = await prisma.fuelLog.findFirst({
      where: { vehicleId: f.vehicleId, date: fuelDate },
    });
    if (!existing) {
      await prisma.fuelLog.create({
        data: {
          vehicleId: f.vehicleId,
          driverId: driverEmp.id,
          liters: f.liters,
          totalCost: f.cost,
          odometerReading: f.odometer,
          receiptUrl: `https://placeholder.co/fuel-receipt-${f.vehicleId}-${f.days}d.jpg`,
          date: fuelDate,
        },
      });
      fuelCount++;
    }
  }
  console.log(`  ✅ ${fuelCount} fuel logs seeded.`);

  // ── 6. Print final summary ─────────────────────────────────────────────────
  console.log("\n" + "═".repeat(58));
  console.log("🎉 Vehicle Patch COMPLETE!\n");
  console.log("  Fleet Vehicles:");
  for (const [key, def] of Object.entries(VEHICLE_DEFS)) {
    const statusIcon = def.status === VehicleStatus.AVAILABLE ? "🟢" :
                       def.status === VehicleStatus.REPAIR    ? "🔴" : "🟡";
    console.log(`    ${statusIcon}  ${def.licensePlate.padEnd(18)} ${def.make.padEnd(25)} [${def.type}]`);
  }
  console.log("\n  Compliance Alerts:");
  console.log("    ⚠️  KL-10-AK-5678 Insurance expires in ~12 days");
  console.log("    🔴  KL-10-BK-9001 (Jeep) Fitness certificate EXPIRED — do not dispatch");
  console.log("═".repeat(58));
}

main()
  .catch((e) => { console.error("❌ Vehicle patch failed:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
