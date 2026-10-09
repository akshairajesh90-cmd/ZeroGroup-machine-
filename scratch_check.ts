import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const allUsers = await prisma.user.findMany({
    include: { employee: true }
  });
  console.log("Users:", allUsers.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    hashPrefix: u.hashedPassword?.substring(0, 10),
    employeeId: u.employee?.id,
    employeeName: u.employee?.name,
    phone: u.employee?.phone
  })));
}

main().finally(() => prisma.$disconnect());
