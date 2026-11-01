import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma";

async function main() {
  const store = await prisma.systemSettings.findFirst();
  console.log("=== CURRENT SYSTEM SETTINGS ===");
  console.log(JSON.stringify(store, null, 2));

  const restoredDispatch = await prisma.dailyDispatch.findUnique({
    where: { id: "cmv5kd4ps0083wsvk1uwl85kr" },
    select: {
      id: true,
      location: true,
      latitude: true,
      longitude: true,
      mapLink: true,
      isCentroidVerified: true,
    },
  });
  console.log("\n=== RESTORED DAILY DISPATCH ===");
  console.log(JSON.stringify(restoredDispatch, null, 2));

  const countPala = await prisma.dailyDispatch.count({
    where: { latitude: 9.58234 },
  });
  console.log(`\nDailyDispatches with latitude 9.58234: ${countPala}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
