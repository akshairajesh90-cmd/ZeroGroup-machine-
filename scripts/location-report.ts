/**
 * Zero Group ERP — Location System Audit & Measurement Report (Phase 0a)
 * 
 * Read-only metrics script analyzing the last 30 days of real operational telemetry:
 * - Total dispatches and breakdown by locationSource priority tier (weights 1-5)
 * - Percentage of dispatches reaching VERIFIED_CENTROID
 * - Ping cadence and largest gap per dispatch during ARRIVED / ON_SITE (IN_PROGRESS)
 * - Accuracy distribution (> 50m and > 100m)
 * - Pings per active employee per day (stationary filter suppression effect)
 * - Discrepancy analysis: STAFF_OVERRIDE vs VERIFIED_CENTROID (> 300m)
 */

import { prisma } from "../src/lib/prisma";

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runLocationReport() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  console.log("================================================================================");
  console.log("ZERO GROUP ERP: 30-DAY LOCATION SYSTEM METRICS REPORT (READ-ONLY)");
  console.log(`Window: ${thirtyDaysAgo.toISOString().split("T")[0]} to ${new Date().toISOString().split("T")[0]}`);
  console.log("================================================================================\n");

  // 1. Dispatches and LocationSource Breakdown
  const dispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: thirtyDaysAgo },
      isPendingDelete: false,
    },
    select: {
      id: true,
      status: true,
      location: true,
      latitude: true,
      longitude: true,
      locationSource: true,
      isCentroidVerified: true,
      dateOfService: true,
      driverId: true,
      operatorId: true,
    },
  });

  const totalDispatches = dispatches.length;
  const sourceBreakdown: Record<string, number> = {
    STAFF_BOOKING: 0,
    DRIVER_PIN: 0,
    OPERATOR_PIN: 0,
    VERIFIED_CENTROID: 0,
    STAFF_OVERRIDE: 0,
    UNSET_LEGACY: 0,
  };

  let verifiedCentroidCount = 0;

  for (const d of dispatches) {
    if (d.isCentroidVerified) {
      verifiedCentroidCount++;
    }

    if (d.locationSource && sourceBreakdown[d.locationSource] !== undefined) {
      sourceBreakdown[d.locationSource]++;
    } else if (d.isCentroidVerified) {
      sourceBreakdown.VERIFIED_CENTROID++;
    } else {
      sourceBreakdown.UNSET_LEGACY++;
    }
  }

  console.log("1. DISPATCH LOCATION SOURCE BREAKDOWN (Weights 1 - 5):");
  console.log(`   Total Dispatches (last 30d): ${totalDispatches}`);
  console.log(`   - Weight 1 [STAFF_BOOKING]     : ${sourceBreakdown.STAFF_BOOKING} (${totalDispatches ? ((sourceBreakdown.STAFF_BOOKING / totalDispatches) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Weight 2 [DRIVER_PIN]        : ${sourceBreakdown.DRIVER_PIN} (${totalDispatches ? ((sourceBreakdown.DRIVER_PIN / totalDispatches) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Weight 3 [OPERATOR_PIN]      : ${sourceBreakdown.OPERATOR_PIN} (${totalDispatches ? ((sourceBreakdown.OPERATOR_PIN / totalDispatches) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Weight 4 [VERIFIED_CENTROID] : ${sourceBreakdown.VERIFIED_CENTROID} (${totalDispatches ? ((sourceBreakdown.VERIFIED_CENTROID / totalDispatches) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Weight 5 [STAFF_OVERRIDE]    : ${sourceBreakdown.STAFF_OVERRIDE} (${totalDispatches ? ((sourceBreakdown.STAFF_OVERRIDE / totalDispatches) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Legacy/Unset (Defaulted to 1): ${sourceBreakdown.UNSET_LEGACY} (${totalDispatches ? ((sourceBreakdown.UNSET_LEGACY / totalDispatches) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Verified Centroid Locked Flag: ${verifiedCentroidCount} / ${totalDispatches} (${totalDispatches ? ((verifiedCentroidCount / totalDispatches) * 100).toFixed(1) : 0}%)\n`);

  // 2. On-Site Pings Cadence & Largest Gap (ARRIVED / IN_PROGRESS)
  const onSiteDispatches = dispatches.filter(
    (d) => d.status === "IN_PROGRESS" || d.status === "DELIVERED" || d.status === "COMPLETED"
  );

  const dispatchIds = onSiteDispatches.map((d) => d.id);
  const pings = await prisma.locationPing.findMany({
    where: {
      dispatchId: { in: dispatchIds },
      timestamp: { gte: thirtyDaysAgo },
    },
    orderBy: { timestamp: "asc" },
  });

  const pingsByDispatch: Record<string, typeof pings> = {};
  for (const p of pings) {
    if (!p.dispatchId) continue;
    if (!pingsByDispatch[p.dispatchId]) pingsByDispatch[p.dispatchId] = [];
    pingsByDispatch[p.dispatchId].push(p);
  }

  let totalGapsMinutes = 0;
  let gapCount = 0;
  let maxGapMinutes = 0;
  let totalOnSitePings = pings.length;

  for (const dId of dispatchIds) {
    const dPings = pingsByDispatch[dId] || [];
    if (dPings.length >= 2) {
      for (let i = 1; i < dPings.length; i++) {
        const gapMins = (dPings[i].timestamp.getTime() - dPings[i - 1].timestamp.getTime()) / (1000 * 60);
        totalGapsMinutes += gapMins;
        gapCount++;
        if (gapMins > maxGapMinutes) maxGapMinutes = gapMins;
      }
    }
  }

  console.log("2. ON-SITE PING CADENCE & GAPS (Status: IN_PROGRESS / DELIVERED / COMPLETED):");
  console.log(`   Total Tracked Dispatches on Site: ${onSiteDispatches.length}`);
  console.log(`   Total Dispatches with Linked Pings: ${Object.keys(pingsByDispatch).length}`);
  console.log(`   Total On-Site Pings Recorded     : ${totalOnSitePings}`);
  console.log(`   Average Gap Between Pings        : ${gapCount ? (totalGapsMinutes / gapCount).toFixed(1) : "N/A"} minutes`);
  console.log(`   Largest Gap Between Pings        : ${maxGapMinutes ? maxGapMinutes.toFixed(1) : "N/A"} minutes\n`);

  // 3. Ping Accuracy Distribution (> 50m and > 100m)
  const allRecentPings = await prisma.locationPing.findMany({
    where: { timestamp: { gte: thirtyDaysAgo } },
    select: { accuracy: true, employeeId: true, timestamp: true },
  });

  const totalAllPings = allRecentPings.length;
  let accuracyOver50m = 0;
  let accuracyOver100m = 0;

  for (const p of allRecentPings) {
    if (p.accuracy != null) {
      if (p.accuracy > 50) accuracyOver50m++;
      if (p.accuracy > 100) accuracyOver100m++;
    }
  }

  console.log("3. GPS ACCURACY DISTRIBUTION:");
  console.log(`   Total Pings Analyzed (last 30d): ${totalAllPings}`);
  console.log(`   - Pings with Accuracy > 50m    : ${accuracyOver50m} (${totalAllPings ? ((accuracyOver50m / totalAllPings) * 100).toFixed(2) : 0}%)`);
  console.log(`   - Pings with Accuracy > 100m   : ${accuracyOver100m} (${totalAllPings ? ((accuracyOver100m / totalAllPings) * 100).toFixed(2) : 0}%)\n`);

  // 4. Pings per Active Employee per Day (Stationary Suppression Effect)
  const employeeDays: Record<string, number> = {};
  for (const p of allRecentPings) {
    const dayKey = `${p.employeeId}_${p.timestamp.toISOString().split("T")[0]}`;
    employeeDays[dayKey] = (employeeDays[dayKey] || 0) + 1;
  }

  const activeEmployeeDayCounts = Object.values(employeeDays);
  const totalEmpDays = activeEmployeeDayCounts.length;
  const avgPingsPerDay = totalEmpDays
    ? activeEmployeeDayCounts.reduce((a, b) => a + b, 0) / totalEmpDays
    : 0;
  const minPingsPerDay = totalEmpDays ? Math.min(...activeEmployeeDayCounts) : 0;
  const maxPingsPerDay = totalEmpDays ? Math.max(...activeEmployeeDayCounts) : 0;

  console.log("4. STATIONARY SUPPRESSION EFFECT (Pings per Active Employee per Day):");
  console.log(`   Active Employee-Days Tracked: ${totalEmpDays}`);
  console.log(`   Average Pings / Employee / Day: ${avgPingsPerDay.toFixed(1)}`);
  console.log(`   Min Pings / Employee / Day    : ${minPingsPerDay}`);
  console.log(`   Max Pings / Employee / Day    : ${maxPingsPerDay}`);
  console.log(`   (Note: High suppression observed when stationary; 600s cadence limits max pings to ~6/hr while static)\n`);

  // 5. Staff Override vs Verified Centroid Discrepancies (> 300m)
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      actionType: { in: ["UPDATE_SITE_LOCATION", "OVERRIDE_SITE_LOCATION", "LOCATION_DISCREPANCY_FLAG"] },
      timestamp: { gte: thirtyDaysAgo },
    },
    select: {
      newPayload: true,
      oldPayload: true,
      timestamp: true,
    },
  });

  let overridesChecked = 0;
  let discrepanciesOver300m = 0;

  for (const log of auditLogs) {
    const np = log.newPayload as any;
    const op = log.oldPayload as any;
    if (np?.source === "STAFF_OVERRIDE" && op?.isCentroidVerified && op?.latitude && op?.longitude && np?.latitude && np?.longitude) {
      overridesChecked++;
      const dist = haversineDistanceMeters(
        Number(np.latitude),
        Number(np.longitude),
        Number(op.latitude),
        Number(op.longitude)
      );
      if (dist > 300) {
        discrepanciesOver300m++;
      }
    }
  }

  console.log("5. DISCREPANCY ANALYSIS (STAFF_OVERRIDE vs VERIFIED_CENTROID):");
  console.log(`   Staff Overrides on Verified Centroids: ${overridesChecked}`);
  console.log(`   Discrepancies > 300m Raised           : ${discrepanciesOver300m}`);
  console.log("================================================================================");
}

runLocationReport()
  .catch((err) => {
    console.error("Report execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
