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

  // Find a Lift, a Petrol vibrator, and a Current Vibrator
  const lift = await prisma.machine.findFirst({
    where: { type: "LIFT" }
  });
  
  const petrolVibrator = await prisma.machine.findFirst({
    where: { type: "VIBRATOR", notes: { contains: "Petrol" } }
  });

  const currentVibrator = await prisma.machine.findFirst({
    where: { type: "VIBRATOR", notes: { contains: "Electric" } }
  });

  if (!lift || !petrolVibrator || !currentVibrator) {
    console.log("Missing machines.");
    return;
  }

  // Find a Dispatch that already has a Mixer
  const dispatch = await prisma.dailyDispatch.findFirst({
    where: { 
      dateOfService: { gte: dayAfterTomorrow },
      machine: { type: "MIXER" } 
    }
  });

  if (!dispatch) {
    console.log("No dispatch found to update.");
    return;
  }

  // Let's create the "Mixer + Lift + Vibrator" combo on this single dispatch
  await prisma.dailyDispatch.update({
    where: { id: dispatch.id },
    data: { 
      liftId: lift.id,
      vibratorId: currentVibrator.id
    }
  });

  console.log(`✅ Assigned ${lift.machineId} (Lift) and ${currentVibrator.machineId} (Current Vibrator) to dispatch ${dispatch.machineId} on ${dispatch.location}`);
}

main()
  .catch((e) => { console.error("❌ Failed:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
