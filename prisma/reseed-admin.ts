/**
 * Quick Admin Reseed Script — uses correct pg adapter to match lib/prisma.ts
 * Run: npx tsx prisma/reseed-admin.ts
 */
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
  const ownerEmail = process.env.OWNER_EMAIL || "akshairajesh07@gmail.com";
  const ownerPassword = process.env.OWNER_PASSWORD || "admin123";
  const hashedPassword = await bcrypt.hash(ownerPassword, 10);

  // Upsert main owner user
  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      hashedPassword,
      role: Role.OWNER,
    },
    create: {
      email: ownerEmail,
      hashedPassword,
      role: Role.OWNER,
    },
  });

  // Ensure employee profile is linked
  const emp = await prisma.employee.findFirst({ where: { userId: user.id } });
  if (!emp) {
    await prisma.employee.create({
      data: { name: "Admin Owner", role: Role.OWNER, userId: user.id }
    });
    console.log("✅ Employee profile created and linked.");
  } else {
    console.log("✅ Employee profile already linked:", emp.name);
  }

  // Also ensure owner@ironrent.test account password is set if present
  const testOwner = await prisma.user.findUnique({ where: { email: "owner@ironrent.test" } });
  if (testOwner) {
    const testHash = await bcrypt.hash("password123", 10);
    await prisma.user.update({
      where: { id: testOwner.id },
      data: { hashedPassword: testHash }
    });
  }

  console.log(`✅ Owner user created/updated: ${ownerEmail}`);
  console.log(`🔑 Password: ${ownerPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
