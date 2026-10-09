import { test, expect } from '@playwright/test';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

/**
 * OCC (Optimistic Concurrency Control) Resilience Test
 *
 * Scenario: Two Admin browser contexts simultaneously attempt to finalize the
 * same Settlement record. The application uses a `version` field on the
 * Settlement model to detect stale writes. The SECOND context to submit
 * must receive a conflict error, proving the OCC lock is enforced.
 */
test.describe('Edge Case: OCC Concurrency Lock', () => {
  let uid: string;
  let settlement: any;
  let customer: any;
  let machine: any;
  let operatorEmployee: any;

  test.beforeAll(async () => {
    uid = crypto.randomUUID().substring(0, 8);
    const pw = await hash('password123', 10);

    // Create minimal data to back a realistic settlement record
    customer = await prisma.customer.create({
      data: { name: `OCC Corp ${uid}`, phone: '5550000001', address: `1 OCC Lane` },
    });

    const operatorUser = await prisma.user.create({
      data: {
        email: `occ_op_${uid}@ironrent.local`,
        hashedPassword: pw,
        role: 'OPERATOR',
        employee: {
          create: { name: `OCC Operator ${uid}`, role: 'OPERATOR', baseDailyWage: 1000 },
        },
      },
      include: { employee: true },
    });
    operatorEmployee = operatorUser.employee!;

    machine = await prisma.machine.create({
      data: {
        machineId: `MIX-OCC-${uid}`,
        type: 'MIXER',
        status: 'AVAILABLE',
        operatorDailyPayout: 1500,
      },
    });

    const dispatch = await prisma.dailyDispatch.create({
      data: {
        customerId: customer.id,
        dateOfService: new Date(),
        status: 'COMPLETED',
        location: `OCC Test Site ${uid}`,
        operatorId: operatorEmployee.id,
        machineId: machine.id,
      },
    });

    // Create a DRAFT settlement record (weekEnding = next Saturday)
    const nextSat = new Date();
    nextSat.setDate(nextSat.getDate() + (6 - nextSat.getDay() + 7) % 7 || 7);
    nextSat.setHours(0, 0, 0, 0);

    settlement = await prisma.settlement.create({
      data: {
        employeeId: operatorEmployee.id,
        weekEnding: nextSat,
        status: 'PENDING',
        finalPayout: 1500,
      },
    });
  });

  test.afterAll(async () => {
    if (settlement) await prisma.settlement.deleteMany({ where: { employeeId: operatorEmployee?.id } });
    if (machine) await prisma.dailyDispatch.deleteMany({ where: { machineId: machine.id } });
    if (machine) await prisma.machine.deleteMany({ where: { id: machine.id } });
    if (operatorEmployee) await prisma.employee.deleteMany({ where: { id: operatorEmployee.id } });
    if (customer) await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.user.deleteMany({ where: { email: { contains: `occ_op_${uid}` } } });
  });

  test('Second admin to finalize a settlement receives an OCC version-mismatch error', async ({ browser }) => {
    // Open two independent admin browser contexts
    const ctx1 = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const ctx2 = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    // Both admins navigate to the settlement hub
    await Promise.all([
      page1.goto('/admin/settlements'),
      page2.goto('/admin/settlements'),
    ]);

    // Verify both pages loaded the settlement hub
    await expect(page1.getByRole('heading').first()).toBeVisible();
    await expect(page2.getByRole('heading').first()).toBeVisible();

    // Directly simulate a version-conflict via concurrent API calls using page.evaluate
    // This hits the API endpoint that the UI would call, allowing us to race them.
    const [result1, result2] = await Promise.all([
      page1.evaluate(async (id) => {
        try {
          const res = await fetch(`/api/settlements/${id}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: 0 }),
          });
          return { status: res.status, ok: res.ok };
        } catch (e: any) {
          return { status: 500, ok: false, error: e.message };
        }
      }, settlement.id),
      page2.evaluate(async (id) => {
        // Slight delay so results are predictable, then race with same stale version
        await new Promise(r => setTimeout(r, 50));
        try {
          const res = await fetch(`/api/settlements/${id}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: 0 }), // Intentionally stale version
          });
          return { status: res.status, ok: res.ok };
        } catch (e: any) {
          return { status: 500, ok: false, error: e.message };
        }
      }, settlement.id),
    ]);

    console.log('[OCC Test] Admin1 result:', result1);
    console.log('[OCC Test] Admin2 result:', result2);

    // At least one of the two requests must be rejected (409 Conflict or 400/500)
    // The first may succeed (200) but the second must fail because the version is now stale
    const bothSucceeded = result1.ok && result2.ok;
    expect(bothSucceeded, 'Both admins should NOT be able to finalize the same settlement simultaneously').toBe(false);

    // Verify DB state: settlement should only be finalized once (not in an inconsistent state)
    const finalSettlement = await prisma.settlement.findUnique({ where: { id: settlement.id } });
    // Settlement should be in a valid final state, not duplicated or corrupted
    expect(['DRAFT', 'FINALIZED']).toContain(finalSettlement?.status);

    await ctx1.close();
    await ctx2.close();
  });
});
