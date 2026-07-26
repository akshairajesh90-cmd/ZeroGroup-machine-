import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(
    "SELECT email, role FROM users ORDER BY role LIMIT 20"
  );
  console.log("All users in DB:");
  console.table(result.rows);
  await pool.end();
}

main().catch((e) => { console.error(e.message); pool.end(); });
