// Simulates EXACTLY what auth.ts does during login
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin(email, password) {
  console.log(`\n🔍 Testing login: ${email} / ${password}`);
  const c = new Client(process.env.DATABASE_URL);
  
  try {
    await c.connect();
    console.log('✅ DB connected');

    const res = await c.query(
      'SELECT id, email, role, "hashedPassword" FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (res.rows.length === 0) {
      console.log('❌ FAIL: User not found in DB');
      return;
    }

    const user = res.rows[0];
    console.log('✅ User found:', user.email, '| role:', user.role);

    if (!user.hashedPassword) {
      console.log('❌ FAIL: hashedPassword is NULL');
      return;
    }

    console.log('✅ hashedPassword exists, prefix:', user.hashedPassword.substring(0, 7));

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (isValid) {
      console.log('✅ SUCCESS: Password matches! Login should work.');
    } else {
      console.log('❌ FAIL: bcrypt.compare returned false — wrong password or corrupted hash');
    }
  } catch(e) {
    console.log('❌ DB ERROR:', e.message);
  } finally {
    await c.end();
  }
}

async function main() {
  await testLogin('owner@ironrent.test', 'password123');
  await testLogin('admin@zerogroup.in', 'password123');
  await testLogin('owner@zerogroup.in', 'password123'); // the one user tried
}

main();
