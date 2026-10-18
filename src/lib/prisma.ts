import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

import { parse } from "pg-connection-string";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Akshai%402005@localhost:5432/postgres?schema=public";
const config = typeof connectionString === 'string' ? parse(connectionString) : {};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
} as any);
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
