"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";

export async function getAssetPnL(startDate: string, endDate: string) {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  // Use raw queries with CTEs to avoid cartesian products on joins
  const machines: any[] = await prisma.$queryRaw`
    WITH revenue AS (
      SELECT "machineId", SUM("customerCharge") as revenue
      FROM daily_dispatches
      WHERE status = 'COMPLETED' 
        AND "dateOfService" >= ${new Date(startDate)} 
        AND "dateOfService" <= ${new Date(endDate)}
      GROUP BY "machineId"
    ),
    expenses_agg AS (
      SELECT "machineId",
        SUM(CASE WHEN category = 'DIESEL' OR category = 'FUEL' THEN amount ELSE 0 END) as fuel,
        SUM(CASE WHEN category = 'REPAIR' THEN amount ELSE 0 END) as repair
      FROM expenses
      WHERE date >= ${new Date(startDate)} 
        AND date <= ${new Date(endDate)}
      GROUP BY "machineId"
    )
    SELECT 
      m.id, 
      m."machineId" as name, 
      m.type, 
      'MACHINE' as "assetType",
      COALESCE(r.revenue, 0) as "grossRevenue",
      COALESCE(e.fuel, 0) as "fuelCosts",
      COALESCE(e.repair, 0) as "repairCosts"
    FROM machines m
    LEFT JOIN revenue r ON r."machineId" = m.id
    LEFT JOIN expenses_agg e ON e."machineId" = m.id
    WHERE m."isPendingDelete" = false
  `;

  const vehicles: any[] = await prisma.$queryRaw`
    WITH expenses_agg_v AS (
      SELECT "vehicleId",
        SUM(CASE WHEN category = 'DIESEL' OR category = 'FUEL' THEN amount ELSE 0 END) as fuel,
        SUM(CASE WHEN category = 'REPAIR' THEN amount ELSE 0 END) as repair
      FROM expenses
      WHERE date >= ${new Date(startDate)} 
        AND date <= ${new Date(endDate)}
      GROUP BY "vehicleId"
    )
    SELECT 
      v.id, 
      v."licensePlate" as name, 
      v.type, 
      'VEHICLE' as "assetType",
      0 as "grossRevenue",
      COALESCE(e.fuel, 0) as "fuelCosts",
      COALESCE(e.repair, 0) as "repairCosts"
    FROM vehicles v
    LEFT JOIN expenses_agg_v e ON e."vehicleId" = v.id
    WHERE v."isPendingDelete" = false
  `;

  const results = [...machines, ...vehicles].map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    assetType: a.assetType,
    grossRevenue: Number(a.grossRevenue),
    fuelCosts: Number(a.fuelCosts),
    repairCosts: Number(a.repairCosts),
    netProfit: Number(a.grossRevenue) - (Number(a.fuelCosts) + Number(a.repairCosts))
  }));

  // Sort by net profit descending
  return results.sort((a, b) => b.netProfit - a.netProfit);
}

export async function getCustomerSitePnL(startDate: string, endDate: string) {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  // Get Invoiced Revenue grouped by Customer and Site
  const siteRevenue: any[] = await prisma.$queryRaw`
    SELECT 
      c.id as "customerId", 
      c.name as "customerName", 
      i."siteLocation" as "siteLocation",
      SUM(i."totalAmount") as "totalBilled"
    FROM invoices i
    JOIN customers c ON i."customerId" = c.id
    WHERE i."issuedDate" >= ${new Date(startDate)} 
      AND i."issuedDate" <= ${new Date(endDate)}
      AND i."isPendingDelete" = false
    GROUP BY c.id, c.name, i."siteLocation"
  `;

  // Get Direct Expenses grouped by Customer and Site (via DailyDispatch)
  const siteExpenses: any[] = await prisma.$queryRaw`
    SELECT 
      d."customerId",
      d.location as "siteLocation",
      SUM(e.amount) as "directCosts"
    FROM expenses e
    JOIN daily_dispatches d ON e."dispatchId" = d.id
    WHERE e.date >= ${new Date(startDate)} 
      AND e.date <= ${new Date(endDate)}
      AND e."isPendingDelete" = false
    GROUP BY d."customerId", d.location
  `;

  // Merge the two lists in JS based on customerId and siteLocation (normalized)
  const map = new Map<string, any>();

  const getHash = (customerId: string, siteLocation: string | null) =>
    `${customerId}::${(siteLocation || "UNKNOWN").trim().toLowerCase()}`;

  // Process Revenue
  for (const r of siteRevenue) {
    const loc = r.siteLocation || "Unknown Site";
    const hash = getHash(r.customerId, loc);
    map.set(hash, {
      customerId: r.customerId,
      customerName: r.customerName,
      siteLocation: loc,
      totalBilled: Number(r.totalBilled),
      directCosts: 0,
      netMargin: Number(r.totalBilled)
    });
  }

  // Process Expenses
  for (const e of siteExpenses) {
    const loc = e.siteLocation || "Unknown Site";
    const hash = getHash(e.customerId, loc);

    if (map.has(hash)) {
      const existing = map.get(hash);
      existing.directCosts += Number(e.directCosts);
      existing.netMargin = existing.totalBilled - existing.directCosts;
    } else {
      // If there are expenses for a site but no invoices yet, we need the customer name
      // We can fetch it lazily or just grab it now. For simplicity, we'll assign it from prisma
      map.set(hash, {
        customerId: e.customerId,
        customerName: "Loading...", // Will be patched below
        siteLocation: loc,
        totalBilled: 0,
        directCosts: Number(e.directCosts),
        netMargin: -Number(e.directCosts)
      });
    }
  }

  const results = Array.from(map.values());

  // Patch missing customer names for sites that only had expenses but no invoices
  const missingNameIds = results.filter(r => r.customerName === "Loading...").map(r => r.customerId);
  if (missingNameIds.length > 0) {
    const customers = await prisma.customer.findMany({
      where: { id: { in: missingNameIds } },
      select: { id: true, name: true }
    });
    const cMap = new Map(customers.map(c => [c.id, c.name]));
    results.forEach(r => {
      if (r.customerName === "Loading...") {
        r.customerName = cMap.get(r.customerId) || "Unknown Customer";
      }
    });
  }

  // Calculate percentages
  const finalResults = results.map(r => ({
    ...r,
    marginPercentage: r.totalBilled > 0 ? (r.netMargin / r.totalBilled) * 100 : (r.directCosts > 0 ? -100 : 0)
  }));

  // Sort by net margin descending
  return finalResults.sort((a, b) => b.netMargin - a.netMargin);
}

