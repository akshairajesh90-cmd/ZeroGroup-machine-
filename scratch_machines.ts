import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const machines = await prisma.machine.findMany();
  console.log('Machines:', machines.map(m => ({ id: m.machineId, type: m.type })));
}

main().finally(() => prisma.$disconnect());
