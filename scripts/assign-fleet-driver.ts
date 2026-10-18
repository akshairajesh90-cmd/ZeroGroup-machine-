import { prisma } from "../src/lib/prisma";

async function main() {
  const fleetDriver = await prisma.employee.findFirst({
    where: { user: { email: "driver@zerogroup.com" } }
  });
  console.log("Fleet driver demo:", fleetDriver);

  if (fleetDriver) {
    const hisDispatches = await prisma.dailyDispatch.findMany({
      where: { driverId: fleetDriver.id },
      take: 5
    });
    console.log("Fleet driver dispatches count:", hisDispatches.length);
    if (hisDispatches.length === 0) {
      // Let's assign 2 of today's dispatches to Fleet Driver Demo so they show up immediately on his dashboard!
      const unassignedOrOthers = await prisma.dailyDispatch.findMany({
        where: {
          dateOfService: { gte: new Date(new Date().setHours(0,0,0,0)) },
          isPendingDelete: false
        },
        take: 2
      });
      for (const d of unassignedOrOthers) {
        await prisma.dailyDispatch.update({
          where: { id: d.id },
          data: { driverId: fleetDriver.id }
        });
        console.log(`Assigned today's dispatch ${d.id} (${d.location}) to Fleet Driver Demo!`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
