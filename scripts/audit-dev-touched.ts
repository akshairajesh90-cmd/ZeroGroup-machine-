import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const devEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, "../.env")));
const pool = new Pool({ connectionString: devEnv.DATABASE_URL });

async function main() {
  const since = "2026-10-31T23:30:00Z";
  console.log(`=== AUDITING DEV DATABASE FOR WRITES SINCE ${since} ===`);

  // First inspect ALL tables in the dev database
  const tableListQuery = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`Found ${tableListQuery.rows.length} public tables in dev database.`);
  const report: any[] = [];
  const touchedTables: any[] = [];

  for (const row of tableListQuery.rows) {
    const table = row.table_name;
    const countRes = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const count = parseInt(countRes.rows[0].count, 10);

    // Check columns
    const colRes = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const cols = colRes.rows.map((c) => c.column_name);

    let maxCreatedAt: string | null = null;
    let maxUpdatedAt: string | null = null;
    let touchedSince = 0;

    if (cols.includes("createdAt")) {
      const maxCreatedRes = await pool.query(`SELECT MAX("createdAt") as max_created FROM "${table}"`);
      maxCreatedAt = maxCreatedRes.rows[0].max_created ? new Date(maxCreatedRes.rows[0].max_created).toISOString() : null;
    }
    if (cols.includes("updatedAt")) {
      const maxUpdatedRes = await pool.query(`SELECT MAX("updatedAt") as max_updated FROM "${table}"`);
      maxUpdatedAt = maxUpdatedRes.rows[0].max_updated ? new Date(maxUpdatedRes.rows[0].max_updated).toISOString() : null;
    }

    if (cols.includes("updatedAt")) {
      const touchedRes = await pool.query(`SELECT COUNT(*) as count FROM "${table}" WHERE "updatedAt" >= $1`, [since]);
      touchedSince += parseInt(touchedRes.rows[0].count, 10);
    } else if (cols.includes("createdAt")) {
      const touchedRes = await pool.query(`SELECT COUNT(*) as count FROM "${table}" WHERE "createdAt" >= $1`, [since]);
      touchedSince += parseInt(touchedRes.rows[0].count, 10);
    }

    const item = {
      table,
      count,
      maxCreatedAt,
      maxUpdatedAt,
      rowsTouchedSince0509: touchedSince,
    };
    report.push(item);
    if (touchedSince > 0) {
      touchedTables.push(item);
    }
  }

  console.log("\n=== ALL TABLES WITH WRITES SINCE 2026-11-01T05:09:30Z (or 2026-10-31T23:30:00 UTC) ===");
  console.table(touchedTables);

  console.log("\n=== FULL AUDIT OF ALL TABLES IN DEV DATABASE ===");
  console.table(report);

  // For the touched tables, fetch the exact rows
  for (const t of touchedTables) {
    console.log(`\n--- Exact Rows in "${t.table}" touched: ---`);
    let q;
    if (t.table === "system_settings") {
      q = await pool.query(`SELECT * FROM "${t.table}" WHERE "updatedAt" >= $1`, [since]);
    } else {
      q = await pool.query(`SELECT * FROM "${t.table}" WHERE "updatedAt" >= $1 OR "createdAt" >= $1`, [since]);
    }
    console.table(q.rows.map(r => {
      const clean: any = { ...r };
      if (clean.hashedPassword) clean.hashedPassword = clean.hashedPassword.slice(0, 10) + "...";
      return clean;
    }));
  }

  await pool.end();
}

main().catch(console.error);
