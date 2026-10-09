import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'akshairajesh07@gmail.com';
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log(`User ${email} already exists.`);
    return;
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Create employee and user
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      role: 'OWNER',
      employee: {
        create: {
          name: 'Akshai Rajesh',
          role: 'OWNER',
          phone: '9999999999'
        }
      }
    },
    include: {
      employee: true
    }
  });

  console.log("Successfully created user:", user);
}

main()
  .catch(err => console.error("Error creating user:", err))
  .finally(() => prisma.$disconnect());
