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
  const machine = await prisma.machine.findUnique({ where: { machineId: "PAN-001" } });
  if (!machine) { console.log("PAN-001 not found."); return; }

  await prisma.machine.update({
    where: { machineId: "PAN-001" },
    data: { status: "RETIRED" },
  });
  console.log("✅ PAN-001 (Pani) retired — removed from active fleet.");
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); await pool.end(); });
