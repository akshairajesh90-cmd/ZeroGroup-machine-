import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update all existing users to have 'password123'
  await prisma.user.updateMany({
    data: {
      hashedPassword: hashedPassword,
    }
  });
  console.log(`✅ All existing users' passwords have been reset to: ${password}`);

  // Ensure a STAFF user exists
  let staffUser = await prisma.user.findFirst({ where: { role: Role.STAFF } });
  if (!staffUser) {
    staffUser = await prisma.user.create({
      data: {
        email: "staff@zerogroup.in",
        hashedPassword,
        role: Role.STAFF,
      }
    });
    
    await prisma.employee.create({
      data: {
        name: "Office Staff",
        role: Role.STAFF,
        userId: staffUser.id,
      }
    });
    console.log(`✅ Created STAFF user: staff@zerogroup.in / ${password}`);
  } else {
    console.log(`✅ STAFF user already exists: ${staffUser.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
