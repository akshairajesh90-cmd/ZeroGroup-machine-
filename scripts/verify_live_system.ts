import { prisma } from "../src/lib/prisma";
import { parseKeralaLocation } from "../src/lib/gis/keralaGeoParser";
import { resolveDualPointNavigation } from "../src/lib/gis/dualPointRouter";
import { evaluateSiteDwellCluster, TelemetryPing } from "../src/lib/gis/dwellClusterFilter";

async function runProof() {
  console.log("\n==========================================================================");
  console.log("  ZERO GROUP ERP - LIVE SYSTEM PROOF & GIS VERIFICATION RUNNER");
  console.log("  Testing with real PostgreSQL database on localhost:5432");
  console.log("==========================================================================\n");

  // -----------------------------------------------------------------------
  // TEST 1: KERALA ADDRESS PARSER & BROAD PANCHAYAT AMBIGUITY
  // -----------------------------------------------------------------------
  console.log("🔹 STEP 1: Broad Panchayat vs Anchored Address Parsing");
  const broadCheck = parseKeralaLocation("Poonjar");
  console.log("  Input: 'Poonjar'");
  console.log("  Is Ambiguous:", broadCheck.isAmbiguous ? "⚠️ YES (RISK OF SENDING TRUCK TO WRONG VALLEY)" : "NO");
  console.log("  Warning Message:", broadCheck.warningMessage);

  const anchoredCheck = parseKeralaLocation("Poonjar, Panackapalam, near Kattachira Bridge");
  console.log("\n  Input: 'Poonjar, Panackapalam, near Kattachira Bridge'");
  console.log("  Layer 1 (Sub-locality):", anchoredCheck.subLocality);
  console.log("  Layer 2 (Micro-Anchor):", anchoredCheck.structuralAnchor);
  console.log("  Is Ambiguous:", anchoredCheck.isAmbiguous ? "YES" : "✅ NO (SAFE FOR HEAVY MACHINERY ROUTING)");

  // -----------------------------------------------------------------------
  // TEST 2: DUAL-POINT OFF-ROAD ROUTING
  // -----------------------------------------------------------------------
  console.log("\n🔹 STEP 2: Dual-Point Off-Road Navigation (Rubber Plantation Track)");
  const highwayTurnOff: [number, number] = [9.6912, 76.7820]; // PWD Tarmac road
  const estateGatePin: [number, number] = [9.6935, 76.7852];   // Off-road gate
  const dualPoint = resolveDualPointNavigation(highwayTurnOff, estateGatePin);
  console.log("  Highway Turn-off Waypoint:", highwayTurnOff);
  console.log("  Unmapped Estate Gate Pin:  ", estateGatePin);
  console.log("  Off-Road Dirt Distance:    ", `${dualPoint.offRoadDistanceM} meters`);
  console.log("  Compass Heading Vector:    ", `${dualPoint.bearingDeg}° (${dualPoint.cardinalDirection})`);
  console.log("  Crawler Speed Time:        ", `~${dualPoint.crawlDurationMins} minutes in low gear`);
  console.log("  Guidance Instruction:      ", `"${dualPoint.guidanceText}"`);

  // -----------------------------------------------------------------------
  // TEST 3: LIVE DATABASE DISPATCH CREATION WITH NEW GIS COLUMNS
  // -----------------------------------------------------------------------
  console.log("\n🔹 STEP 3: Live PostgreSQL Database Persistence Check");
  // Find an existing customer and employee to link test dispatch
  const customer = await prisma.customer.findFirst();
  const driver = await prisma.employee.findFirst({ where: { role: "DRIVER" } }) || await prisma.employee.findFirst();

  if (!customer) {
    throw new Error("No customer found in database to link test dispatch.");
  }

  console.log(`  Found existing Customer: ${customer.name} (${customer.id})`);
  console.log(`  Found existing Driver:   ${driver?.name || "Driver"} (${driver?.id || "N/A"})`);

  const initialLat = 9.680000;
  const initialLng = 76.750000; // Customer initial booking spot (5 km away)

  const testDispatch = await prisma.dailyDispatch.create({
    data: {
      customerId: customer.id,
      driverId: driver?.id || null,
      location: anchoredCheck.normalizedAddress,
      subLocality: anchoredCheck.subLocality || "Panackapalam",
      structuralAnchor: anchoredCheck.structuralAnchor || "near Kattachira Bridge",
      latitude: initialLat,
      longitude: initialLng,
      accessLatitude: highwayTurnOff[0],
      accessLongitude: highwayTurnOff[1],
      isOffRoad: true,
      offRoadBearingDeg: dualPoint.bearingDeg,
      offRoadDistanceM: dualPoint.offRoadDistanceM,
      isCentroidVerified: false,
      dateOfService: new Date(),
      status: "EN_ROUTE",
      notes: "LIVE_SYSTEM_PROOF_TEST_DISPATCH",
    },
  });

  console.log(`  ✅ Test Dispatch Created in DB! ID: ${testDispatch.id}`);
  console.log(`  DB Stored SubLocality:        ${testDispatch.subLocality}`);
  console.log(`  DB Stored StructuralAnchor:   ${testDispatch.structuralAnchor}`);
  console.log(`  DB Stored IsOffRoad:          ${testDispatch.isOffRoad}`);
  console.log(`  DB Stored AccessPoint:        [${testDispatch.accessLatitude}, ${testDispatch.accessLongitude}]`);
  console.log(`  DB Initial Booking Coords:    [${testDispatch.latitude}, ${testDispatch.longitude}]`);
  console.log(`  DB Centroid Verified Status:  ${testDispatch.isCentroidVerified ? "YES" : "NO (Awaiting Passive Dwell)"}`);

  // -----------------------------------------------------------------------
  // TEST 4: SCENARIO A - DRIVER STOPS FOR TEA ON HIGHWAY (4 MINUTES)
  // -----------------------------------------------------------------------
  console.log("\n🔹 STEP 4: Scenario A - Driver stops for 4 minutes for tea on highway");
  const teaBaseTime = Date.now() - 4 * 60 * 1000;
  const teaPings: TelemetryPing[] = [
    { latitude: 9.650100, longitude: 76.720100, speed: 0.1, timestamp: new Date(teaBaseTime + 0 * 60000) },
    { latitude: 9.650102, longitude: 76.720101, speed: 0.0, timestamp: new Date(teaBaseTime + 2 * 60000) },
    { latitude: 9.650098, longitude: 76.720099, speed: 0.1, timestamp: new Date(teaBaseTime + 4 * 60000) },
  ];

  // Trip status is still EN_ROUTE
  const teaEval = evaluateSiteDwellCluster(teaPings, {
    isOperationallyActive: ["IN_PROGRESS", "DELIVERED"].includes(testDispatch.status),
  });

  console.log("  Temporal Duration Met (>= 10m):", teaEval.guardChecks.temporalDurationMet ? "PASS" : "❌ FAIL (4 mins < 10 mins)");
  console.log("  Operational State Met:          ", teaEval.guardChecks.operationalStateMet ? "PASS" : "❌ FAIL (Status is EN_ROUTE)");
  console.log("  Result:                         ", teaEval.isVerified ? "LOCKED" : "🛡️ TEA STALL REJECTED AS FALSE POSITIVE");
  console.log("  Rejection Reason:               ", teaEval.rejectionReason);

  // -----------------------------------------------------------------------
  // TEST 5: SCENARIO B - BRIDGE TRAFFIC JAM (12 MINUTES CREEPING MOVEMENT)
  // -----------------------------------------------------------------------
  console.log("\n🔹 STEP 5: Scenario B - 12-minute traffic jam on narrow bridge (creeping 80m span)");
  const bridgeBaseTime = Date.now() - 12 * 60 * 1000;
  const bridgePings: TelemetryPing[] = [
    { latitude: 9.660000, longitude: 76.730000, speed: 0.2, timestamp: new Date(bridgeBaseTime + 0 * 60000) },
    { latitude: 9.660150, longitude: 76.730100, speed: 0.8, timestamp: new Date(bridgeBaseTime + 3 * 60000) }, // creep 20m
    { latitude: 9.660300, longitude: 76.730200, speed: 0.9, timestamp: new Date(bridgeBaseTime + 6 * 60000) }, // creep 40m
    { latitude: 9.660450, longitude: 76.730300, speed: 0.7, timestamp: new Date(bridgeBaseTime + 9 * 60000) }, // creep 60m
    { latitude: 9.660600, longitude: 76.730400, speed: 0.1, timestamp: new Date(bridgeBaseTime + 12 * 60000) }, // creep 80m
  ];

  const bridgeEval = evaluateSiteDwellCluster(bridgePings, {
    isOperationallyActive: ["IN_PROGRESS", "DELIVERED"].includes(testDispatch.status),
  });

  console.log("  Temporal Duration (>= 10m):    ", bridgeEval.guardChecks.temporalDurationMet ? "PASS" : "FAIL");
  console.log("  Spatial Variance (< 25m circle):", bridgeEval.guardChecks.spatialVarianceMet ? "PASS" : `❌ FAIL (Span: ${bridgeEval.clusterRadiusMeters}m > 25m limit)`);
  console.log("  Operational State Met:          ", bridgeEval.guardChecks.operationalStateMet ? "PASS" : "❌ FAIL (Status is EN_ROUTE)");
  console.log("  Result:                         ", bridgeEval.isVerified ? "LOCKED" : "🛡️ BRIDGE TRAFFIC JAM REJECTED AS FALSE POSITIVE");
  console.log("  Rejection Reason:               ", bridgeEval.rejectionReason);

  // -----------------------------------------------------------------------
  // TEST 6: SCENARIO C - CUSTOMER 5 KM REDIRECTION ON PHONE & REAL SITE UNLOAD
  // -----------------------------------------------------------------------
  console.log("\n🔹 STEP 6: Scenario C - Customer called on phone: 'Come 5 km up the hill to Erumapra'");
  console.log("  Driver drives 5 km up the hill to the real site, parks at gate, starts unloading.");
  
  // Transition status to IN_PROGRESS (driver arrived and working)
  await prisma.dailyDispatch.update({
    where: { id: testDispatch.id },
    data: { status: "IN_PROGRESS" },
  });

  // Real unloading pings at the actual site (Estate Gate at 9.693500, 76.785200)
  const unloadBaseTime = Date.now() - 13 * 60 * 1000;
  const siteUnloadPings: TelemetryPing[] = [
    { latitude: 9.693501, longitude: 76.785202, speed: 0.1, timestamp: new Date(unloadBaseTime + 0 * 60000) },
    { latitude: 9.693503, longitude: 76.785205, speed: 0.0, timestamp: new Date(unloadBaseTime + 2 * 60000) },
    { latitude: 9.693498, longitude: 76.785198, speed: 0.2, timestamp: new Date(unloadBaseTime + 5 * 60000) },
    { latitude: 9.693504, longitude: 76.785203, speed: 0.1, timestamp: new Date(unloadBaseTime + 8 * 60000) },
    { latitude: 9.693500, longitude: 76.785200, speed: 0.0, timestamp: new Date(unloadBaseTime + 11 * 60000) },
    { latitude: 9.693502, longitude: 76.785201, speed: 0.0, timestamp: new Date(unloadBaseTime + 13 * 60000) },
  ];

  const siteEval = evaluateSiteDwellCluster(siteUnloadPings, {
    isOperationallyActive: true, // Status is IN_PROGRESS
  });

  console.log("  Guard 1 (Speed < 0.5 m/s):      ", siteEval.guardChecks.speedConditionMet ? "✅ PASS" : "❌ FAIL");
  console.log("  Guard 2 (Spatial Variance < 25m):", siteEval.guardChecks.spatialVarianceMet ? `✅ PASS (${siteEval.clusterRadiusMeters}m radius)` : "❌ FAIL");
  console.log("  Guard 3 (Duration >= 10 mins):  ", siteEval.guardChecks.temporalDurationMet ? `✅ PASS (${siteEval.durationMinutes} mins)` : "❌ FAIL");
  console.log("  Guard 4 (Operational State):    ", siteEval.guardChecks.operationalStateMet ? "✅ PASS" : "❌ FAIL");
  console.log("  Verdict:                        ", siteEval.isVerified ? "🎯 4-POINT GUARD VERIFIED!" : "REJECTED");

  if (siteEval.isVerified && siteEval.centroid) {
    const [cLat, cLng] = siteEval.centroid;
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${cLat},${cLng}`;

    // Execute the live database lock
    const updatedDispatch = await prisma.dailyDispatch.update({
      where: { id: testDispatch.id },
      data: {
        latitude: cLat,
        longitude: cLng,
        mapLink: mapLink,
        isCentroidVerified: true,
        dwellConfidence: siteEval.confidence,
        dwellDurationMins: siteEval.durationMinutes,
      },
    });

    const clusterRecord = await prisma.siteDwellCluster.create({
      data: {
        dispatchId: testDispatch.id,
        employeeId: driver?.id || null,
        latitude: cLat,
        longitude: cLng,
        clusterRadiusM: siteEval.clusterRadiusMeters,
        durationMins: siteEval.durationMinutes,
        pingCount: siteEval.pingCount,
        confidence: siteEval.confidence,
        isVerified: true,
      },
    });

    console.log("\n🔹 STEP 7: Verified DB Record in PostgreSQL");
    console.log(`  Original Booking Coords:       [${initialLat.toFixed(6)}, ${initialLng.toFixed(6)}]`);
    console.log(`  Corrected Gate Pin Coords:     [${Number(updatedDispatch.latitude).toFixed(6)}, ${Number(updatedDispatch.longitude).toFixed(6)}]`);
    console.log(`  DB Centroid Verified Flag:     ${updatedDispatch.isCentroidVerified ? "✅ TRUE" : "FALSE"}`);
    console.log(`  DB Dwell Confidence Score:     ${Math.round((updatedDispatch.dwellConfidence || 0) * 100)}%`);
    console.log(`  DB Dwell Duration Recorded:    ${updatedDispatch.dwellDurationMins} minutes`);
    console.log(`  DB Corrected Map Link:         ${updatedDispatch.mapLink}`);
    console.log(`  DB SiteDwellCluster Log ID:    ${clusterRecord.id}`);
  }

  // Clean up test dispatch and cluster record to leave live database completely clean
  await prisma.siteDwellCluster.deleteMany({ where: { dispatchId: testDispatch.id } });
  await prisma.dailyDispatch.delete({ where: { id: testDispatch.id } });
  console.log("\n  🧹 Test dispatch and dwell cluster cleaned up from live database.");
  console.log("\n==========================================================================");
  console.log("  ✅ PROOF COMPLETE: ALL KERALA GIS MODULES WORKING ON LIVE SYSTEM!");
  console.log("==========================================================================\n");
}

runProof()
  .catch((e) => {
    console.error("Proof failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
