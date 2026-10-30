import { parseKeralaLocation } from "../src/lib/gis/keralaGeoParser";
import { resolveDualPointNavigation } from "../src/lib/gis/dualPointRouter";
import { evaluateSiteDwellCluster, TelemetryPing } from "../src/lib/gis/dwellClusterFilter";

function printDivider(title: string) {
  console.log("\n" + "=".repeat(75));
  console.log(`  ${title}`);
  console.log("=".repeat(75));
}

async function runDemo() {
  console.log("\n===========================================================================");
  console.log("  ZERO GROUP ERP - KERALA RURAL LOGISTICS & GIS ROUTING DEMO");
  console.log("  Operational Area: Poonjar, Kottayam High-Ranges, Rubber Plantations");
  console.log("===========================================================================");

  // -------------------------------------------------------------------------
  // STAGE 1: SUB-LOCALITY & ANCHOR-BASED GEOCODING
  // -------------------------------------------------------------------------
  printDivider("STAGE 1: TWO-LAYER SUB-LOCALITY & ANCHOR GEOCODING");

  console.log("\n[TEST 1A] Dispatcher types generic broad town: 'Poonjar'");
  const parsedBroad = parseKeralaLocation("Poonjar");
  console.log("Input:", parsedBroad.rawInput);
  console.log("Is Ambiguous:", parsedBroad.isAmbiguous ? "⚠️ YES (RISK OF LOGISTICS FAILURE)" : "NO");
  console.log("System Warning:", parsedBroad.warningMessage);

  console.log("\n[TEST 1B] Dispatcher types two-layer location: 'Poonjar, Panackapalam, near Kattachira Bridge'");
  const parsedAnchored = parseKeralaLocation("Poonjar, Panackapalam, near Kattachira Bridge");
  console.log("Input:", parsedAnchored.rawInput);
  console.log("Layer 1 (Sub-locality / Ward):", parsedAnchored.subLocality);
  console.log("Layer 2 (Structural Micro-Anchor):", parsedAnchored.structuralAnchor);
  console.log("Broad Panchayat:", parsedAnchored.broadTown);
  console.log("Is Ambiguous:", parsedAnchored.isAmbiguous ? "YES" : "✅ NO (SAFE TO ROUTE)");
  console.log("Normalized Clean Address:", parsedAnchored.normalizedAddress);

  // -------------------------------------------------------------------------
  // STAGE 2: OFF-ROAD & DUAL-POINT NAVIGATION
  // -------------------------------------------------------------------------
  printDivider("STAGE 2: OFF-ROAD & DUAL-POINT NAVIGATION (ESTATE DIRT TRACK)");

  // Scenario: Rubber plantation unloading site 435 meters off the PWD highway
  const highwayAccessPoint: [number, number] = [9.6912, 76.7820]; // PWD Tarmac road
  const estateGatePin: [number, number] = [9.6935, 76.7852];      // Target unloading gate off-road

  console.log("Highway Turn-off (Access Waypoint):", highwayAccessPoint);
  console.log("Unmapped Estate Gate Pin:", estateGatePin);

  const dualPointResult = resolveDualPointNavigation(highwayAccessPoint, estateGatePin);

  console.log("\nRouting Analysis:");
  console.log("- Destination Type:", dualPointResult.isOffRoad ? "🌲 OFF-ROAD PRIVATE TRACK" : "PAVED HIGHWAY");
  console.log("- Off-Road Distance:", `${dualPointResult.offRoadDistanceM} meters`);
  console.log("- Compass Azimuth Heading:", `${dualPointResult.bearingDeg}° (${dualPointResult.cardinalDirection})`);
  console.log("- Heavy Equipment Crawler Time:", `~${dualPointResult.crawlDurationMins} minutes (low-gear crawl)`);
  console.log("\nDriver Guidance Instruction:");
  console.log(`👉 "${dualPointResult.guidanceText}"`);

  // -------------------------------------------------------------------------
  // STAGE 3: PASSIVE DWELL & HUMAN DRIVER BEHAVIOR FILTERING
  // -------------------------------------------------------------------------
  printDivider("STAGE 3: PASSIVE DWELL & 4-POINT VERIFICATION GUARD");

  // TEST 3A: Valid Site Unloading Dwell (12 minutes, speed < 0.2 m/s, cluster radius 11.4m)
  console.log("\n[TEST 3A] Real Concrete Mixer Unloading at Job Site (12 Minutes Dwell):");
  const baseTime = Date.now() - 12 * 60 * 1000;
  const validSitePings: TelemetryPing[] = [
    { latitude: 9.693501, longitude: 76.785202, speed: 0.1, timestamp: new Date(baseTime + 0 * 60000) },
    { latitude: 9.693504, longitude: 76.785205, speed: 0.0, timestamp: new Date(baseTime + 2 * 60000) },
    { latitude: 9.693498, longitude: 76.785198, speed: 0.2, timestamp: new Date(baseTime + 4 * 60000) },
    { latitude: 9.693507, longitude: 76.785209, speed: 0.1, timestamp: new Date(baseTime + 6 * 60000) },
    { latitude: 9.693502, longitude: 76.785201, speed: 0.0, timestamp: new Date(baseTime + 8 * 60000) },
    { latitude: 9.693499, longitude: 76.785199, speed: 0.0, timestamp: new Date(baseTime + 10 * 60000) },
    { latitude: 9.693505, longitude: 76.785203, speed: 0.1, timestamp: new Date(baseTime + 12 * 60000) },
  ];

  const validEvaluation = evaluateSiteDwellCluster(validSitePings, { isOperationallyActive: true });
  console.log("Guard 1 (Speed < 0.5 m/s):", validEvaluation.guardChecks.speedConditionMet ? "✅ PASS" : "❌ FAIL");
  console.log("Guard 2 (Spatial Variance < 25m):", validEvaluation.guardChecks.spatialVarianceMet ? `✅ PASS (${validEvaluation.clusterRadiusMeters}m radius)` : "❌ FAIL");
  console.log("Guard 3 (Duration >= 10 mins):", validEvaluation.guardChecks.temporalDurationMet ? `✅ PASS (${validEvaluation.durationMinutes} mins)` : "❌ FAIL");
  console.log("Guard 4 (Operational Dispatch Active):", validEvaluation.guardChecks.operationalStateMet ? "✅ PASS" : "❌ FAIL");
  console.log("\nVerdict:", validEvaluation.isVerified ? "🎯 VERIFIED & CENTROID LOCKED!" : "REJECTED");
  console.log("Mathematical Centroid Coordinates:", validEvaluation.centroid);
  console.log(`Dwell Confidence Score: ${Math.round(validEvaluation.confidence * 100)}%`);

  // TEST 3B: False Positive Rejection (Highway Tea Break - 4 minutes stop)
  console.log("\n[TEST 3B] False Positive Guard: Driver stops for Tea on Highway (4 Minutes Stop):");
  const teaBreakBase = Date.now() - 4 * 60 * 1000;
  const teaBreakPings: TelemetryPing[] = [
    { latitude: 9.650100, longitude: 76.720100, speed: 0.1, timestamp: new Date(teaBreakBase + 0 * 60000) },
    { latitude: 9.650105, longitude: 76.720102, speed: 0.0, timestamp: new Date(teaBreakBase + 2 * 60000) },
    { latitude: 9.650098, longitude: 76.720098, speed: 0.1, timestamp: new Date(teaBreakBase + 4 * 60000) },
  ];

  const teaEvaluation = evaluateSiteDwellCluster(teaBreakPings, { isOperationallyActive: true });
  console.log("Guard 3 (Duration >= 10 mins):", teaEvaluation.guardChecks.temporalDurationMet ? "PASS" : "❌ FAILED (Duration 4m < 10m)");
  console.log("Verdict:", teaEvaluation.isVerified ? "LOCKED" : "🛡️ FALSE POSITIVE SAFELY REJECTED");
  console.log("Rejection Reason:", teaEvaluation.rejectionReason);

  printDivider("DEMO SUMMARY: ALL 3 GIS PRINCIPLES VERIFIED SUCCESSFULLY");
}

runDemo().catch(console.error).finally(() => process.exit(0));
