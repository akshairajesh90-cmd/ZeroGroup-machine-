/**
 * IronRent ERP — Full Data Seed V1.0
 * Idempotent: safe to run multiple times (upsert pattern everywhere)
 * Covers: Admin, Staff, Drivers, Operators, Workers, Machines, Vehicles,
 *         Customers, Dispatches (past 30 days + today + tomorrow),
 *         Maintenance Tickets, Fuel Logs, Vehicle Documents
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient, Role, MachineType, MachineStatus,
  VehicleStatus, WorkType, DispatchStatus,
  MaintenanceStatus, DocumentType, DocumentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, addDays, startOfDay } from "date-fns";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:Akshai%402005@localhost:5432/zerogroup?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] } as any);

const today = startOfDay(new Date());
const HASH = bcrypt.hashSync("password123", 10);
const ADMIN_HASH = bcrypt.hashSync("admin123", 10);

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function upsertUser(email: string, role: Role) {
  const userHash = email === "akshairajesh07@gmail.com" ? ADMIN_HASH : HASH;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, hashedPassword: userHash, role },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword: userHash, role },
    });
  }
  return user;
}

async function upsertEmployee(name: string, email: string, role: Role, fixedSalary?: number) {
  const user = await upsertUser(email, role);
  const emp = await prisma.employee.upsert({
    where: { userId: user.id },
    update: { name, role },
    create: { name, role, userId: user.id, fixedSalary },
  });
  return emp;
}

async function upsertCustomer(name: string, phone: string, address: string) {
  const existing = await prisma.customer.findFirst({ where: { phone } });
  if (existing) return existing;
  return prisma.customer.create({ data: { name, phone, address } });
}

async function upsertMachine(machineId: string, type: MachineType, payout: number, threshold: number, notes?: string) {
  return prisma.machine.upsert({
    where: { machineId },
    update: { type, operatorDailyPayout: payout, fuelConsumptionThreshold: threshold, notes },
    create: { machineId, type, status: MachineStatus.AVAILABLE, operatorDailyPayout: payout, fuelConsumptionThreshold: threshold, notes },
  });
}

async function upsertVehicle(licensePlate: string, type: string) {
  const existing = await prisma.vehicle.findUnique({ where: { licensePlate } });
  if (existing) return existing;
  return prisma.vehicle.create({ data: { licensePlate, type, status: VehicleStatus.AVAILABLE } });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 IronRent Full Seed Engine V1.0 — Starting...\n");

  // ══════════════════════════════════════════════════════════════════
  // 1. USERS & EMPLOYEES
  // ══════════════════════════════════════════════════════════════════
  console.log("👥 Seeding Users & Employees...");

  // Owner / Admin
  const owner = await upsertEmployee("Akshai Rajesh (Owner)", "akshairajesh07@gmail.com", Role.OWNER, 50000);
  const staff1 = await upsertEmployee("Priya Menon (Office Staff)", "priya@zerogroup.in", Role.STAFF, 18000);
  const staff2 = await upsertEmployee("Roshan Varma (Office Staff)", "roshan@zerogroup.in", Role.STAFF, 16000);

  // Drivers
  const drivers = await Promise.all([
    upsertEmployee("Suresh Kumar (Driver)", "suresh@zerogroup.in", Role.DRIVER),
    upsertEmployee("Babu Antony (Driver)", "babu@zerogroup.in", Role.DRIVER),
    upsertEmployee("Rajan Pillai (Driver)", "rajan@zerogroup.in", Role.DRIVER),
  ]);

  // Operators
  const operators = await Promise.all([
    upsertEmployee("Rajesh bhai (Senior Operator)", "rajesh@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Subil Kumar (Operator)", "subil@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Pokkan (Lift & Machine Operator)", "pokkan@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Tapan (Vibrator & Trolly Operator)", "tapan@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Pulkith (Machine Operator)", "pulkith@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Sanjay (Vibrator Operator)", "sanjay@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Kailas (Machine Operator)", "kailas@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Tuna (Machine Operator)", "tuna@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Mutta (Trolly Operator)", "mutta@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Amith (New Operator)", "amith@zerogroup.in", Role.OPERATOR),
    upsertEmployee("Vijay (Operator)", "vijay@zerogroup.in", Role.OPERATOR),
  ]);

  // Workers (on-site helpers)
  const workers = await Promise.all([
    upsertEmployee("Jose Mestri (Lead Worker)", "jose@zerogroup.in", Role.WORKER),
    upsertEmployee("Biju (Helper)", "biju@zerogroup.in", Role.WORKER),
    upsertEmployee("Shibu (Helper)", "shibu@zerogroup.in", Role.WORKER),
    upsertEmployee("Rajan Helper (Worker)", "rajanhelper@zerogroup.in", Role.WORKER),
    upsertEmployee("Nizam (Helper)", "nizam@zerogroup.in", Role.WORKER),
  ]);

  console.log(`  ✅ ${3 + 3 + 11 + 5} users/employees seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 2. MACHINES
  // ══════════════════════════════════════════════════════════════════
  console.log("🔧 Seeding Machines...");

  const machines = {
    mix1: await upsertMachine("MIX-001", MachineType.MIXER, 1200, 2000, "Standard Mixer — Primary"),
    mix2: await upsertMachine("MIX-002", MachineType.MIXER, 1200, 2000, "Standard Mixer — Backup"),
    mix3: await upsertMachine("MIX-003", MachineType.MIXER, 1500, 2500, "Hydraulic Mixer"),
    lft1: await upsertMachine("LFT-001", MachineType.LIFT, 1500, 1500, "Lift (3-Floor)"),
    lft2: await upsertMachine("LFT-002", MachineType.LIFT, 1500, 1500, "Lift (2-Floor)"),
    vib1: await upsertMachine("VIB-001", MachineType.VIBRATOR, 1000, 500, "Petrol Vibrator"),
    vib2: await upsertMachine("VIB-002", MachineType.VIBRATOR, 800, 400, "Electric Vibrator"),
    pan1: await upsertMachine("PAN-001", MachineType.PANI, 900, 800, "Water Pump"),
  };

  console.log(`  ✅ ${Object.keys(machines).length} machines seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 3. VEHICLES
  // ══════════════════════════════════════════════════════════════════
  console.log("🚛 Seeding Vehicles...");

  const vehicles = {
    truck1: await upsertVehicle("KL-10-AK-1234", "Flatbed Truck"),
    truck2: await upsertVehicle("KL-10-AK-5678", "Mini Truck"),
    van1: await upsertVehicle("KL-10-BK-9001", "Van"),
  };

  console.log(`  ✅ ${Object.keys(vehicles).length} vehicles seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 4. CUSTOMERS
  // ══════════════════════════════════════════════════════════════════
  console.log("🏗️ Seeding Customers...");

  const custs = {
    swami: await upsertCustomer("സ്വാമി നടാൽ (Swami - Nadal)", "9048640535", "Nadakkal / Nadal"),
    sakeer: await upsertCustomer("Sakeer Vadakkan", "9847340839", "Vadakkan Site"),
    shibili: await upsertCustomer("Shibili Mathamangalam", "8075883840", "Mathamangalam"),
    raju: await upsertCustomer("Raju Kunnoni", "9496412920", "Kunnoni"),
    anas: await upsertCustomer("Anas Kanjirappally", "8848796317", "Kanjirappally"),
    murali: await upsertCustomer("Murali Unichamara", "9446197584", "Unichamara"),
    noble: await upsertCustomer("Noble (Noble Site)", "7907141698", "Noble Local Site"),
    madhu: await upsertCustomer("Madhu Bhai Nadakkal", "7012670678", "Nadakkal / Ullanpara"),
    manikandan: await upsertCustomer("Manikandan Konippada", "7306148480", "Konippada"),
    jose: await upsertCustomer("Jose Mestri Site", "9847272234", "Jose Mestri Site"),
    faisal: await upsertCustomer("Faisal Odayakkal", "7907246126", "Odayakkal"),
    pookoth: await upsertCustomer("Manoj Pookoth", "9447112233", "Pookoth"),
    siddique: await upsertCustomer("Siddique Nellikunnu", "9447000001", "Nellikunnu"),
    plywood: await upsertCustomer("Plywood Company", "9447223344", "Industrial Area"),
    lnt: await upsertCustomer("L&T Construction Pvt Ltd", "9000000001", "L&T Site - City Center"),
    sobha: await upsertCustomer("Sobha Developers", "9000000002", "Sobha Site - North Zone"),
  };

  console.log(`  ✅ ${Object.keys(custs).length} customers seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 5. DAILY DISPATCHES — Past 30 Days + Today + Tomorrow
  // ══════════════════════════════════════════════════════════════════
  console.log("📋 Seeding Dispatches (last 30 days + today + tomorrow)...");

  const machineArr = Object.values(machines);
  const custArr = Object.values(custs);
  const opArr = operators;
  const drvArr = drivers;
  const wrkArr = workers;

  const locations = [
    "Nadakkal", "Mathamangalam", "Kunnoni", "Vadakkan Site", "Pookoth",
    "Kanjirappally", "Unichamara", "Noble Site", "Odayakkal", "Konippada",
    "Jose Mestri Site", "Ullanpara", "Nellikunnu", "Industrial Area", "City Center",
  ];

  let dispatchCount = 0;

  // Build date range: -30 days to +1 day
  const dateRange: { date: Date; daysOffset: number }[] = [];
  for (let i = -30; i <= 1; i++) {
    dateRange.push({ date: i === 0 ? today : (i < 0 ? subDays(today, Math.abs(i)) : addDays(today, i)), daysOffset: i });
  }

  for (const { date, daysOffset } of dateRange) {
    const isPast = daysOffset < 0;
    const isToday = daysOffset === 0;
    const isTomorrow = daysOffset === 1;

    // Vary jobs per day: 2-5 dispatches
    const numJobs = isPast ? ((Math.abs(daysOffset) % 3) + 2) : (isToday ? 3 : 2);

    for (let j = 0; j < numJobs; j++) {
      const machine = machineArr[j % machineArr.length];
      const customer = custArr[(daysOffset + j + 30) % custArr.length];
      const operator = opArr[j % opArr.length];
      const driver = drvArr[j % drvArr.length];
      const worker = wrkArr[j % wrkArr.length];
      const location = locations[(daysOffset + j + 30) % locations.length];

      let status: DispatchStatus;
      if (isTomorrow) {
        status = DispatchStatus.PENDING;
      } else if (isToday) {
        status = j === 0 ? DispatchStatus.IN_PROGRESS : (j === 1 ? DispatchStatus.COMPLETED : DispatchStatus.PENDING);
      } else {
        // Past: mostly completed, some cancelled
        const cancelIndex = [3, 7, 12, 18, 24];
        status = cancelIndex.includes(Math.abs(daysOffset)) && j === 1
          ? DispatchStatus.CANCELLED
          : DispatchStatus.COMPLETED;
      }

      const customerCharge = [4500, 5000, 5500, 6000, 6500, 7000][j % 6];
      const helperCount = [4, 6, 8, 10, 12][j % 5];
      const isCancelled = status === DispatchStatus.CANCELLED;

      // Idempotent: find existing dispatch for this date+machine+location combo
      const existing = await prisma.dailyDispatch.findFirst({
        where: {
          machineId: machine.id,
          dateOfService: date,
          location,
        },
      });

      if (!existing) {
        await prisma.dailyDispatch.create({
          data: {
            customerId: customer.id,
            machineId: machine.id,
            driverId: driver.id,
            operatorId: operator.id,
            mainHelperId: worker.id,
            location,
            dateOfService: date,
            status,
            workType: WorkType.NORMAL,
            customerCharge: isCancelled ? 0 : customerCharge,
            operatorDailyRate: isCancelled ? 0 : machine.operatorDailyPayout,
            helperCount: isCancelled ? 0 : helperCount,
            version: 1,
          },
        });

        dispatchCount++;
      }
    }
  }

  console.log(`  ✅ ${dispatchCount} dispatches seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 6. MAINTENANCE TICKETS
  // ══════════════════════════════════════════════════════════════════
  console.log("🔩 Seeding Maintenance Tickets...");

  const ticketCheck1 = await prisma.maintenanceTicket.findFirst({
    where: { machineId: machines.mix2.id, status: MaintenanceStatus.RESOLVED },
  });
  if (!ticketCheck1) {
    await prisma.maintenanceTicket.create({
      data: {
        machineId: machines.mix2.id,
        issueDescription: "Engine belt worn out — slipping under load",
        mechanicName: "Abdul (Mechanic)",
        partsCost: 1200,
        laborCost: 500,
        status: MaintenanceStatus.RESOLVED,
        resolvedAt: subDays(today, 5),
      },
    });
  }

  const ticketCheck2 = await prisma.maintenanceTicket.findFirst({
    where: { machineId: machines.vib1.id, status: MaintenanceStatus.IN_PROGRESS },
  });
  if (!ticketCheck2) {
    await prisma.maintenanceTicket.create({
      data: {
        machineId: machines.vib1.id,
        issueDescription: "Vibrator shaft bent — needs replacement",
        mechanicName: "Abdul (Mechanic)",
        partsCost: 800,
        laborCost: 400,
        status: MaintenanceStatus.IN_PROGRESS,
      },
    });
    // Set VIB-001 to REPAIR status
    await prisma.machine.update({
      where: { id: machines.vib1.id },
      data: { status: MachineStatus.REPAIR },
    });
  }

  const ticketCheck3 = await prisma.maintenanceTicket.findFirst({
    where: { vehicleId: vehicles.van1.id },
  });
  if (!ticketCheck3) {
    await prisma.maintenanceTicket.create({
      data: {
        vehicleId: vehicles.van1.id,
        issueDescription: "Front brake pads worn — brake fluid top-up needed",
        mechanicName: "Manoj Garage (Mechanic)",
        partsCost: 650,
        laborCost: 300,
        status: MaintenanceStatus.OPEN,
      },
    });
    await prisma.vehicle.update({
      where: { id: vehicles.van1.id },
      data: { status: VehicleStatus.REPAIR },
    });
  }

  console.log("  ✅ 3 maintenance tickets seeded.\n");

  // ══════════════════════════════════════════════════════════════════
  // 7. FUEL LOGS
  // ══════════════════════════════════════════════════════════════════
  console.log("⛽ Seeding Fuel Logs...");

  const fuelEntries = [
    { machineId: machines.mix1.id, liters: 12, totalCost: 1200, days: 2 },
    { machineId: machines.lft1.id, liters: 8, totalCost: 800, days: 5 },
    { machineId: machines.mix3.id, liters: 15, totalCost: 1500, days: 7 },
    { machineId: machines.lft2.id, liters: 6, totalCost: 600, days: 10 },
    { vehicleId: vehicles.truck1.id, liters: 20, totalCost: 2000, days: 3 },
    { vehicleId: vehicles.truck2.id, liters: 18, totalCost: 1800, days: 6 },
    { machineId: machines.mix1.id, liters: 10, totalCost: 1000, days: 14 },
    { machineId: machines.mix2.id, liters: 11, totalCost: 1100, days: 18 },
  ];

  let fuelCount = 0;
  for (const entry of fuelEntries) {
    const fuelDate = subDays(today, entry.days);
    const existing = await prisma.fuelLog.findFirst({
      where: {
        machineId: entry.machineId,
        vehicleId: entry.vehicleId,
        date: fuelDate,
      },
    });
    if (!existing) {
      await prisma.fuelLog.create({
        data: {
          machineId: entry.machineId,
          vehicleId: entry.vehicleId,
          driverId: drivers[0].id,
          liters: entry.liters,
          totalCost: entry.totalCost,
          receiptUrl: `https://placeholder.co/receipt-${Date.now()}.jpg`,
          date: fuelDate,
        },
      });
      fuelCount++;
    }
  }

  console.log(`  ✅ ${fuelCount} fuel logs seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 8. VEHICLE DOCUMENTS (RC, Insurance, Fitness)
  // ══════════════════════════════════════════════════════════════════
  console.log("📄 Seeding Vehicle Documents...");

  const docEntries = [
    // Truck 1 — All docs valid
    { vehicleId: vehicles.truck1.id, type: DocumentType.RC, num: "KL10AK1234RC", issue: subDays(today, 365), expiry: addDays(today, 730) },
    { vehicleId: vehicles.truck1.id, type: DocumentType.INSURANCE, num: "INS-TK1-2025", issue: subDays(today, 30), expiry: addDays(today, 335) },
    { vehicleId: vehicles.truck1.id, type: DocumentType.FITNESS, num: "FIT-TK1-2025", issue: subDays(today, 60), expiry: addDays(today, 305) },
    { vehicleId: vehicles.truck1.id, type: DocumentType.POLLUTION, num: "PUC-TK1-2025", issue: subDays(today, 10), expiry: addDays(today, 80) },

    // Truck 2 — Insurance expiring in 15 days (warning)
    { vehicleId: vehicles.truck2.id, type: DocumentType.RC, num: "KL10AK5678RC", issue: subDays(today, 365), expiry: addDays(today, 730) },
    { vehicleId: vehicles.truck2.id, type: DocumentType.INSURANCE, num: "INS-TK2-EXPIRING", issue: subDays(today, 350), expiry: addDays(today, 15) },
    { vehicleId: vehicles.truck2.id, type: DocumentType.FITNESS, num: "FIT-TK2-2025", issue: subDays(today, 90), expiry: addDays(today, 275) },

    // Van — Fitness certificate EXPIRED (compliance alert!)
    { vehicleId: vehicles.van1.id, type: DocumentType.RC, num: "KL10BK9001RC", issue: subDays(today, 400), expiry: addDays(today, 600) },
    { vehicleId: vehicles.van1.id, type: DocumentType.INSURANCE, num: "INS-VAN1-2025", issue: subDays(today, 20), expiry: addDays(today, 345) },
    { vehicleId: vehicles.van1.id, type: DocumentType.FITNESS, num: "FIT-VAN1-EXPIRED", issue: subDays(today, 400), expiry: subDays(today, 35) },
  ];

  let docCount = 0;
  for (const doc of docEntries) {
    const existing = await prisma.vehicleDocument.findFirst({
      where: { vehicleId: doc.vehicleId, type: doc.type, status: DocumentStatus.ACTIVE },
    });
    if (!existing) {
      const isExpired = new Date(doc.expiry) < today;
      await prisma.vehicleDocument.create({
        data: {
          vehicleId: doc.vehicleId,
          type: doc.type,
          documentNumber: doc.num,
          issueDate: doc.issue,
          expiryDate: doc.expiry,
          attachmentUrl: `https://placeholder.co/doc-${doc.num}.pdf`,
          status: isExpired ? DocumentStatus.EXPIRED : DocumentStatus.ACTIVE,
        },
      });
      docCount++;
    }
  }

  console.log(`  ✅ ${docCount} vehicle documents seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // 9. CASH COLLECTIONS (for completed past dispatches)
  // ══════════════════════════════════════════════════════════════════
  console.log("💵 Seeding Cash Collections...");

  const completedDispatches = await prisma.dailyDispatch.findMany({
    where: { status: DispatchStatus.COMPLETED },
    take: 30,
    orderBy: { dateOfService: "desc" },
  });

  let cashCount = 0;
  for (const d of completedDispatches) {
    if (!d.operatorId || !d.customerCharge) continue;
    const existing = await prisma.cashCollection.findFirst({ where: { dispatchId: d.id } });
    if (!existing) {
      await prisma.cashCollection.create({
        data: {
          operatorId: d.operatorId,
          dispatchId: d.id,
          amountCollected: d.customerCharge,
          date: d.dateOfService,
          status: "DEPOSITED" as any,
          confirmedById: owner.id,
          confirmedAt: d.dateOfService,
        },
      });
      cashCount++;
    }
  }

  console.log(`  ✅ ${cashCount} cash collections seeded.\n`);

  // ══════════════════════════════════════════════════════════════════
  // DONE
  // ══════════════════════════════════════════════════════════════════
  console.log("═".repeat(55));
  console.log("🎉 IronRent Full Seed V1.0 COMPLETE!\n");
  console.log("  Summary:");
  console.log(`    👥  Users/Employees : 22 (1 Owner, 2 Staff, 3 Drivers, 11 Operators, 5 Workers)`);
  console.log(`    🔧  Machines        : ${Object.keys(machines).length}`);
  console.log(`    🚛  Vehicles        : ${Object.keys(vehicles).length}`);
  console.log(`    🏗️  Customers       : ${Object.keys(custs).length}`);
  console.log(`    📋  Dispatches      : ${dispatchCount} new (30 days history + today + tomorrow)`);
  console.log(`    🔩  Tickets         : 3 (1 Resolved, 1 In-Progress, 1 Open)`);
  console.log(`    ⛽  Fuel Logs       : ${fuelCount}`);
  console.log(`    📄  Vehicle Docs    : ${docCount} (includes 1 expired, 1 expiring soon)`);
  console.log(`    💵  Cash Collections: ${cashCount}`);
  console.log("═".repeat(55));
  console.log("\n🔑 Login: akshairajesh07@gmail.com / admin123\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
