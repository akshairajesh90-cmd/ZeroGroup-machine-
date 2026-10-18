import { prisma } from "../src/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

async function main() {
  const now = new Date();
  console.log("Current server time:", now.toISOString());
  
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  console.log("Today range:", todayStart.toISOString(), "to", todayEnd.toISOString());

  const dispatchesToday = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: todayStart, lte: todayEnd },
      isPendingDelete: false
    },
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      operator: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      machine: { select: { id: true, machineId: true, type: true } },
    }
  });

  console.log(`Dispatches today (${dispatchesToday.length}):`);
  for (const d of dispatchesToday) {
    console.log(`- ID: ${d.id} | Status: ${d.status} | Site: "${d.location}" | Driver: ${d.driver?.name ?? "None"} (ID: ${d.driverId}) | Operator: ${d.operator?.name ?? "None"} | Lat/Lng: ${d.latitude}, ${d.longitude}`);
  }

  const drivers = await prisma.employee.findMany({
    where: { role: "DRIVER" },
    select: { id: true, name: true, phone: true, lastLatitude: true, lastLongitude: true, lastLocationUpdate: true, user: { select: { email: true } } }
  });
  console.log(`\nDrivers in system (${drivers.length}):`);
  for (const drv of drivers) {
    console.log(`- ${drv.name} (${drv.user?.email}) ID: ${drv.id}: lastLoc=(${drv.lastLatitude}, ${drv.lastLongitude}) at ${drv.lastLocationUpdate?.toISOString()}`);
  }

  // Count total dispatches and location pings
  const totalDispatches = await prisma.dailyDispatch.count();
  const totalPings = await prisma.locationPing.count();
  console.log(`\nTotal Dispatches in DB: ${totalDispatches}`);
  console.log(`Total LocationPings in DB: ${totalPings}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
