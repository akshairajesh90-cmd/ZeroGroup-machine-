import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const leaderUser = await prisma.user.findFirst({ where: { email: 'leader@company.com' } });
  if (!leaderUser) { console.error('leader@company.com not found'); return; }
  const leaderEmployee = await prisma.employee.findUnique({ where: { userId: leaderUser.id } });
  if (!leaderEmployee) { console.error('No employee for leader'); return; }

  const customer = await prisma.customer.findFirst() ?? await prisma.customer.create({
    data: { name: 'Test Customer', phone: '1234567890', address: '123 Test St' }
  });

  let machine = await prisma.machine.findFirst({ where: { type: 'MIXER' } });
  if (!machine) {
    machine = await prisma.machine.create({
      data: { machineId: 'MIXER-TEST-1', type: 'MIXER', operatorDailyPayout: 1000 }
    });
  }

  // Delete today's dispatches first to avoid unique constraint
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  await prisma.dailyDispatch.deleteMany({
    where: { customerId: customer.id, dateOfService: { gte: new Date(today.toDateString()) } }
  });

  await prisma.dailyDispatch.create({
    data: {
      customerId: customer.id,
      machineId: machine.id,
      operatorId: leaderEmployee.id,
      location: 'Test Construction Site A',
      dateOfService: today,
      status: 'PENDING'
    }
  });

  console.log(`Created dispatch for ${leaderEmployee.name} as operator!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
