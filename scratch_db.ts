import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'daily_dispatches'
  `);
  console.log("Columns of daily_dispatches:", res.rows.map(r => r.column_name));
  client.release();
}

main()
  .catch(console.error)
  .finally(() => pool.end());
