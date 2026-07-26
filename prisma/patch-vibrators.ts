import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] } as any);

async function main() {
  // VIB-001 → Petrol Vibrator (currently In Repair)
  await prisma.machine.update({
    where: { machineId: "VIB-001" },
    data: {
      machineId: "VIB-PETROL",
      notes: "Petrol Vibrator (Engine driven)",
    },
  });
  console.log("✅ VIB-001 → VIB-PETROL (Petrol Vibrator)");

  // VIB-002 → Electric / Current Vibrator
  await prisma.machine.update({
    where: { machineId: "VIB-002" },
    data: {
      machineId: "VIB-CURRENT",
      notes: "Electric Vibrator (Current / 3-phase)",
    },
  });
  console.log("✅ VIB-002 → VIB-CURRENT (Electric Vibrator)");
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); await pool.end(); });
