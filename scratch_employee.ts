import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@zerogroup.in' } });
  
  if (admin) {
    const emp = await prisma.employee.create({
      data: {
        name: 'System Administrator',
        role: 'OWNER',
        fixedSalary: 50000,
        userId: admin.id
      }
    });
    console.log('Employee created and linked:', emp.id);
  } else {
    console.log('Admin not found!');
  }
}

main().finally(() => prisma.$disconnect());