export async function getAvailableCrew(dispatchId: string) {
  const workers = await prisma.employee.findMany({
    where: { isPendingDelete: false, role: { in: ['DRIVER', 'OPERATOR', 'WORKER'] } },
    select: { 
      id: true, name: true, role: true, profilePhotoUrl: true, 
      baseDailyWage: true, capableRoles: true, roleRates: true 
    }
  });

  const assignedLegacy = await prisma.dispatchLabor.findMany({
    where: { dispatchId },
    select: { internalEmployeeId: true }
  });

  const assignedModern = await prisma.dispatchAssignment.findMany({
    where: { dispatchId },
    select: { employeeId: true }
  });

  const assignedIds = Array.from(new Set([
    ...assignedLegacy.filter(a => a.internalEmployeeId).map(a => a.internalEmployeeId as string),
    ...assignedModern.filter(a => a.employeeId).map(a => a.employeeId as string)
  ]));

  return {
    success: true,
    crew: workers.map(w => ({
      id: w.id,
      name: w.name,
      role: w.role,
      profilePhotoUrl: w.profilePhotoUrl,
      capableRoles: w.capableRoles || [],
      roleRates: (w.roleRates || []).map((rr: any) => ({
        crewRole: rr.crewRole,
        wagePerDay: Number(rr.wagePerDay)
      })),
      baseDailyWage: w.baseDailyWage ? Number(w.baseDailyWage) : null
    })),
    assignedIds
  };
}

export async function assignCrewToDispatch(dispatchId: string, employeeIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await requireAuth({ allowedRoles: ["ADMIN", "OWNER", "STAFF", "OPERATOR"] });
    for (const employeeId of employeeIds) {
      const existing = await prisma.dispatchAssignment.findUnique({
        where: { dispatchId_employeeId: { dispatchId, employeeId } }
      });
      if (!existing) {
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          include: { roleRates: true }
        });
        const assignedRole = "HELPER";
        const customRate = employee?.roleRates.find(r => r.crewRole === assignedRole)?.wagePerDay;
        const finalWage = Number(customRate || employee?.baseDailyWage || 0);

        await prisma.dispatchAssignment.create({
          data: {
            dispatchId,
            employeeId,
            assignedRole,
            lockedWageRate: finalWage,
            headcount: 1
          }
        });
      }
    }
    await logAudit({
      actorId: ctx.employeeId,
      actorRole: ctx.role,
      actionType: "ASSIGN_CREW_TO_DISPATCH",
      modelName: "DispatchAssignment",
      newPayload: { dispatchId, employeeIds, assignedRole: "HELPER" },
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeCrewFromDispatch(dispatchId: string, employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await requireAuth({ allowedRoles: ["ADMIN", "OWNER", "STAFF", "OPERATOR"] });
    
    await prisma.dispatchAssignment.deleteMany({
      where: { dispatchId, employeeId }
    });

    await prisma.dispatchLabor.deleteMany({
      where: { dispatchId, internalEmployeeId: employeeId }
    });

    await logAudit({
      actorId: ctx.employeeId,
      actorRole: ctx.role,
      actionType: "REMOVE_CREW_FROM_DISPATCH",
      modelName: "DispatchAssignment",
      oldPayload: { dispatchId, employeeId },
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
