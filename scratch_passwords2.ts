import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.updateMany({
    data: {
      hashedPassword: "$2b$10$Q76.qD9D3aFy0L95Wp/NoOeWA3kiyAOSXkdXjBpJAVK1Q4w0VyLDC"
    }
  });
  console.log("All passwords reset to: password123");
}

main().finally(() => prisma.$disconnect());
