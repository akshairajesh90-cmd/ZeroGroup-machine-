import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@zerogroup.in';
  const password = 'password123';
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user) {
    console.log("User not found!");
    return;
  }
  console.log("User found:", user.email);
  console.log("Hashed password:", user.hashedPassword);
  
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  console.log("Password valid?", isValid);
}

main().finally(() => prisma.$disconnect());
