const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.employee.upsert({
    where: { email: 'staff@zerogroup.in' },
    update: { password: hashedPassword, role: 'STAFF' },
    create: {
      name: 'Test Staff',
      email: 'staff@zerogroup.in',
      password: hashedPassword,
      role: 'STAFF',
    }
  });
  console.log('User created');
}
run();
