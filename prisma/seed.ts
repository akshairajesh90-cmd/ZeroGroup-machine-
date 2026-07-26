/**
 * IronRent ERP - Intelligent Data Seeder
 * Populates realistic construction equipment rental data.
 */

// 1. STRICT KILL SWITCH: Never run this in production!
if (process.env.NODE_ENV === "production") {
  console.error("❌ CRITICAL: Attempted to run seed in production! Exiting.");
  process.exit(1);
}

import { PrismaClient, Role, MachineType, VehicleStatus, MachineStatus, WorkType, DispatchStatus } from "@prisma/client";
import { subDays, addDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Wiping existing database...");
  await prisma.$transaction([
    prisma.cashCollection.deleteMany(),
    prisma.settlement.deleteMany(),
    prisma.manualAdjustment.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.shiftLog.deleteMany(),
    prisma.dispatchStatusHistory.deleteMany(),
    prisma.dispatchOperator.deleteMany(),
    prisma.dispatchLabor.deleteMany(),
    prisma.dispatchTool.deleteMany(),
    prisma.dispatchAsset.deleteMany(),
    prisma.dispatchMachine.deleteMany(),
    prisma.dispatchWorker.deleteMany(),
    prisma.dailyDispatch.deleteMany(),
    prisma.workTypeRate.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.tool.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("🌱 Database wiped. Starting intelligent seed...");

  // 1. Create Users & Employees
  const createUser = async (name: string, email: string, role: Role) => {
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword: "$2b$10$Q76.qD9D3aFy0L95Wp/NoOeWA3kiyAOSXkdXjBpJAVK1Q4w0VyLDC", // password123
        role
      }
    });
    return prisma.employee.create({
      data: {
        name,
        role,
        userId: user.id
      }
    });
  };

  const owner = await createUser("Admin Owner", "owner@ironrent.test", Role.OWNER);
  const staff = await createUser("Office Manager", "staff@ironrent.test", Role.STAFF);
  
  const drivers = await Promise.all([
    createUser("Ramesh Driver", "driver1@ironrent.test", Role.DRIVER),
    createUser("Suresh Driver", "driver2@ironrent.test", Role.DRIVER),
  ]);

  const operators = await Promise.all([
    createUser("Babu (Mixer)", "op1@ironrent.test", Role.OPERATOR),
    createUser("Mani (Lift)", "op2@ironrent.test", Role.OPERATOR),
  ]);

  const workers = await Promise.all([
    createUser("Jose (Mestri)", "worker1@ironrent.test", Role.WORKER),
    createUser("Bhai Helper 1", "worker2@ironrent.test", Role.WORKER),
  ]);

  // 2. Create Customers
  const customer1 = await prisma.customer.create({ data: { name: "L&T Construction", phone: "8000000001", address: "City Center" } });
  const customer2 = await prisma.customer.create({ data: { name: "Sobha Developers", phone: "8000000002", address: "North Zone" } });

  // 3. Create Vehicles & Machines
  const vehicle = await prisma.vehicle.create({ data: { licensePlate: "KL-01-AB-1234", type: "Flatbed Truck", status: VehicleStatus.AVAILABLE } });

  const mixer1 = await prisma.machine.create({ data: { machineId: "MIX-001", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000 } });
  const lift1 = await prisma.machine.create({ data: { machineId: "LFT-001", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500 } });
  const vib1 = await prisma.machine.create({ data: { machineId: "VIB-001", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000, fuelConsumptionThreshold: 500 } });

  // 4. Timezone-Safe Date Generation (Past 30 Days to Tomorrow)
  const today = startOfDay(new Date());
  const dispatchesToCreate = [];

  for (let i = -30; i <= 1; i++) {
    const targetDate = i === 0 ? today : (i < 0 ? subDays(today, Math.abs(i)) : addDays(today, i));
    const isPast = i < 0;
    const isFuture = i > 0;

    const numDispatches = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < numDispatches; j++) {
      let status: DispatchStatus = DispatchStatus.COMPLETED;
      if (isFuture) status = DispatchStatus.PENDING;
      if (!isPast && !isFuture && j === 0) status = DispatchStatus.DELIVERED;

      dispatchesToCreate.push({
        customerId: j % 2 === 0 ? customer1.id : customer2.id,
        machineId: j % 2 === 0 ? mixer1.id : lift1.id,
        driverId: drivers[j % 2].id,
        operatorId: operators[j % 2].id,
        mainHelperId: workers[0].id,
        location: `Site ${i}-${j}`,
        dateOfService: targetDate, 
        status: status,
        workType: WorkType.NORMAL,
        customerCharge: 5500.00,
        operatorDailyRate: 1200.00,
        helperCount: 5,
        version: 1,
      });
    }
  }

  console.log(`Generating ${dispatchesToCreate.length} dispatches...`);
  await prisma.dailyDispatch.createMany({ data: dispatchesToCreate });

  // 5. Generate Revenue / Cash Collections for past COMPLETED dispatches
  const completedDispatches = await prisma.dailyDispatch.findMany({ where: { status: DispatchStatus.COMPLETED } });
  
  const cashData = completedDispatches.map(d => ({
    operatorId: d.operatorId!,
    dispatchId: d.id,
    amountCollected: d.customerCharge || 5500,
    date: d.dateOfService,
    status: "DEPOSITED" as any, 
    confirmedById: owner.id,
    confirmedAt: d.dateOfService
  }));

  if (cashData.length > 0) {
    await prisma.cashCollection.createMany({ data: cashData });
  }

  console.log("✅ Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
