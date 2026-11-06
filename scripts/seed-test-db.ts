import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MachineStatus, CashDepositStatus, Role, MachineType } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";

export function validateTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error("DATABASE_URL is missing or empty!");
  }
  const cleanUrl = url.split("?")[0];
  const dbName = cleanUrl.split("/").pop() || "";
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `CRITICAL SAFETY VIOLATION: seed-test-db must target a database ending in "_test"! Detected database name: "${dbName}". Execution aborted.`
    );
  }
  return dbName;
}

export function getTestDatabaseClients() {
  const envTestPath = path.resolve(__dirname, "../.env.test");
  const envTestConfig = dotenv.parse(fs.readFileSync(envTestPath));
  const testDbUrl = envTestConfig.DATABASE_URL;

  // MUST validate database name ends in _test BEFORE connecting
  validateTestDatabaseUrl(testDbUrl);

  process.env.DATABASE_URL = testDbUrl;

  const pool = new Pool({ connectionString: testDbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { pool, adapter, prisma, testDbUrl };
}

async function main() {
  const { pool, prisma, testDbUrl } = getTestDatabaseClients();
  console.log(`🌱 Seeding Dedicated Test Database: ${testDbUrl.replace(/:[^:@]+@/, ":***@")}`);

  // 1. SystemSettings with Erattupetta coordinates
  const existing = await prisma.systemSettings.findFirst();
  if (!existing) {
    await prisma.systemSettings.create({
      data: {
        storeName: "Zero Group Main Yard & Store",
        storeAddress: "eratupeta,kottayam.Kerala",
        storeLatitude: 9.5916,
        storeLongitude: 76.5222,
      },
    });
    console.log("✅ Created SystemSettings in test DB");
  } else {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: {
        storeName: "Zero Group Main Yard & Store",
        storeAddress: "eratupeta,kottayam.Kerala",
        storeLatitude: 9.5916,
        storeLongitude: 76.5222,
      },
    });
    console.log("✅ Updated SystemSettings in test DB");
  }

  // 2. Customers
  let cust = await prisma.customer.findFirst();
  if (!cust) {
    cust = await prisma.customer.create({
      data: {
        name: "Acme Infrastructure Pvt Ltd",
        address: "Pala Road, Kottayam",
        phone: "+91 98470 12345",
      },
    });
    await prisma.customer.create({
      data: {
        name: "Highland Residency Builders",
        address: "Erattupetta Bypass",
        phone: "+91 98470 54321",
      },
    });
    console.log("✅ Created Customers in test DB");
  }

  // 3. Machines (17 total: 12 AVAILABLE, 3 RENTED, 2 REPAIR)
  const machineCount = await prisma.machine.count();
  if (machineCount === 0) {
    const machinesData = [
      // 12 Available
      { machineId: "MIX-101", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200 },
      { machineId: "MIX-102", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200 },
      { machineId: "MIX-103", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1100 },
      { machineId: "MIX-104", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1100 },
      { machineId: "MIX-105", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000 },
      { machineId: "MIX-106", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000 },
      { machineId: "LFT-201", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500 },
      { machineId: "LFT-202", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500 },
      { machineId: "LFT-203", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1400 },
      { machineId: "LFT-204", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1400 },
      { machineId: "VIB-301", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 800 },
      { machineId: "VIB-302", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 800 },
      // 3 Rented
      { machineId: "MIX-107", type: MachineType.MIXER, status: MachineStatus.RENTED, operatorDailyPayout: 1200 },
      { machineId: "LFT-205", type: MachineType.LIFT, status: MachineStatus.RENTED, operatorDailyPayout: 1500 },
      { machineId: "VIB-303", type: MachineType.VIBRATOR, status: MachineStatus.RENTED, operatorDailyPayout: 800 },
      // 2 Repair
      { machineId: "MIX-108", type: MachineType.MIXER, status: MachineStatus.REPAIR, operatorDailyPayout: 1100 },
      { machineId: "LFT-206", type: MachineType.LIFT, status: MachineStatus.REPAIR, operatorDailyPayout: 1400 },
    ];

    for (const m of machinesData) {
      await prisma.machine.create({ data: m });
    }
    console.log("✅ Created 17 Machines in test DB (12 Available, 3 Rented, 2 Repair)");
  }

  // 4. Vehicles
  const vehicleCount = await prisma.vehicle.count();
  if (vehicleCount === 0) {
    await prisma.vehicle.createMany({
      data: [
        { licensePlate: "KL-05-AA-1001", type: "Flatbed Truck" },
        { licensePlate: "KL-05-AA-1002", type: "Covered Van" },
        { licensePlate: "KL-05-AA-1003", type: "Pickup Truck" },
      ],
    });
    console.log("✅ Created 3 Vehicles in test DB");
  }

  // 5. DailyDispatches (4 for today + past 7 days)
  const dispatchCount = await prisma.dailyDispatch.count();
  const rentedMachine = await prisma.machine.findFirst({ where: { status: MachineStatus.RENTED } });
  const operatorEmp = await prisma.employee.findFirst({ where: { role: Role.OPERATOR } });

  if (dispatchCount === 0 && cust && rentedMachine) {
    const today = startOfDay(new Date());

    // 4 dispatches for today
    for (let i = 1; i <= 4; i++) {
      await prisma.dailyDispatch.create({
        data: {
          customerId: cust.id,
          machineId: rentedMachine.id,
          operatorId: operatorEmp?.id,
          dateOfService: today,
          status: i % 2 === 0 ? "DELIVERED" : "PENDING",
          location: `Site Project Bravo - Sector ${i}`,
          latitude: 9.5920 + i * 0.005,
          longitude: 76.5230 + i * 0.005,
          customerCharge: 3500,
        },
      });
    }

    // Historical dispatches for 7-day chart volume
    for (let d = 1; d <= 6; d++) {
      const pastDate = subDays(today, d);
      const countForDay = (d % 3) + 2; // 2 to 4 dispatches
      for (let j = 0; j < countForDay; j++) {
        await prisma.dailyDispatch.create({
          data: {
            customerId: cust.id,
            machineId: rentedMachine.id,
            operatorId: operatorEmp?.id,
            dateOfService: pastDate,
            status: "DELIVERED",
            location: `Completed Site - Day -${d} / ${j + 1}`,
            latitude: 9.5930,
            longitude: 76.5240,
            customerCharge: 3500,
          },
        });
      }
    }
    console.log("✅ Created DailyDispatches for today and past 7 days in test DB");
  }

  // 6. CashCollections (Deposited: ₹1,45,000)
  const cashCount = await prisma.cashCollection.count();
  const firstDispatch = await prisma.dailyDispatch.findFirst();
  if (cashCount === 0 && operatorEmp && firstDispatch) {
    const today = new Date();
    await prisma.cashCollection.createMany({
      data: [
        {
          operatorId: operatorEmp.id,
          dispatchId: firstDispatch.id,
          amountCollected: 45000,
          date: today,
          status: CashDepositStatus.DEPOSITED,
        },
        {
          operatorId: operatorEmp.id,
          dispatchId: firstDispatch.id,
          amountCollected: 60000,
          date: today,
          status: CashDepositStatus.DEPOSITED,
        },
        {
          operatorId: operatorEmp.id,
          dispatchId: firstDispatch.id,
          amountCollected: 40000,
          date: today,
          status: CashDepositStatus.DEPOSITED,
        },
      ],
    });
    console.log("✅ Created CashCollections totaling ₹1,45,000 in test DB");
  }

  // 7. Audit Logs
  const auditCount = await prisma.auditLog.count();
  const adminEmp = await prisma.employee.findFirst({ where: { role: Role.ADMIN } });
  if (auditCount === 0 && adminEmp) {
    await prisma.auditLog.createMany({
      data: [
        {
          actorId: adminEmp.id,
          actionType: "DISPATCH_CREATE",
          actorRole: Role.ADMIN,
          modelName: "DailyDispatch",
          entity: "Site Project Bravo - Sector 1",
          timestamp: new Date(),
        },
        {
          actorId: adminEmp.id,
          actionType: "MACHINE_UPDATE",
          actorRole: Role.ADMIN,
          modelName: "Machine",
          entity: "MIX-107",
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          actorId: adminEmp.id,
          actionType: "PAYMENT_CONFIRM",
          actorRole: Role.ADMIN,
          modelName: "CashCollection",
          entity: "₹60,000 Cash Deposit",
          timestamp: new Date(Date.now() - 7200000),
        },
      ],
    });
        console.log("✅ Created Audit Logs in test DB");
  }

  // 8. Tools & Dispatch Tools (For project7_test)
  const toolCount = await prisma.tool.count();
  if (toolCount === 0) {
    const t1 = await prisma.tool.create({
      data: {
        toolId: "TL-VIB-01",
        name: "Petrol Vibrator",
        toolType: "VIBRATOR",
        totalInventory: 8,
        dailyRate: 1000,
        status: "AVAILABLE",
      },
    });
    const t2 = await prisma.tool.create({
      data: {
        toolId: "TL-002",
        name: "2-Wheel Trolly with Sheet",
        toolType: "TROLLY",
        totalInventory: 14,
        dailyRate: 200,
        status: "AVAILABLE",
      },
    });
    const t3 = await prisma.tool.create({
      data: {
        toolId: "TL-BRK-01",
        name: "Heavy Concrete Breaker",
        toolType: "BREAKER",
        totalInventory: 4,
        dailyRate: 1500,
        status: "AVAILABLE",
      },
    });
    console.log("✅ Created Tools in test DB");

    // Link vehicle, driver, and tools to the active test dispatches
    const testVehicle = await prisma.vehicle.findFirst();
    const testDriver = await prisma.employee.findFirst({ where: { role: Role.DRIVER } });
    const dispatches = await prisma.dailyDispatch.findMany({ take: 3 });

    for (let idx = 0; idx < dispatches.length; idx++) {
      const d = dispatches[idx];
      await prisma.dailyDispatch.update({
        where: { id: d.id },
        data: {
          vehicleId: testVehicle?.id,
          driverId: testDriver?.id,
          deliveredAt: new Date(),
        },
      });

      await prisma.dispatchTool.create({
        data: {
          dispatchId: d.id,
          toolId: idx === 0 ? t1.id : idx === 1 ? t2.id : t3.id,
          quantity: 2,
        },
      });
    }
    console.log("✅ Linked Vehicles, Drivers, and Tools to dispatches in test DB");
  }

  // 8. Ensure all fleet machines have realistic customer dispatches and route data
  const allMachines = await prisma.machine.findMany({
    include: { dispatches: { select: { id: true } } },
  });
  const testVehicles = await prisma.vehicle.findMany();
  const testDrivers = await prisma.employee.findMany({ where: { role: Role.DRIVER } });
  const allTools = await prisma.tool.findMany();

  const keralaSites = [
    { name: "Pala Bypass Bridge - Sector 3", lat: 9.7118, lng: 76.6853 },
    { name: "Kottayam Medical College Expansion", lat: 9.6254, lng: 76.5368 },
    { name: "Erattupetta High Range Highway Work", lat: 9.6841, lng: 76.7865 },
    { name: "Changanassery Commercial Hub - Phase 2", lat: 9.4442, lng: 76.5411 },
    { name: "Aluva Metro Depot Pier Extension", lat: 10.1076, lng: 76.3516 },
    { name: "Ettumanoor Temple Bypass Flyover", lat: 9.6687, lng: 76.5645 },
  ];

  for (let mIdx = 0; mIdx < allMachines.length; mIdx++) {
    const m = allMachines[mIdx];
    if (m.dispatches.length === 0 && cust) {
      const site = keralaSites[mIdx % keralaSites.length];
      const assignedVehicle = testVehicles.length > 0 ? testVehicles[mIdx % testVehicles.length] : undefined;
      const assignedDriver = testDrivers.length > 0 ? testDrivers[mIdx % testDrivers.length] : undefined;
      const serviceDate = subDays(new Date(), (mIdx % 5) + 1);

      const newDispatch = await prisma.dailyDispatch.create({
        data: {
          customerId: cust.id,
          machineId: m.id,
          operatorId: operatorEmp?.id,
          vehicleId: assignedVehicle?.id,
          driverId: assignedDriver?.id,
          dateOfService: serviceDate,
          status: "DELIVERED",
          location: site.name,
          latitude: site.lat,
          longitude: site.lng,
          customerCharge: 4500,
          deliveredAt: serviceDate,
        },
      });

      if (allTools.length > 0) {
        await prisma.dispatchTool.create({
          data: {
            dispatchId: newDispatch.id,
            toolId: allTools[mIdx % allTools.length].id,
            quantity: 2,
          },
        });
      }
    }
  }
  console.log("✅ Seeded customer dispatches and route data for all fleet machines");

  console.log("🎉 Test database successfully seeded with realistic metrics!");
}

if (require.main === module) {
  let clients: any = null;
  try {
    clients = getTestDatabaseClients();
    main()
      .catch((e) => {
        console.error("Failed to seed test database:", e);
        process.exit(1);
      })
      .finally(async () => {
        if (clients) {
          await clients.prisma.$disconnect();
          await clients.pool.end();
        }
      });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
