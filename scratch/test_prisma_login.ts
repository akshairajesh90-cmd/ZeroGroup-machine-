// Tests login using the EXACT same Prisma client the app uses
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testLogin(email: string, password: string) {
  console.log(`\n🔍 Testing: ${email} / ${password}`);
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { employee: true },
    });

    if (!user) {
      console.log('❌ User NOT FOUND via Prisma');
      return;
    }
    console.log('✅ User found:', user.email, '| role:', user.role);

    if (!user.hashedPassword) {
      console.log('❌ hashedPassword is null/empty');
      return;
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (isValid) {
      console.log('✅ Password VALID — Login SHOULD work!');
    } else {
      console.log('❌ Password INVALID — bcrypt mismatch');
    }
  } catch (e: any) {
    console.log('❌ ERROR:', e.message);
  }
}

async function main() {
  await testLogin('owner@ironrent.test', 'password123');
  await testLogin('admin@zerogroup.in', 'password123');
  await prisma.$disconnect();
  await pool.end();
}

main();
