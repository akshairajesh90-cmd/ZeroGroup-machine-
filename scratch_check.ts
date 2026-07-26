import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@zerogroup.in' } });
  console.log("Admin account:", admin);
  
  const allUsers = await prisma.user.findMany({ select: { email: true } });
  console.log("All emails:", allUsers.map(u => u.email));
}

main().finally(() => prisma.$disconnect());
