// ZERO GROUP — ZERO GROUP
// Prisma 7 configuration
// DATABASE_URL     → used at runtime (can be pooled via PgBouncer on Supabase/Neon)
// DIRECT_URL       → used for migrations (must be a direct non-pooled connection)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // Uncomment below if using Supabase with PgBouncer (swap pooled → direct for migrations)
    // directUrl: process.env["DIRECT_URL"]!,
  },
});
