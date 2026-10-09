// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  try {
    console.log("Testing database connection...");
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log("✅ Database connection successful!");
    console.log("USERS:", users);
    
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, role: true }
    });
    console.log("EMPLOYEES:", employees);
    
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();

