const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function sync() {
  const employees = await prisma.employee.findMany();
  let fixed = 0;
  for (const emp of employees) {
    const user = await prisma.user.findUnique({ where: { id: emp.userId } });
    if (user && user.role !== emp.role) {
      console.log('Fixing role for ' + emp.name + ': ' + user.role + ' -> ' + emp.role);
      await prisma.user.update({ where: { id: emp.userId }, data: { role: emp.role } });
      fixed++;
    }
  }
  console.log('Fixed ' + fixed + ' out-of-sync users.');
}
sync().catch(console.error).finally(() => prisma.$disconnect());
