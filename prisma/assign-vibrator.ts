import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] } as any);

async function main() {
  const dayAfterTomorrow = startOfDay(addDays(new Date(), 2));

  // Find a petrol vibrator
  const vibrator = await prisma.machine.findFirst({
    where: { type: "VIBRATOR", notes: { contains: "Petrol" } }
  });

  if (!vibrator) {
    console.log("No petrol vibrator found.");
    return;
  }

  // Assign to the first booking (which has a Mixer)
  const dispatch = await prisma.dailyDispatch.findFirst({
    where: { dateOfService: { gte: dayAfterTomorrow } },
    include: { machine: true, vibrator: true }
  });

  if (!dispatch) {
    console.log("No dispatch found to update.");
    return;
  }

  await prisma.dailyDispatch.update({
    where: { id: dispatch.id },
    data: { vibratorId: vibrator.id }
  });

  console.log(`✅ Assigned ${vibrator.machineId} to dispatch ${dispatch.machine?.machineId} on ${dispatch.location}`);
}

main()
  .catch((e) => { console.error("❌ Failed:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
