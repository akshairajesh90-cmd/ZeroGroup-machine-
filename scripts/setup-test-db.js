const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Akshai%402005@localhost:5432/postgres?schema=public'
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'project7_test'");
    if (res.rows.length === 0) {
      await client.query("CREATE DATABASE project7_test");
      console.log("Created test database: project7_test");
    } else {
      console.log("Test database project7_test already exists");
    }
  } catch (err) {
    console.error("Error creating test database:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
