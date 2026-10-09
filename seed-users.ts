import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = "postgresql://postgres:Akshai%402005@localhost:5432/postgres?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const roles = [
    { email: 'driver@zerogroup.in', role: 'DRIVER', name: 'Test Driver' },
    { email: 'operator@zerogroup.in', role: 'OPERATOR', name: 'Test Operator' },
    { email: 'staff@zerogroup.in', role: 'STAFF', name: 'Test Staff' },
    { email: 'owner@zerogroup.in', role: 'OWNER', name: 'Test Owner' },
    { email: 'leader@zerogroup.in', role: 'WORKER', name: 'Test Leader', defaultCrewRole: 'WORKER_LEADER' }
  ];

  for (const r of roles) {
    let user = await prisma.user.findUnique({ where: { email: r.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: r.email,
          hashedPassword,
          role: r.role as any
        }
      });
    } else {
      user = await prisma.user.update({
        where: { email: r.email },
        data: { hashedPassword, role: r.role as any }
      });
    }

    let emp = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (!emp) {
      await prisma.employee.create({
        data: {
          userId: user.id,
          name: r.name,
          role: r.role as any,
          phone: Math.floor(Math.random() * 10000000000).toString(),
          baseDailyWage: 1000,
          dailyBataRate: 200,
          fixedSalary: 0,
          defaultCrewRole: r.defaultCrewRole as any || null
        }
      });
    }
  }
  console.log('Seed complete.');
}
main();
