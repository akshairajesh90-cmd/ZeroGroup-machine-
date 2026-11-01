import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== DEV DATABASE ROW COUNTS ===");

  const counts = {
    SystemSettings: await prisma.systemSettings.count(),
    User: await prisma.user.count(),
    Employee: await prisma.employee.count(),
    DailyDispatch: await prisma.dailyDispatch.count(),
    Machine: await prisma.machine.count(),
    Vehicle: await prisma.vehicle.count(),
    Customer: await prisma.customer.count(),
    Project: await prisma.project.count(),
  };

  for (const [table, count] of Object.entries(counts)) {
    console.log(`${table.padEnd(20)}: ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
