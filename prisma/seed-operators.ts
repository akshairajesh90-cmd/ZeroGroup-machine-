import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import "dotenv/config";
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding operators...');

  const password = await bcrypt.hash('admin123', 10);

  const operators = [
    { name: 'Ramesh (Mixer)', email: 'ramesh@zerogroup.in', baseWage: 800, bata: 100 },
    { name: 'Suresh (Lift)', email: 'suresh@zerogroup.in', baseWage: 900, bata: 150 },
    { name: 'Mahesh (Vibrator)', email: 'mahesh@zerogroup.in', baseWage: 750, bata: 80 },
    { name: 'Kannan (Pani)', email: 'kannan@zerogroup.in', baseWage: 850, bata: 120 },
    { name: 'Rajesh (Trolly)', email: 'rajesh.op@zerogroup.in', baseWage: 850, bata: 100 }
  ];

  for (const op of operators) {
    const existing = await prisma.user.findUnique({ where: { email: op.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: op.email,
          hashedPassword: password,
          role: Role.OPERATOR,
          employee: {
            create: {
              name: op.name,
              role: Role.OPERATOR,
              baseDailyWage: op.baseWage,
              dailyBataRate: op.bata
            }
          }
        }
      });
      console.log(`Created operator: ${op.name} (${op.email})`);
    } else {
      // Update wages if they already exist
      await prisma.employee.update({
        where: { userId: existing.id },
        data: {
          baseDailyWage: op.baseWage,
          dailyBataRate: op.bata
        }
      });
      console.log(`Updated wages for existing operator: ${op.name}`);
    }
  }

  console.log('Finished seeding operators.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
