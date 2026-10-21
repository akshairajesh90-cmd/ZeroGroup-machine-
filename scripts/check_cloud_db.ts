import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("DATABASE_URL present:", Boolean(process.env.DATABASE_URL));
  const url = process.env.DATABASE_URL || "";
  console.log("DB Host:", url.split("@")[1]?.split("/")[0] || "unknown");

  const userCount = await prisma.user.count();
  console.log("Total Users in this database:", userCount);

  if (userCount > 0) {
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        email: true,
        role: true,
        displayPassword: true,
        hashedPassword: true,
        employee: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
    console.log("Sample Users in DB:");
    for (const u of users) {
      console.log(`- Role: ${u.role} | Email: ${u.email} | Phone: ${u.employee?.phone} | Name: ${u.employee?.name} | displayPassword: ${u.displayPassword}`);
    }
  } else {
    console.log("WARNING: DATABASE IS EMPTY! 0 users found!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
