const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPasswords() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();

  const newPassword = 'password123';
  const hashed = await bcrypt.hash(newPassword, 10);

  const result = await c.query(
    'UPDATE users SET "hashedPassword" = $1 RETURNING email, role',
    [hashed]
  );

  console.log('\n=== PASSWORDS RESET ===');
  result.rows.forEach(u => {
    console.log(`  ✅ ${(u.role||'').padEnd(12)} | ${u.email}`);
  });
  console.log(`\nAll passwords set to: ${newPassword}`);
  console.log('=======================\n');

  await c.end();
}

resetPasswords().catch(e => { console.error('Error:', e.message); process.exit(1); });
