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
  const vehicles = await prisma.vehicle.findMany();
  console.log(JSON.stringify(vehicles, null, 2));
}
main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
