import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    data: {
      hashedPassword: "$2b$10$Q76.qD9D3aFy0L95Wp/NoOeWA3kiyAOSXkdXjBpJAVK1Q4w0VyLDC" // password123
    }
  });
  console.log("All passwords reset to: password123");
}

main().finally(() => prisma.$disconnect());
