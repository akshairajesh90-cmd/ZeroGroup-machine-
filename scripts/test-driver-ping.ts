import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Testing Driver Site Ping Flow ===");

  // 1. Find driver
  const driver = await prisma.employee.findFirst({
    where: { user: { email: "driver@zerogroup.com" } }
  });

  if (!driver) {
    throw new Error("Fleet Driver Demo not found");
  }

  console.log(`Driver found: ${driver.name} (ID: ${driver.id})`);

  // 2. Find today's dispatch assigned to him
  const dispatch = await prisma.dailyDispatch.findFirst({
    where: { driverId: driver.id },
    include: { customer: true, machine: true }
  });

  if (!dispatch) {
    throw new Error("No dispatch assigned to Fleet Driver Demo");
  }

  console.log(`Assigned Dispatch ID: ${dispatch.id}`);
  console.log(`Destination Site: "${dispatch.location}"`);
  console.log(`Customer: ${dispatch.customer?.name} (${dispatch.customer?.phone || "No phone"})`);
  console.log(`Machine: ${dispatch.machine?.machineId}`);
  console.log(`Current Dispatch MapLink: ${dispatch.mapLink || "None"}`);

  // 3. Simulate driver pinging GPS location to site
  const testLat = 9.5930; // Near Pala / Odayakkal Residential
  const testLng = 76.5240;
  const testAcc = 8; // ±8 meters accuracy

  console.log(`\nSimulating GPS ping from Driver App to Site...`);
  console.log(`Coordinates: (${testLat}, ${testLng}), Accuracy: ±${testAcc}m`);

  // Create LocationPing record
  const ping = await prisma.locationPing.create({
    data: {
      employeeId: driver.id,
      dispatchId: dispatch.id,
      latitude: testLat,
      longitude: testLng,
      accuracy: testAcc,
      source: "DRIVER_APP",
      timestamp: new Date(),
    }
  });

  // Update employee latest coordinates
  const updatedDriver = await prisma.employee.update({
    where: { id: driver.id },
    data: {
      lastLatitude: testLat,
      lastLongitude: testLng,
      lastLocationUpdate: new Date(),
      lastSyncStatus: "ONLINE",
    }
  });

  // Update dispatch map link if needed
  const gmapLink = `https://www.google.com/maps/search/?api=1&query=${testLat},${testLng}`;
  const updatedDispatch = await prisma.dailyDispatch.update({
    where: { id: dispatch.id },
    data: {
      mapLink: gmapLink,
      latitude: testLat,
      longitude: testLng,
    }
  });

  console.log(`\n✅ LocationPing successfully created: ID ${ping.id}`);
  console.log(`✅ Employee Telemetry Updated:`);
  console.log(`   - Last Lat/Lng: (${updatedDriver.lastLatitude}, ${updatedDriver.lastLongitude})`);
  console.log(`   - Last Location Update: ${updatedDriver.lastLocationUpdate?.toISOString()}`);
  console.log(`   - Status: ${updatedDriver.lastSyncStatus}`);
  console.log(`✅ Dispatch Site Coordinates & MapLink Updated:`);
  console.log(`   - Map Link: ${updatedDispatch.mapLink}`);

  // 4. Check 15-minute Cadence status on Live Map
  const minutesAgo = (Date.now() - updatedDriver.lastLocationUpdate!.getTime()) / 60000;
  const isDriverLive = minutesAgo <= 15;
  console.log(`\n=== Live Map Cadence Verification ===`);
  console.log(`Driver ping age: ${minutesAgo.toFixed(2)} minutes`);
  console.log(`Driver Cadence Rule: 15 minutes max`);
  console.log(`Status on Command Live Map: ${isDriverLive ? "🟢 LIVE (Active & In Cadence)" : "🔴 OVERDUE"}`);

  // 5. Total counts
  const totalPings = await prisma.locationPing.count();
  console.log(`Total LocationPings now in database: ${totalPings}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
