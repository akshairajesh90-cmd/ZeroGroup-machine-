const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const machines = await prisma.machine.findMany();
    console.log('✅ DATABASE MACHINES:');
    console.log(JSON.stringify(machines, null, 2));

    const vehicles = await prisma.vehicle.findMany();
    console.log('✅ DATABASE VEHICLES:');
    console.log(JSON.stringify(vehicles, null, 2));

    const customers = await prisma.customer.findMany();
    console.log('✅ DATABASE CUSTOMERS:');
    console.log(JSON.stringify(customers, null, 2));

  } catch (err) {
    console.error('Prisma query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
})();


