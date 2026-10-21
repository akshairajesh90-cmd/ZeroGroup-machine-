import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:Akshai%402005@localhost:5432/postgres?schema=public";

const isCloud =
  rawConnectionString.includes("neon.tech") ||
  rawConnectionString.includes("aws") ||
  rawConnectionString.includes("supabase") ||
  rawConnectionString.includes("sslmode=require");

const pool = new Pool({
  connectionString: rawConnectionString,
  ssl: isCloud ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

globalForPrisma.prisma = prisma;
