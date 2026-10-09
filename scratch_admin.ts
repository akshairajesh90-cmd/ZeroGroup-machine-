import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@zerogroup.in' },
    update: {
      hashedPassword: "$2b$10$Q76.qD9D3aFy0L95Wp/NoOeWA3kiyAOSXkdXjBpJAVK1Q4w0VyLDC",
      role: 'OWNER'
    },
    create: {
      email: 'admin@zerogroup.in',
      hashedPassword: "$2b$10$Q76.qD9D3aFy0L95Wp/NoOeWA3kiyAOSXkdXjBpJAVK1Q4w0VyLDC",
      role: 'OWNER'
    }
  });

  const emp = await prisma.employee.findFirst({ where: { userId: adminUser.id } });
  if (!emp) {
    await prisma.employee.create({
      data: {
        name: "Zero Group Admin",
        role: "OWNER",
        userId: adminUser.id,
        phone: "9876543210",
      }
    });
    console.log("Employee profile created for admin!");
  }
  console.log('Admin account created/updated with hashed password!');
}

main().finally(() => prisma.$disconnect());
