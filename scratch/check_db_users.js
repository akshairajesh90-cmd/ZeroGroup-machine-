const { Client } = require('pg');
require('dotenv').config();

const c = new Client(process.env.DATABASE_URL);
c.connect()
  .then(() => c.query('SELECT email, role, "hashedPassword" IS NOT NULL as has_pw, LEFT("hashedPassword", 7) as pw_prefix FROM users ORDER BY role'))
  .then(r => {
    console.log('\n=== USERS IN DB ===');
    if (r.rows.length === 0) {
      console.log('  *** NO USERS FOUND - DATABASE IS EMPTY ***');
    }
    r.rows.forEach(u => {
      console.log(`  ${(u.role||'').padEnd(12)} | has_pw=${u.has_pw} | pw_prefix=${u.pw_prefix} | ${u.email}`);
    });
    console.log('Total:', r.rows.length);
    console.log('===================\n');
    c.end();
  })
  .catch(e => { console.error('Error:', e.message); c.end(); });
