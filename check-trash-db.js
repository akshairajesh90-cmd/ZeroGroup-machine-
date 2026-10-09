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
    const user = await prisma.user.findFirst({
      where: { email: 'owner@ironrent.test' }
    });
    console.log('owner@ironrent.test DB STATE:', user);
  } catch (err) {
    console.error('Prisma query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
