import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const devEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, "../.env")));
const devDbUrl = devEnv.DATABASE_URL;

if (!devDbUrl || devDbUrl.includes("_test")) {
  throw new Error("audit-dev-integrity must target dev DB (not _test)");
}

process.env.DATABASE_URL = devDbUrl;

const pool = new Pool({ connectionString: devDbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const mode = process.argv[2] || "verify";
  const snapshotPath = path.resolve(__dirname, "dev-db-snapshot.json");

  const tables = [
    { name: "SystemSettings", fetch: () => prisma.systemSettings.findMany({ orderBy: { id: "asc" } }) },
    { name: "User", fetch: () => prisma.user.findMany({ orderBy: { id: "asc" } }) },
    { name: "Employee", fetch: () => prisma.employee.findMany({ orderBy: { id: "asc" } }) },
    { name: "DailyDispatch", fetch: () => prisma.dailyDispatch.findMany({ orderBy: { id: "asc" } }) },
    { name: "Machine", fetch: () => prisma.machine.findMany({ orderBy: { id: "asc" } }) },
    { name: "Vehicle", fetch: () => prisma.vehicle.findMany({ orderBy: { id: "asc" } }) },
    { name: "Customer", fetch: () => prisma.customer.findMany({ orderBy: { id: "asc" } }) },
    { name: "Project", fetch: () => prisma.project.findMany({ orderBy: { id: "asc" } }) },
  ];

  const results: Record<string, any> = {};

  for (const t of tables) {
    const rows = await t.fetch();
    let maxUpdatedAt: string | null = null;
    if (rows.length > 0 && "updatedAt" in rows[0]) {
      const dates = rows
        .map((r: any) => r.updatedAt ? new Date(r.updatedAt).toISOString() : null)
        .filter(Boolean) as string[];
      dates.sort();
      maxUpdatedAt = dates[dates.length - 1] || null;
    }
    const hash = crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    results[t.name] = {
      table: t.name,
      count: rows.length,
      maxUpdatedAt,
      sha256: hash,
    };
  }

  if (mode === "record") {
    fs.writeFileSync(snapshotPath, JSON.stringify(results, null, 2));
    console.log("📸 [RECORD] Baseline SHA256 checksums and maxUpdatedAt for dev database:");
    console.table(Object.values(results));
  } else if (mode === "compare") {
    if (!fs.existsSync(snapshotPath)) {
      console.log("No previous snapshot found, recording baseline now.");
      fs.writeFileSync(snapshotPath, JSON.stringify(results, null, 2));
      console.table(Object.values(results));
      await prisma.$disconnect();
      await pool.end();
      return;
    }
    const previous = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
    console.log("🔍 [COMPARE] Comparing dev DB state before vs after:");
    let hasDiff = false;
    for (const t of tables) {
      const prev = previous[t.name];
      const curr = results[t.name];
      const match = prev.sha256 === curr.sha256 && prev.maxUpdatedAt === curr.maxUpdatedAt && prev.count === curr.count;
      console.log(
        `${t.name.padEnd(16)}: ${match ? "✅ UNTOUCHED (Hash & Timestamps match 100%)" : "❌ MODIFIED"} | Hash: ${curr.sha256.slice(0, 12)}... | Count: ${curr.count} | MaxUpdatedAt: ${curr.maxUpdatedAt}`
      );
      if (!match) hasDiff = true;
    }
    if (hasDiff) {
      console.error("FATAL: Dev database was modified!");
      process.exit(1);
    } else {
      console.log("🎉 ALL TABLES VERIFIED COMPLETELY UNTOUCHED.");
    }
  } else {
    console.table(Object.values(results));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Integrity audit failed:", err);
  process.exit(1);
});
