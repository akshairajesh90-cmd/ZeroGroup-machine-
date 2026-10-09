const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  
  const roles = [
    { email: 'driver@zerogroup.in', role: 'DRIVER', name: 'Test Driver' },
    { email: 'operator@zerogroup.in', role: 'OPERATOR', name: 'Test Operator' },
    { email: 'staff@zerogroup.in', role: 'STAFF', name: 'Test Staff' },
    { email: 'owner@zerogroup.in', role: 'OWNER', name: 'Test Owner' },
    { email: 'leader@zerogroup.in', role: 'WORKER', name: 'Test Leader', defaultCrewRole: 'WORKER_LEADER' }
  ];

  for (const r of roles) {
    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: r.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: r.email,
          password,
          name: r.name,
          role: r.role
        }
      });
    } else {
      user = await prisma.user.update({
        where: { email: r.email },
        data: { password, role: r.role }
      });
    }

    // Ensure they have an employee record (needed for financials/pay)
    let emp = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (!emp) {
      await prisma.employee.create({
        data: {
          userId: user.id,
          name: r.name,
          role: r.role,
          phone: Math.floor(Math.random() * 10000000000).toString(),
          baseDailyWage: 1000,
          dailyBataRate: 200,
          fixedSalary: 0,
          defaultCrewRole: r.defaultCrewRole || null
        }
      });
    }
  }
  console.log('Seed complete.');
}
main();
