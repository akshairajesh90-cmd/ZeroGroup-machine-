import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, MachineType, WorkType, DispatchStatus, ExpenseCategory } from "@prisma/client";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:Akshai%402005@localhost:5432/zerogroup?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

async function main() {
  console.log("🌱 Seeding full scenario mock data up to 2026-07-25...");

  // 1. Fetch masters
  const customers = await prisma.customer.findMany();
  const employees = await prisma.employee.findMany();
  const machines = await prisma.machine.findMany();
  
  if (customers.length === 0 || employees.length === 0 || machines.length === 0) {
    console.error("❌ Run `npx tsx prisma/seed.ts` first to populate masters!");
    process.exit(1);
  }

  const ops = employees.filter((e) => e.role === Role.OPERATOR);
  const drivers = employees.filter((e) => e.role === Role.DRIVER);
  const staff = employees.filter((e) => e.role === Role.STAFF);

  const mixers = machines.filter((m) => m.type === MachineType.MIXER);
  const lifts = machines.filter((m) => m.type === MachineType.LIFT);
  const vibrators = machines.filter((m) => m.type === MachineType.VIBRATOR);

  // Helper to pick random item
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  
  // Date range
  const startDate = new Date("2026-07-12T00:00:00Z");
  const endDate = new Date("2026-07-25T00:00:00Z");

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    console.log(`\n📅 Generating data for ${dateStr}`);

    // Scenario 1: Mixer dispatch (Full crew)
    if (mixers.length > 0 && ops.length > 0 && drivers.length > 0 && customers.length > 0) {
      const op = pick(ops);
      const cust = pick(customers);
      const drv = pick(drivers);
      const machine = pick(mixers);

      const dispatch = await prisma.dailyDispatch.upsert({
        where: {
          dateOfService_customerId_siteBundleId: {
            dateOfService: d,
            customerId: cust.id,
            siteBundleId: `${dateStr}-${cust.id.substring(0, 5)}-MIXER`,
          },
        },
        update: {},
        create: {
          dateOfService: d,
          customerId: cust.id,
          siteBundleId: `${dateStr}-${cust.id.substring(0, 5)}-MIXER`,
          machineId: machine.id,
          operatorId: op.id,
          driverId: drv.id,
          location: `${cust.name} Main Site`,
          workType: WorkType.NORMAL,
          status: DispatchStatus.COMPLETED,
          operatorDailyRate: 1000,
          actualWagePaid: 1000,
          customerCharge: 2500,
          notes: "Mixer full day work. Seeded scenario.",
        },
      });

      // Add Labor Crew
      await prisma.dispatchLabor.deleteMany({ where: { dispatchId: dispatch.id } });
      await prisma.dispatchLabor.create({
        data: {
          dispatchId: dispatch.id,
          externalWorkerName: "Mestri Ali Crew",
          headCount: 1,
          helperCount: 8,
          lumpSumWage: 10800,
          actualWagePaid: 10800,
          internalHeadCount: 9,
          externalHeadCount: 0,
          notes: "Standard mixing crew",
        },
      });

      // Add Cash Collection
      await prisma.cashCollection.create({
        data: {
          operatorId: op.id,
          dispatchId: dispatch.id,
          amountCollected: 12000,
          date: d,
          status: "DEPOSITED",
          confirmedById: staff.length > 0 ? pick(staff).id : undefined,
          confirmedAt: d,
          notes: "Cash collected at site",
        },
      });

      // Driver Expense (Diesel)
      await prisma.expense.create({
        data: {
          loggerId: drv.id,
          amount: 500,
          category: ExpenseCategory.DIESEL,
          date: d,
          machineId: machine.id,
          description: "Diesel for Mixer",
        },
      });
      
      console.log(`  ✅ Mixer dispatch for ${cust.name} by Op: ${op.name}`);
    }

    // Scenario 2: Lift dispatch
    if (lifts.length > 0 && ops.length > 0 && customers.length > 0) {
      const op = pick(ops);
      const cust = pick(customers);
      const machine = pick(lifts);

      const dispatch = await prisma.dailyDispatch.upsert({
        where: {
          dateOfService_customerId_siteBundleId: {
            dateOfService: d,
            customerId: cust.id,
            siteBundleId: `${dateStr}-${cust.id.substring(0, 5)}-LIFT`,
          },
        },
        update: {},
        create: {
          dateOfService: d,
          customerId: cust.id,
          siteBundleId: `${dateStr}-${cust.id.substring(0, 5)}-LIFT`,
          machineId: machine.id,
          operatorId: op.id,
          location: `${cust.name} Block B`,
          workType: WorkType.TROLLY,
          status: DispatchStatus.COMPLETED,
          operatorDailyRate: 1500,
          actualWagePaid: 1500,
          customerCharge: 3000,
          liftFloors: 2,
          notes: "Lift 2 floors with Trolly. Seeded scenario.",
        },
      });

      // Add Multi-operators
      const secondOp = pick(ops);
      if (secondOp.id !== op.id) {
        await prisma.dispatchOperator.deleteMany({ where: { dispatchId: dispatch.id } });
        await prisma.dispatchOperator.create({
          data: {
            dispatchId: dispatch.id,
            internalEmployeeId: secondOp.id,
            dayWage: 1200,
            actualWagePaid: 1200,
          },
        });
      }
      console.log(`  ✅ Lift dispatch for ${cust.name} by Op: ${op.name}`);
    }

    // Scenario 3: Cancelled Job
    if (ops.length > 0 && customers.length > 0) {
      const op = pick(ops);
      const cust = pick(customers);

      const dispatch = await prisma.dailyDispatch.upsert({
        where: {
          dateOfService_customerId_siteBundleId: {
            dateOfService: d,
            customerId: cust.id,
            siteBundleId: `${dateStr}-${cust.id.substring(0, 5)}-CANCEL`,
          },
        },
        update: {},
        create: {
          dateOfService: d,
          customerId: cust.id,
          siteBundleId: `${dateStr}-${cust.id.substring(0, 5)}-CANCEL`,
          operatorId: op.id,
          location: `${cust.name} Site C`,
          workType: WorkType.NORMAL,
          status: DispatchStatus.CANCELLED,
          operatorDailyRate: 0,
          actualWagePaid: 0,
          notes: "Cancelled due to rain.",
        },
      });

      // Audit Log for cancellation
      if (staff.length > 0) {
        await prisma.dispatchStatusHistory.create({
            data: {
                dispatchId: dispatch.id,
                oldStatus: DispatchStatus.PENDING,
                newStatus: DispatchStatus.CANCELLED,
                changedById: pick(staff).id,
                reason: "Customer postponed indefinitely"
            }
        });
      }
      console.log(`  ✅ Cancelled dispatch for ${cust.name}`);
    }
  }

  console.log("🎉 Seeding full scenario mock data completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
