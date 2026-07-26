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
  // Check if owner user already exists
  const existing = await prisma.user.findFirst({ where: { role: Role.OWNER } });
  if (existing) {
    console.log("✅ Owner user already exists:", existing.email);
    // Ensure employee record is linked
    const emp = await prisma.employee.findFirst({ where: { userId: existing.id } });
    if (!emp) {
      await prisma.employee.create({
        data: { name: "Admin Owner", role: Role.OWNER, userId: existing.id }
      });
      console.log("✅ Employee profile created and linked.");
    } else {
      console.log("✅ Employee profile already linked:", emp.name);
    }
    return;
  }

  // Create new owner user — use the email you log in with!
  // Read from env or fallback
  const ownerEmail = process.env.OWNER_EMAIL || "akshairajesh07@gmail.com";
  const ownerPassword = process.env.OWNER_PASSWORD || "admin123";
  const hashedPassword = await bcrypt.hash(ownerPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: ownerEmail,
      hashedPassword,
      role: Role.OWNER,
    }
  });

  await prisma.employee.create({
    data: {
      name: "Admin Owner",
      role: Role.OWNER,
      userId: user.id,
    }
  });

  console.log(`✅ Owner user created: ${ownerEmail}`);
  console.log(`🔑 Password: ${ownerPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
