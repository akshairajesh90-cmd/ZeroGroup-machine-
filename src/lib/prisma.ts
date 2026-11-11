import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const rawConnectionString =
  (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "")
    ? process.env.DATABASE_URL
    : "postgresql://postgres:Akshai%402005@localhost:5432/postgres?schema=public";

const isCloud =
  rawConnectionString.includes("neon.tech") ||
  rawConnectionString.includes("aws") ||
  rawConnectionString.includes("supabase") ||
  rawConnectionString.includes("sslmode=require");

const globalForPg = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

// High-Concurrency Connection Pooling: scaled for traffic surges
const poolMax = process.env.DATABASE_POOL_MAX 
  ? parseInt(process.env.DATABASE_POOL_MAX, 10) 
  : (process.env.NODE_ENV === "production" ? 30 : 20);

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: rawConnectionString,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 10000, // Recycle idle connections faster under load
    max: poolMax,
  });

// Handle idle connection drops gracefully without process crash
pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Transient Error]:", err?.message || err);
});

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPg.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.prisma = prisma;
}
