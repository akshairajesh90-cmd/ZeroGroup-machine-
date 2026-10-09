const { Client } = require('pg');
require('dotenv').config();

const c = new Client(process.env.DATABASE_URL);
c.connect()
  .then(() => c.query('SELECT email, role FROM "User" ORDER BY role LIMIT 30').catch(() => c.query('SELECT email, role FROM "user" ORDER BY role LIMIT 30')))
  .then(r => {
    console.log('\n=== USERS IN DATABASE ===');
    r.rows.forEach(u => console.log(`  ${u.role.padEnd(10)} | ${u.email}`));
    console.log('========================\n');
    c.end();
  })
  .catch(e => {
    console.error('DB Error:', e.message);
    c.end();
  });
