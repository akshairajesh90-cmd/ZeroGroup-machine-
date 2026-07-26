import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, DispatchStatus, WorkType } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] } as any);

async function main() {
  const dayAfterTomorrow = startOfDay(addDays(new Date(), 2));

  // Fetch real IDs
  const [machines, customers, operators, drivers] = await Promise.all([
    prisma.machine.findMany({ where: { status: { in: ["AVAILABLE", "RENTED"] } }, select: { id: true, machineId: true, type: true, operatorDailyPayout: true } }),
    prisma.customer.findMany({ select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { role: "OPERATOR" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { role: "DRIVER" }, select: { id: true, name: true } }),
  ]);

  if (!machines.length || !customers.length || !operators.length) {
    console.error("❌ Run seed-full.ts first!"); return;
  }

  const bookings = [
    {
      machineId: machines.find(m => m.machineId.startsWith("MIX-001"))?.id ?? machines[0].id,
      customerId: customers[0].id,
      operatorId: operators[0].id,
      driverId: drivers[0].id,
      location: "Nadakkal Site – Block C",
      customerCharge: 5000,
      helperCount: 6,
      workType: WorkType.NORMAL,
      notes: "Bring extra belt spares. Gate opens at 7:30 AM.",
    },
    {
      machineId: machines.find(m => m.machineId.startsWith("LFT-001"))?.id ?? machines[1].id,
      customerId: customers[2].id,
      operatorId: operators[1].id,
      driverId: drivers[0].id,
      location: "Mathamangalam – 3rd Floor Pour",
      customerCharge: 6500,
      helperCount: 8,
      workType: WorkType.NORMAL,
      notes: "Slab pour scheduled 8 AM sharp. Do not be late.",
    },
    {
      machineId: machines.find(m => m.machineId.includes("CURRENT") || m.machineId.startsWith("VIB"))?.id ?? machines[2].id,
      customerId: customers[4].id,
      operatorId: operators[2].id,
      driverId: drivers[1]?.id ?? drivers[0].id,
      location: "Kanjirappally – Road Work Patch",
      customerCharge: 4500,
      helperCount: 4,
      workType: WorkType.NORMAL,
      notes: "Road compaction work. Wear safety boots.",
    },
    {
      machineId: machines.find(m => m.machineId.startsWith("MIX-002"))?.id ?? machines[0].id,
      customerId: customers[6].id,
      operatorId: operators[3]?.id ?? operators[0].id,
      driverId: drivers[0].id,
      location: "Unichamara – Foundation Pour",
      customerCharge: 5500,
      helperCount: 10,
      workType: WorkType.TROLLY,
      notes: "Trolly work included. Customer has own helpers for trolly.",
    },
    {
      machineId: machines.find(m => m.machineId.startsWith("LFT-002"))?.id ?? machines[1].id,
      customerId: customers[9].id,
      operatorId: operators[4]?.id ?? operators[0].id,
      driverId: drivers[2]?.id ?? drivers[0].id,
      location: "Jose Mestri Site – 2nd Floor Columns",
      customerCharge: 7000,
      helperCount: 12,
      workType: WorkType.LATE,
      notes: "Late shift job. Work may go until 9 PM.",
    },
  ];

  console.log(`\n📅 Creating ${bookings.length} bookings for ${dayAfterTomorrow.toDateString()}...\n`);

  let count = 0;
  for (const b of bookings) {
    const machine = machines.find(m => m.id === b.machineId)!;
    await prisma.dailyDispatch.create({
      data: {
        customerId:       b.customerId,
        machineId:        b.machineId,
        operatorId:       b.operatorId,
        driverId:         b.driverId,
        location:         b.location,
        dateOfService:    dayAfterTomorrow,
        status:           DispatchStatus.PENDING,
        workType:         b.workType,
        customerCharge:   b.customerCharge,
        operatorDailyRate: machine.operatorDailyPayout,
        helperCount:      b.helperCount,
        notes:            b.notes,
        version:          1,
      },
    });

    console.log(`  ✅ [${machine.machineId.padEnd(12)}] ${b.location}`);
    console.log(`       Customer: ${customers.find(c => c.id === b.customerId)?.name}`);
    console.log(`       Operator: ${operators.find(o => o.id === b.operatorId)?.name?.split(" ")[0]}  |  ₹${b.customerCharge.toLocaleString("en-IN")} charge  |  ${b.helperCount} helpers\n`);
    count++;
  }

  console.log("═".repeat(55));
  console.log(`🎉 ${count} bookings created for ${dayAfterTomorrow.toDateString()}`);
  console.log("   Status: PENDING — operators will see these in Driver PWA");
  console.log("═".repeat(55));
}

main()
  .catch((e) => { console.error("❌ Failed:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
